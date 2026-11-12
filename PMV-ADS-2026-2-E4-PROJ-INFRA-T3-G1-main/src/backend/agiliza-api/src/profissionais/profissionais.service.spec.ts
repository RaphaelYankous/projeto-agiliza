import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { DataSource, Repository } from 'typeorm';
import { ProfissionaisService } from './profissionais.service.js';
import { Profissional } from './entities/profissional.entity.js';
import type { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { Agendamento, StatusAgendamento } from '../agendamentos/entities/agendamento.entity.js';
import { BloqueioAgenda } from '../agenda/entities/bloqueio-agenda.entity.js';
import { DisponibilidadeProfissional } from '../agenda/entities/disponibilidade-profissional.entity.js';
import { Role, Usuario } from '../usuarios/entities/usuario.entity.js';
import {
  dadosPessoa,
  estabelecimento,
  profissional,
  ESTABELECIMENTO_ID,
  ID,
} from '../../test/helpers/fixtures.js';
import { repositoryMock } from '../../test/helpers/mocks.js';

const GESTOR_ID = ID;
const SERVICO_ID = 'c1d2e3f4-0000-4000-8000-000000000000';
const USUARIO_NOVO_ID = '1a2b3c4d-0000-4000-8000-000000000001';

function servico() {
  return Object.assign(new Servico(), { id: SERVICO_ID, nome: 'Corte', estabelecimentoId: ESTABELECIMENTO_ID });
}

function montar() {
  const registro = profissional();
  const fotos = new Map<string, Buffer | null>();
  const comHorario = new Set<string>();
  const repository = Object.assign(repositoryMock(registro), {
    findOneOrFail: vi.fn(async () => registro),
    manager: {
      find: vi.fn(
        async (
          entidade: unknown,
          opcoes: { where: { id?: { value: string[] }; profissionalId?: { value: string[] } } },
        ) =>
          entidade === DisponibilidadeProfissional
            ? (opcoes.where.profissionalId?.value ?? [])
                .filter((id) => comHorario.has(id))
                .map((profissionalId) => ({ id: `h-${profissionalId}`, profissionalId }))
            : (opcoes.where.id?.value ?? []).map((id) => ({ id, fotoPerfil: fotos.get(id) ?? null })),
      ),
      update: vi.fn(async (_entidade: unknown, criterio: { id: string }, dados: { fotoPerfil: Buffer }) => {
        fotos.set(criterio.id, dados.fotoPerfil);
        return { affected: 1 };
      }),
    },
  });
  const estabelecimentos = repositoryMock(estabelecimento());
  const servicos = { findBy: vi.fn(async () => [servico()]) };
  const usuarios = { existsBy: vi.fn(async (_criterio: Record<string, unknown>) => false) };
  const agendamentos = { count: vi.fn(async (_opcoes: unknown) => 0) };
  const manager = {
    delete: vi.fn(async () => ({ affected: 1 })),
    softDelete: vi.fn(async () => ({ affected: 1 })),
    update: vi.fn(async (..._args: unknown[]) => ({ affected: 1 })),
    create: vi.fn((_entidade: unknown, dados: object) => ({ ...dados })),
    save: vi.fn(async (entidade: unknown, dados: object) => ({
      ...dados,
      id: entidade === Usuario ? USUARIO_NOVO_ID : ID,
    })),
  };
  const dataSource = {
    transaction: vi.fn(async (trabalho: (m: typeof manager) => Promise<unknown>) => trabalho(manager)),
    getRepository: vi.fn((entidade: unknown) =>
      entidade === Servico ? servicos : entidade === Agendamento ? agendamentos : usuarios,
    ),
  };
  const service = new ProfissionaisService(
    dataSource as unknown as DataSource,
    repository as unknown as Repository<Profissional>,
    estabelecimentos as unknown as Repository<Estabelecimento>,
  );
  return {
    service,
    repository,
    estabelecimentos,
    servicos,
    usuarios,
    agendamentos,
    manager,
    dataSource,
    registro,
    fotos,
    comHorario,
  };
}

const dto = { ...dadosPessoa, servicoIds: [SERVICO_ID] };

describe('ProfissionaisService', () => {
  describe('create', () => {
    it('cria usuário profissional, vínculo e serviços na mesma transação', async () => {
      const { service, repository, manager, dataSource, registro } = montar();
      await expect(service.create(ESTABELECIMENTO_ID, GESTOR_ID, dto)).resolves.toBe(registro);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      const [, usuarioSalvo] = manager.save.mock.calls[0] as [unknown, Record<string, unknown>];
      expect(manager.save.mock.calls[0][0]).toBe(Usuario);
      expect(usuarioSalvo).toMatchObject({
        nome: dadosPessoa.nome,
        email: dadosPessoa.email,
        cpf: dadosPessoa.cpf,
        perfil: Role.PROFISSIONAL,
      });
      expect(usuarioSalvo).not.toHaveProperty('servicoIds');
      await expect(bcrypt.compare(dadosPessoa.senha, usuarioSalvo.senha as string)).resolves.toBe(true);

      expect(manager.save.mock.calls[1]).toEqual([
        Profissional,
        { usuarioId: USUARIO_NOVO_ID, estabelecimentoId: ESTABELECIMENTO_ID, servicos: [servico()] },
      ]);
      expect(repository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: ID },
        relations: { servicos: true },
      });
    });

    it('rejeita estabelecimento inexistente com 404', async () => {
      const { service, estabelecimentos, dataSource } = montar();
      estabelecimentos.findOneBy.mockResolvedValueOnce(null);
      await expect(service.create(ESTABELECIMENTO_ID, GESTOR_ID, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejeita estabelecimento de outro gestor com 403', async () => {
      const { service, servicos, dataSource } = montar();
      await expect(service.create(ESTABELECIMENTO_ID, 'outro-gestor', dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(servicos.findBy).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejeita serviço que não pertence ao estabelecimento com 400', async () => {
      const { service, servicos, dataSource } = montar();
      servicos.findBy.mockResolvedValueOnce([]);
      await expect(service.create(ESTABELECIMENTO_ID, GESTOR_ID, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it.each([
      ['email', 'Email já cadastrado.'],
      ['cpf', 'CPF já cadastrado.'],
    ])('rejeita %s já cadastrado com 409 e mensagem própria', async (campo, mensagem) => {
      const { service, usuarios, dataSource } = montar();
      usuarios.existsBy.mockImplementation(async (criterio: Record<string, unknown>) => campo in criterio);
      await expect(service.create(ESTABELECIMENTO_ID, GESTOR_ID, dto)).rejects.toEqual(
        new ConflictException(mensagem),
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('copia apenas os dados pessoais do corpo para o usuário', async () => {
      const { service, manager } = montar();
      const corpo = { ...dto, id: 'usuario-existente', estabelecimentoId: 'outro' };
      await service.create(ESTABELECIMENTO_ID, GESTOR_ID, corpo);
      const [, usuarioSalvo] = manager.save.mock.calls[0] as [unknown, Record<string, unknown>];
      expect(usuarioSalvo).not.toHaveProperty('id');
      expect(usuarioSalvo).not.toHaveProperty('estabelecimentoId');
      expect(manager.save.mock.calls[1][1]).toMatchObject({ estabelecimentoId: ESTABELECIMENTO_ID });
    });

    it('converte duplicidade detectada pelo banco em 409', async () => {
      const { service, manager } = montar();
      manager.save.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
      await expect(service.create(ESTABELECIMENTO_ID, GESTOR_ID, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('propaga falhas da transação sem gravar fora dela', async () => {
      const { service, repository, manager } = montar();
      const erro = new Error('falha no vínculo');
      manager.save.mockImplementation(async (entidade: unknown, dados: object) => {
        if (entidade === Profissional) throw erro;
        return { ...dados, id: USUARIO_NOVO_ID };
      });
      await expect(service.create(ESTABELECIMENTO_ID, GESTOR_ID, dto)).rejects.toBe(erro);
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.findOneOrFail).not.toHaveBeenCalled();
    });
  });

  describe('findAllByEstabelecimento', () => {
    const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);

    it('consulta o estabelecimento da URL em ordem alfabética, com os serviços', async () => {
      const { service, repository } = montar();
      await service.findAllByEstabelecimento(ESTABELECIMENTO_ID, GESTOR_ID);
      expect(repository.find).toHaveBeenCalledWith({
        where: { estabelecimentoId: ESTABELECIMENTO_ID },
        relations: { servicos: true },
        order: { usuario: { nome: 'ASC', sobrenome: 'ASC' } },
      });
    });

    it('devolve o resumo sem CPF, telefone nem senha', async () => {
      const { service, repository, registro, fotos } = montar();
      Object.assign(registro, { servicos: [servico()] });
      fotos.set(registro.usuarioId, PNG);
      repository.find.mockResolvedValueOnce([registro]);
      const [resumo] = await service.findAllByEstabelecimento(ESTABELECIMENTO_ID, GESTOR_ID);
      expect(resumo).toEqual({
        id: ID,
        nome: dadosPessoa.nome,
        sobrenome: dadosPessoa.sobrenome,
        email: dadosPessoa.email,
        foto: `data:image/png;base64,${PNG.toString('base64')}`,
        servicos: [{ id: SERVICO_ID, nome: 'Corte' }],
        temHorarios: false,
      });
      expect(JSON.stringify(resumo)).not.toMatch(/cpf|telefone|senha/);
    });

    it('lê as fotos de todos os profissionais da lista numa só consulta', async () => {
      const { service, repository, registro } = montar();
      const outro = Object.assign(profissional(), {
        id: 'outro',
        usuarioId: 'usuario-2',
        usuario: Object.assign(profissional().usuario, { id: 'usuario-2' }),
      });
      repository.find.mockResolvedValueOnce([registro, outro]);
      await service.findAllByEstabelecimento(ESTABELECIMENTO_ID, GESTOR_ID);
      expect(repository.manager.find.mock.calls.filter(([entidade]) => entidade === Usuario)).toHaveLength(1);
      expect(repository.manager.find).toHaveBeenCalledWith(Usuario, {
        where: { id: expect.objectContaining({ value: [ID, 'usuario-2'] }) },
        select: { id: true, fotoPerfil: true },
      });
    });

    it('devolve foto nula e serviços vazios quando o profissional não tem', async () => {
      const { service } = montar();
      const [resumo] = await service.findAllByEstabelecimento(ESTABELECIMENTO_ID, GESTOR_ID);
      expect(resumo).toMatchObject({ foto: null, servicos: [] });
    });

    it('marca temHorarios só para quem tem horário ativo, numa consulta só', async () => {
      const { service, repository, registro, comHorario } = montar();
      const outro = Object.assign(profissional(), {
        id: 'outro',
        usuarioId: 'usuario-2',
        usuario: Object.assign(profissional().usuario, { id: 'usuario-2' }),
      });
      comHorario.add('outro');
      repository.find.mockResolvedValueOnce([registro, outro]);
      const resumos = await service.findAllByEstabelecimento(ESTABELECIMENTO_ID, GESTOR_ID);
      expect(resumos.map(({ id, temHorarios }) => [id, temHorarios])).toEqual([
        [ID, false],
        ['outro', true],
      ]);
      const consultas = repository.manager.find.mock.calls.filter(
        ([entidade]) => entidade === DisponibilidadeProfissional,
      );
      expect(consultas).toHaveLength(1);
      expect(consultas[0][1]).toMatchObject({
        where: { profissionalId: expect.objectContaining({ value: [ID, 'outro'] }), ativo: true },
      });
    });

    it('retorna [] quando o estabelecimento não tem profissionais', async () => {
      const { service, repository } = montar();
      repository.find.mockResolvedValueOnce([]);
      await expect(service.findAllByEstabelecimento(ESTABELECIMENTO_ID, GESTOR_ID)).resolves.toEqual([]);
    });

    it('rejeita estabelecimento de outro gestor com 403 sem consultar profissionais', async () => {
      const { service, repository } = montar();
      await expect(
        service.findAllByEstabelecimento(ESTABELECIMENTO_ID, 'outro-gestor'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('rejeita estabelecimento inexistente com 404', async () => {
      const { service, estabelecimentos, repository } = montar();
      estabelecimentos.findOneBy.mockResolvedValueOnce(null);
      await expect(
        service.findAllByEstabelecimento(ESTABELECIMENTO_ID, GESTOR_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.find).not.toHaveBeenCalled();
    });
  });

  describe('findAllPublicos', () => {
    const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);

    it('lista os profissionais do estabelecimento sem checar o gestor', async () => {
      const { service, repository, estabelecimentos } = montar();
      await service.findAllPublicos(ESTABELECIMENTO_ID);
      expect(repository.find).toHaveBeenCalledWith({
        where: { estabelecimentoId: ESTABELECIMENTO_ID },
        relations: { servicos: true },
        order: { usuario: { nome: 'ASC', sobrenome: 'ASC' } },
      });
      expect(estabelecimentos.findOneBy).not.toHaveBeenCalled();
    });

    it('devolve nome, sobrenome, foto e serviços, sem e-mail nem outros contatos', async () => {
      const { service, repository, registro, fotos, comHorario } = montar();
      Object.assign(registro, { servicos: [servico()] });
      fotos.set(registro.usuarioId, PNG);
      comHorario.add(ID);
      repository.find.mockResolvedValueOnce([registro]);
      const [resumo] = await service.findAllPublicos(ESTABELECIMENTO_ID);
      expect(resumo).toEqual({
        id: ID,
        nome: dadosPessoa.nome,
        sobrenome: dadosPessoa.sobrenome,
        foto: `data:image/png;base64,${PNG.toString('base64')}`,
        servicos: [{ id: SERVICO_ID, nome: 'Corte' }],
        temHorarios: true,
      });
      expect(JSON.stringify(resumo)).not.toMatch(/email|cpf|telefone|senha/);
    });
  });

  describe('findOne', () => {
    it('busca no estabelecimento da URL e devolve o detalhe sem senha', async () => {
      const { service, repository, registro } = montar();
      Object.assign(registro, { servicos: [servico()] });
      const detalhe = await service.findOne(ESTABELECIMENTO_ID, GESTOR_ID, ID);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: ID, estabelecimentoId: ESTABELECIMENTO_ID },
        relations: { servicos: true },
      });
      expect(detalhe).toEqual({
        id: ID,
        nome: dadosPessoa.nome,
        sobrenome: dadosPessoa.sobrenome,
        email: dadosPessoa.email,
        cpf: dadosPessoa.cpf,
        telefone: dadosPessoa.telefone,
        foto: null,
        servicos: [{ id: SERVICO_ID, nome: 'Corte' }],
      });
    });

    it('rejeita estabelecimento de outro gestor com 403', async () => {
      const { service, repository } = montar();
      await expect(service.findOne(ESTABELECIMENTO_ID, 'outro-gestor', ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('rejeita profissional de outro estabelecimento com 404', async () => {
      const { service, repository } = montar();
      repository.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne(ESTABELECIMENTO_ID, GESTOR_ID, ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('altera só os campos enviados do usuário, sem tocar na senha nem nos serviços', async () => {
      const { service, manager } = montar();
      await service.update(ESTABELECIMENTO_ID, GESTOR_ID, ID, { nome: 'Bia', telefone: '31988887777' });
      expect(manager.update).toHaveBeenCalledWith(Usuario, { id: ID }, { nome: 'Bia', telefone: '31988887777' });
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('troca os serviços na mesma transação', async () => {
      const { service, manager, servicos, registro } = montar();
      await service.update(ESTABELECIMENTO_ID, GESTOR_ID, ID, { servicoIds: [SERVICO_ID] });
      expect(servicos.findBy).toHaveBeenCalledWith({ id: expect.anything(), estabelecimentoId: ESTABELECIMENTO_ID });
      expect(manager.save).toHaveBeenCalledWith(Profissional, expect.objectContaining({ id: ID, servicos: [servico()] }));
      expect(registro.servicos).toEqual([servico()]);
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('devolve o detalhe atualizado', async () => {
      const { service } = montar();
      await expect(service.update(ESTABELECIMENTO_ID, GESTOR_ID, ID, { nome: 'Bia' })).resolves.toMatchObject({
        id: ID,
        cpf: dadosPessoa.cpf,
      });
    });

    it('rejeita e-mail de outra pessoa com 409 sem gravar', async () => {
      const { service, usuarios, dataSource } = montar();
      usuarios.existsBy.mockResolvedValueOnce(true);
      await expect(
        service.update(ESTABELECIMENTO_ID, GESTOR_ID, ID, { email: 'outra@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(usuarios.existsBy).toHaveBeenCalledWith({ email: 'outra@example.com', id: expect.anything() });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('aceita o próprio e-mail do profissional', async () => {
      const { service, manager } = montar();
      await service.update(ESTABELECIMENTO_ID, GESTOR_ID, ID, { email: dadosPessoa.email });
      expect(manager.update).toHaveBeenCalledWith(Usuario, { id: ID }, { email: dadosPessoa.email });
    });

    it('converte duplicidade detectada pelo banco em 409', async () => {
      const { service, dataSource } = montar();
      dataSource.transaction.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
      await expect(
        service.update(ESTABELECIMENTO_ID, GESTOR_ID, ID, { email: 'nova@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejeita serviço de outro estabelecimento com 400 sem gravar', async () => {
      const { service, servicos, dataSource } = montar();
      servicos.findBy.mockResolvedValueOnce([]);
      await expect(
        service.update(ESTABELECIMENTO_ID, GESTOR_ID, ID, { servicoIds: [SERVICO_ID] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejeita estabelecimento de outro gestor com 403 sem gravar', async () => {
      const { service, dataSource } = montar();
      await expect(
        service.update(ESTABELECIMENTO_ID, 'outro-gestor', ID, { nome: 'Bia' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejeita profissional de outro estabelecimento com 404 sem gravar', async () => {
      const { service, repository, dataSource } = montar();
      repository.findOne.mockResolvedValueOnce(null);
      await expect(
        service.update(ESTABELECIMENTO_ID, GESTOR_ID, ID, { nome: 'Bia' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('atualizarFoto', () => {
    const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);
    const arquivo = (dados: Partial<{ buffer: Buffer; mimetype: string; size: number }> = {}) => ({
      buffer: PNG,
      mimetype: 'image/png',
      size: PNG.length,
      ...dados,
    });

    it('grava a foto do profissional do estabelecimento e devolve a data URL', async () => {
      const { service, repository } = montar();
      await expect(service.atualizarFoto(ESTABELECIMENTO_ID, GESTOR_ID, ID, arquivo())).resolves.toEqual({
        foto: `data:image/png;base64,${PNG.toString('base64')}`,
      });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: ID, estabelecimentoId: ESTABELECIMENTO_ID },
        relations: { servicos: true },
      });
      expect(repository.manager.update).toHaveBeenCalledWith(Usuario, { id: ID }, { fotoPerfil: PNG });
    });

    it.each([
      ['conteúdo que não é imagem', { buffer: Buffer.from('texto qualquer'), mimetype: 'image/png' }],
      ['tipo declarado diferente do conteúdo', { mimetype: 'image/jpeg' }],
      ['arquivo acima de 2 MB', { size: 2 * 1024 * 1024 + 1 }],
    ])('rejeita %s com 400 sem gravar', async (_caso, dados) => {
      const { service, repository } = montar();
      await expect(
        service.atualizarFoto(ESTABELECIMENTO_ID, GESTOR_ID, ID, arquivo(dados)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.manager.update).not.toHaveBeenCalled();
    });

    it('rejeita estabelecimento de outro gestor com 403 sem gravar', async () => {
      const { service, repository } = montar();
      await expect(
        service.atualizarFoto(ESTABELECIMENTO_ID, 'outro-gestor', ID, arquivo()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.manager.update).not.toHaveBeenCalled();
    });

    it('rejeita profissional de outro estabelecimento com 404 sem gravar', async () => {
      const { service, repository } = montar();
      repository.findOne.mockResolvedValueOnce(null);
      await expect(
        service.atualizarFoto(ESTABELECIMENTO_ID, GESTOR_ID, ID, arquivo()),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.manager.update).not.toHaveBeenCalled();
    });

    it('o detalhe traz a foto gravada', async () => {
      const { service, fotos } = montar();
      fotos.set(ID, PNG);
      await expect(service.findOne(ESTABELECIMENTO_ID, GESTOR_ID, ID)).resolves.toMatchObject({
        foto: `data:image/png;base64,${PNG.toString('base64')}`,
      });
    });
  });

  describe('remove', () => {
    it('bloqueia com 409 quando há agendamento futuro pendente ou confirmado, sem gravar', async () => {
      const { service, agendamentos, dataSource } = montar();
      agendamentos.count.mockResolvedValueOnce(1);
      await expect(service.remove(ESTABELECIMENTO_ID, GESTOR_ID, ID)).rejects.toBeInstanceOf(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('conta só agendamentos pendentes ou confirmados com início no futuro', async () => {
      const { service, agendamentos } = montar();
      const antes = Date.now();
      await service.remove(ESTABELECIMENTO_ID, GESTOR_ID, ID);
      const [{ where }] = agendamentos.count.mock.calls[0] as [{ where: Record<string, { value: unknown }> }];
      expect(where.profissionalId).toBe(ID);
      expect(where.status.value).toEqual([StatusAgendamento.PENDENTE, StatusAgendamento.CONFIRMADO]);
      expect((where.dataHoraInicio.value as Date).getTime()).toBeGreaterThanOrEqual(antes);
    });

    it('apaga agenda, libera e-mail, CPF e senha mantendo o nome e faz exclusão lógica', async () => {
      const { service, manager } = montar();
      await service.remove(ESTABELECIMENTO_ID, GESTOR_ID, ID);
      expect(manager.delete).toHaveBeenCalledWith(DisponibilidadeProfissional, { profissionalId: ID });
      expect(manager.delete).toHaveBeenCalledWith(BloqueioAgenda, { profissionalId: ID });
      const [entidade, criterio, dados] = manager.update.mock.calls[0] as [unknown, unknown, Record<string, string>];
      expect(entidade).toBe(Usuario);
      expect(criterio).toEqual({ id: ID });
      expect(dados).toEqual({
        email: `excluido+${ID}@agiliza.invalid`,
        cpf: `excluido:${ID}`,
        senha: expect.any(String),
      });
      expect(dados).not.toHaveProperty('nome');
      expect(await bcrypt.compare(dadosPessoa.senha, dados.senha)).toBe(false);
      expect(manager.softDelete).toHaveBeenCalledWith(Profissional, { id: ID });
    });

    it('rejeita estabelecimento de outro gestor com 403 sem gravar', async () => {
      const { service, dataSource } = montar();
      await expect(service.remove(ESTABELECIMENTO_ID, 'outro-gestor', ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejeita profissional de outro estabelecimento com 404 sem gravar', async () => {
      const { service, repository, dataSource } = montar();
      repository.findOne.mockResolvedValueOnce(null);
      await expect(service.remove(ESTABELECIMENTO_ID, GESTOR_ID, ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('propaga falhas da transação', async () => {
      const { service, dataSource } = montar();
      const erro = new Error('falha no banco');
      dataSource.transaction.mockRejectedValueOnce(erro);
      await expect(service.remove(ESTABELECIMENTO_ID, GESTOR_ID, ID)).rejects.toBe(erro);
    });
  });
});
