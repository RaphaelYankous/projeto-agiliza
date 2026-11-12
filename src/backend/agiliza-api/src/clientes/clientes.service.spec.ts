import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ClientesService } from './clientes.service.js';
import { Cliente } from './entities/cliente.entity.js';
import { Role, Usuario } from '../usuarios/entities/usuario.entity.js';
import type { CreateClienteDto } from './dto/create-cliente.dto.js';

vi.mock('bcrypt', () => ({
  genSalt: vi.fn(async () => 'salt'),
  hash: vi.fn(async (valor: string) => `hash(${valor})`),
}));

const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const foto = (dados: Partial<{ buffer: Buffer; mimetype: string; size: number }> = {}) => ({
  buffer: PNG,
  mimetype: 'image/png',
  size: PNG.length,
  ...dados,
});

const dtoBase: CreateClienteDto = {
  nome: 'João',
  sobrenome: 'Silva',
  email: 'joao.silva@exemplo.com',
  senha: 'SenhaForte123@',
  cpf: '123.456.789-00',
  telefone: '(31) 98765-4321',
};

const usuarioDuplicado = { id: 'usuario-2', email: dtoBase.email, cpf: dtoBase.cpf };

function montarServico(
  opcoes: {
    emailDuplicado?: boolean;
    cpfDuplicado?: boolean;
    clienteExistente?: Partial<Cliente> | null;
    usuarioVinculado?: Partial<Usuario> | null;
    erroNoSave?: boolean;
  } = {},
) {
  const clienteExistente = {
    id: 'cliente-1',
    usuarioId: 'usuario-1',
    ...opcoes.clienteExistente,
  } as Cliente;

  const usuarioRepository = {
    findOne: vi.fn(async ({ where }: { where: { email?: string; cpf?: string } }) => {
      if (where.email && opcoes.emailDuplicado) return usuarioDuplicado;
      if (where.cpf && opcoes.cpfDuplicado) return usuarioDuplicado;
      return null;
    }),
    delete: vi.fn(),
  };

  const clienteRepository = {
    find: vi.fn(async () => [clienteExistente]),
    findOne: vi.fn(async () => (opcoes.clienteExistente === null ? null : clienteExistente)),
  };

  const manager = {
    create: vi.fn((_entidade: unknown, dados: object) => ({ ...dados })),
    save: vi.fn(async (dados: object) => {
      if (opcoes.erroNoSave) throw new Error('falha no banco');
      return { id: 'novo-id', ...dados };
    }),
    update: vi.fn(async () => ({ affected: 1 })),
    findOne: vi.fn(async () =>
      opcoes.usuarioVinculado === null ? null : ({ id: 'usuario-1', ...opcoes.usuarioVinculado } as Usuario),
    ),
  };

  const queryRunner = {
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
    manager,
  };
  const dataSource = { createQueryRunner: () => queryRunner } as unknown as DataSource;

  const service = new ClientesService(
    clienteRepository as unknown as Repository<Cliente>,
    usuarioRepository as unknown as Repository<Usuario>,
    dataSource,
  );

  return { service, clienteRepository, usuarioRepository, manager, queryRunner };
}

describe('ClientesService.create', () => {
  it('cria o usuário (perfil cliente) e o cliente na mesma transação', async () => {
    const { service, manager, queryRunner } = montarServico();

    const resultado = await service.create(dtoBase);

    expect(manager.create).toHaveBeenCalledWith(Usuario, {
      nome: 'João',
      sobrenome: 'Silva',
      email: 'joao.silva@exemplo.com',
      senha: 'hash(SenhaForte123@)',
      cpf: '123.456.789-00',
      telefone: '(31) 98765-4321',
      perfil: Role.CLIENTE,
      fotoPerfil: null,
    });
    expect(manager.create).toHaveBeenCalledWith(Cliente, { usuarioId: 'novo-id' });
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
    expect(resultado.usuario).toBeDefined();
  });

  it('armazena a senha apenas como hash do bcrypt', async () => {
    const { service, usuarioRepository } = montarServico();

    await service.create(dtoBase);

    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    expect(bcrypt.hash).toHaveBeenCalledWith('SenhaForte123@', 'salt');
    expect(usuarioRepository.delete).not.toHaveBeenCalled();
  });

  it('grava a foto enviada no usuário', async () => {
    const { service, manager } = montarServico();

    await service.create(dtoBase, foto());

    expect(manager.create).toHaveBeenCalledWith(Usuario, expect.objectContaining({ fotoPerfil: PNG }));
    expect(manager.create).toHaveBeenCalledWith(Cliente, { usuarioId: 'novo-id' });
  });

  it.each([
    ['conteúdo que não é imagem', foto({ buffer: Buffer.from('texto') })],
    ['tipo declarado diferente do conteúdo', foto({ mimetype: 'image/jpeg' })],
    ['foto acima de 2 MB', foto({ size: 2 * 1024 * 1024 + 1 })],
  ])('recusa %s antes de consultar duplicidade ou abrir a transação', async (_caso, arquivo) => {
    const { service, usuarioRepository, queryRunner } = montarServico();

    await expect(service.create(dtoBase, arquivo)).rejects.toBeInstanceOf(BadRequestException);
    expect(usuarioRepository.findOne).not.toHaveBeenCalled();
    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
  });

  it('retorna 409 quando o e-mail já está cadastrado', async () => {
    const { service, queryRunner } = montarServico({ emailDuplicado: true });

    await expect(service.create(dtoBase)).rejects.toBeInstanceOf(ConflictException);
    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
  });

  it('retorna 409 quando o CPF já está cadastrado', async () => {
    const { service, queryRunner } = montarServico({ cpfDuplicado: true });

    await expect(service.create(dtoBase)).rejects.toBeInstanceOf(ConflictException);
    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
  });

  it('retorna 400 e desfaz a transação quando o banco falha', async () => {
    const { service, queryRunner } = montarServico({ erroNoSave: true });

    await expect(service.create(dtoBase)).rejects.toBeInstanceOf(BadRequestException);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });
});

