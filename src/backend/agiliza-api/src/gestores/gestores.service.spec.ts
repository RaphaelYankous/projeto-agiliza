import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { DataSource, Repository } from 'typeorm';
import { GestoresService } from './gestores.service.js';
import { Gestor } from './entities/gestor.entity.js';
import { Usuario, Role } from '../usuarios/entities/usuario.entity.js';
import { gestor, dadosPessoa, ID } from '../../test/helpers/fixtures.js';
import { repositoryMock } from '../../test/helpers/mocks.js';

vi.mock('bcrypt', () => ({ default: { hash: vi.fn(async () => 'hash-seguro') } }));

function montar() {
  const registro = gestor();
  const gestorRepository = repositoryMock(registro);
  const usuarioRepository = repositoryMock(registro.usuario);
  const manager = {
    create: vi.fn((_entidade: unknown, dados: object) => ({ ...dados })),
    save: vi.fn(async (_entidade: unknown, dados: object) => ({ id: ID, ...dados })),
    findOneByOrFail: vi.fn(async () => registro.usuario),
    findOneOrFail: vi.fn(async () => registro),
  };
  const transaction = vi.fn(async (callback: (value: typeof manager) => Promise<unknown>) =>
    callback(manager),
  );
  const service = new GestoresService(
    gestorRepository as unknown as Repository<Gestor>,
    usuarioRepository as unknown as Repository<Usuario>,
    { transaction } as unknown as DataSource,
  );
  return { service, gestorRepository, usuarioRepository, manager, transaction, registro };
}

describe('GestoresService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria usuário e gestor na mesma transação com perfil gestor e hash', async () => {
    const { service, manager, transaction } = montar();
    await service.create(dadosPessoa);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(bcrypt.hash).toHaveBeenCalledWith(dadosPessoa.senha, 10);
    expect(manager.create).toHaveBeenCalledWith(Usuario, {
      ...dadosPessoa,
      perfil: Role.GESTOR,
      senha: 'hash-seguro',
      fotoPerfil: null,
    });
    expect(manager.create).toHaveBeenCalledWith(Gestor, expect.objectContaining({ usuarioId: ID }));
    expect(manager.save).toHaveBeenCalledTimes(2);
  });

  it('grava a foto enviada no usuário do gestor', async () => {
    const { service, manager } = montar();
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    await service.create(dadosPessoa, { buffer: png, mimetype: 'image/png', size: png.length });
    expect(manager.create).toHaveBeenCalledWith(Usuario, expect.objectContaining({ fotoPerfil: png }));
  });

  it('recusa foto inválida sem abrir a transação', async () => {
    const { service, transaction } = montar();
    await expect(
      service.create(dadosPessoa, { buffer: Buffer.from('texto'), mimetype: 'image/png', size: 5 }),
    ).rejects.toMatchObject({ status: 400 });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('lista com usuário relacionado e aceita lista vazia', async () => {
    const { service, gestorRepository, registro } = montar();
    await expect(service.findAll()).resolves.toEqual([registro]);
    expect(gestorRepository.find).toHaveBeenCalledWith({ relations: { usuario: true } });
    gestorRepository.find.mockResolvedValueOnce([]);
    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('consulta o gestor pelo usuarioId', async () => {
    const { service, gestorRepository, registro } = montar();
    await expect(service.findOne(ID)).resolves.toBe(registro);
    expect(gestorRepository.findOne).toHaveBeenCalledWith({
      where: { usuarioId: ID },
      relations: { usuario: true },
    });
  });

  it.each(['findOne', 'update', 'remove'] as const)(
    '%s rejeita gestor ausente',
    async (metodo) => {
      const { service, gestorRepository, transaction, usuarioRepository } = montar();
      gestorRepository.findOne.mockResolvedValueOnce(null);
      await expect(service[metodo](ID, {})).rejects.toBeInstanceOf(NotFoundException);
      expect(transaction).not.toHaveBeenCalled();
      expect(usuarioRepository.delete).not.toHaveBeenCalled();
    },
  );

  it('atualiza o usuário vinculado preservando a senha omitida', async () => {
    const { service, manager, registro } = montar();
    await service.update(ID, { nome: 'Maria' });
    expect(manager.findOneByOrFail).toHaveBeenCalledWith(Usuario, { id: ID, perfil: Role.GESTOR });
    expect(manager.save).toHaveBeenCalledWith(
      Usuario,
      expect.objectContaining({
        nome: 'Maria',
        senha: 'hash-armazenado',
        email: dadosPessoa.email,
      }),
    );
    expect(registro.usuario.nome).toBe('Maria');
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('gera novo hash ao atualizar a senha', async () => {
    const { service, manager } = montar();
    await service.update(ID, { senha: 'NovaSenha123' });
    expect(bcrypt.hash).toHaveBeenCalledWith('NovaSenha123', 10);
    expect(manager.save).toHaveBeenCalledWith(
      Usuario,
      expect.objectContaining({ senha: 'hash-seguro' }),
    );
  });

  it.each(['create', 'update'] as const)('%s traduz duplicidade para 409', async (metodo) => {
    const { service, transaction } = montar();
    transaction.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    const resultado =
      metodo === 'create'
        ? service.create(dadosPessoa)
        : service.update(ID, { email: dadosPessoa.email });
    await expect(resultado).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['create', 'update'] as const)(
    '%s propaga falha inesperada da transação',
    async (metodo) => {
      const { service, transaction } = montar();
      const erro = new Error('Falha na transação');
      transaction.mockRejectedValueOnce(erro);
      const resultado =
        metodo === 'create' ? service.create(dadosPessoa) : service.update(ID, { nome: 'Maria' });
      await expect(resultado).rejects.toBe(erro);
    },
  );

  it('remove o usuário vinculado, permitindo cascata no banco', async () => {
    const { service, usuarioRepository } = montar();
    await expect(service.remove(ID)).resolves.toBeUndefined();
    expect(usuarioRepository.delete).toHaveBeenCalledWith(ID);
  });
});