describe('ClientesService.findAll / findOne', () => {
  it('lista os clientes carregando o usuário vinculado', async () => {
    const { service, clienteRepository } = montarServico();

    const resultado = await service.findAll();

    expect(clienteRepository.find).toHaveBeenCalledWith({ relations: { usuario: true } });
    expect(resultado).toHaveLength(1);
  });

  it('retorna o cliente pelo id com o usuário carregado', async () => {
    const { service, clienteRepository } = montarServico();

    const resultado = await service.findOne('cliente-1');

    expect(clienteRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'cliente-1' },
      relations: { usuario: true },
    });
    expect(resultado.id).toBe('cliente-1');
  });

  it('retorna 404 quando o cliente não existe', async () => {
    const { service } = montarServico({ clienteExistente: null });

    await expect(service.findOne('inexistente')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ClientesService.update', () => {
  it('atualiza os dados do usuário vinculado, a senha (hash) e a foto', async () => {
    const { service, manager, queryRunner } = montarServico();

    await service.update('cliente-1', { nome: 'Maria', senha: 'NovaSenha123' }, foto());

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'usuario-1',
        nome: 'Maria',
        senha: 'hash(NovaSenha123)',
      }),
    );
    expect(manager.update).toHaveBeenCalledWith(
      Usuario,
      { id: 'usuario-1' },
      { fotoPerfil: PNG },
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('não mexe na foto quando nenhuma é enviada', async () => {
    const { service, manager } = montarServico();

    await service.update('cliente-1', { nome: 'Maria' });

    expect(manager.update).not.toHaveBeenCalled();
  });

  it('recusa foto inválida na edição antes de abrir a transação', async () => {
    const { service, queryRunner, manager } = montarServico();

    await expect(
      service.update('cliente-1', { nome: 'Maria' }, foto({ buffer: Buffer.from('texto') })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('retorna 409 quando o e-mail pertence a outro usuário', async () => {
    const { service, queryRunner } = montarServico({ emailDuplicado: true });

    await expect(service.update('cliente-1', { email: 'novo@exemplo.com' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('retorna 409 quando o CPF pertence a outro usuário', async () => {
    const { service, queryRunner } = montarServico({ cpfDuplicado: true });

    await expect(service.update('cliente-1', { cpf: '999.999.999-99' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('retorna 404 quando o usuário vinculado não existe mais', async () => {
    const { service } = montarServico({ usuarioVinculado: null });

    await expect(service.update('cliente-1', { nome: 'Maria' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('retorna 404 sem abrir transação quando o cliente não existe', async () => {
    const { service, queryRunner } = montarServico({ clienteExistente: null });

    await expect(service.update('inexistente', { nome: 'Maria' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
  });
});

describe('ClientesService.remove', () => {
  it('remove o usuário vinculado ao cliente', async () => {
    const { service, usuarioRepository } = montarServico();

    await expect(service.remove('cliente-1')).resolves.toBeUndefined();
    expect(usuarioRepository.delete).toHaveBeenCalledWith('usuario-1');
  });

  it('retorna 404 quando o cliente não existe', async () => {
    const { service, usuarioRepository } = montarServico({ clienteExistente: null });

    await expect(service.remove('inexistente')).rejects.toBeInstanceOf(NotFoundException);
    expect(usuarioRepository.delete).not.toHaveBeenCalled();
  });
});
