import { DisponibilidadeProfissional } from '../src/agenda/entities/disponibilidade-profissional.entity.js';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Avaliacao } from '../src/avaliacoes/schemas/avaliacao.schema.js';
import { EstabelecimentosController } from '../src/estabelecimentos/estabelecimentos.controller.js';
import { EstabelecimentosService } from '../src/estabelecimentos/estabelecimentos.service.js';
import { Estabelecimento } from '../src/estabelecimentos/entities/estabelecimento.entity.js';
import { ProfissionaisController } from '../src/profissionais/profissionais.controller.js';
import { ProfissionaisService } from '../src/profissionais/profissionais.service.js';
import { Profissional } from '../src/profissionais/entities/profissional.entity.js';
import { Servico } from '../src/servicos/entities/servico.entity.js';
import { Agendamento } from '../src/agendamentos/entities/agendamento.entity.js';
import { DataSource } from 'typeorm';
import { Role, Usuario } from '../src/usuarios/entities/usuario.entity.js';
import {
  dadosPessoa,
  dadosEstabelecimento,
  estabelecimento,
  profissional,
  ID,
  ESTABELECIMENTO_ID,
} from './helpers/fixtures.js';
import { repositoryMock } from './helpers/mocks.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe('Estabelecimentos — HTTP', () => {
  let contexto: AppTeste;
  const repository = repositoryMock(estabelecimento());
  const rota = '/api/estabelecimentos';
  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [EstabelecimentosController],
      providers: [
        EstabelecimentosService,
        { provide: getRepositoryToken(Estabelecimento), useValue: repository },
        { provide: getRepositoryToken(Servico), useValue: { find: vi.fn(async () => []) } },
        { provide: getRepositoryToken(Profissional), useValue: { find: vi.fn(async () => []) } },
        { provide: getModelToken(Avaliacao.name), useValue: { find: () => ({ exec: async () => [] }) } },
      ],
    });
  });
  beforeEach(() => Object.assign(repository, repositoryMock(estabelecimento())));
  afterAll(async () => contexto?.app.close());

  testarRotasProtegidas(
    () => contexto,
    [
      { metodo: 'post', caminho: rota },
      { metodo: 'get', caminho: rota },
      { metodo: 'get', caminho: `${rota}/${ESTABELECIMENTO_ID}` },
      { metodo: 'get', caminho: `${rota}/gestor/${ID}` },
      { metodo: 'patch', caminho: `${rota}/${ESTABELECIMENTO_ID}` },
      { metodo: 'delete', caminho: `${rota}/${ESTABELECIMENTO_ID}` },
    ],
  );

  it('POST retorna 201 com os dados enviados', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post(rota)
      .auth(contexto.token(), { type: 'bearer' })
      .send(dadosEstabelecimento)
      .expect(201);
    expect(resposta.body).toEqual({ ...dadosEstabelecimento, id: ESTABELECIMENTO_ID });
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['latitude', 91],
    ['longitude', -181],
    ['email', 'invalido'],
    ['redeSocial', ['1', '2', '3', '4', '5', '6']],
  ])('POST rejeita %s inválido', async (campo, valor) => {
    const resposta = await request(contexto.app.getHttpServer())
      .post(rota)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ ...dadosEstabelecimento, [campo]: valor })
      .expect(400);
    expect(resposta.body.message).toEqual(expect.arrayContaining([expect.stringContaining(campo)]));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('GET lista e retorna [] quando não há registros', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(rota)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual([{ ...dadosEstabelecimento, id: ESTABELECIMENTO_ID }]);
    repository.find.mockResolvedValueOnce([]);
    const vazia = await request(contexto.app.getHttpServer())
      .get(rota)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(vazia.body).toEqual([]);
  });

  it('GET /gestor/:id encaminha o filtro e aceita resultado vazio', async () => {
    repository.find.mockResolvedValueOnce([]);
    const resposta = await request(contexto.app.getHttpServer())
      .get(`${rota}/gestor/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual([]);
    expect(repository.find).toHaveBeenCalledWith({ where: { gestorId: ID } });
  });

  it('GET /:id retorna detalhes', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(`${rota}/${ESTABELECIMENTO_ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body.id).toBe(ESTABELECIMENTO_ID);
  });

  it.each([
    ['lat', 'abc'],
    ['lat', '91'],
    ['lng', 'abc'],
    ['lng', '-181'],
    ['raio', 'abc'],
    ['raio', '-5'],
  ])('GET /busca rejeita %s=%s com 400', async (campo, valor) => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(`${rota}/busca`)
      .query({ [campo]: valor })
      .auth(contexto.token(), { type: 'bearer' })
      .expect(400);
    expect(resposta.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining(campo)]),
    );
  });

  it('GET /busca aceita coordenadas e raio válidos', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(`${rota}/busca`)
      .query({ lat: '-19.9', lng: '-43.9', raio: '50', ordenarPor: 'distancia' })
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].distanciaKm).toBe(0);
  });

  it('GET /busca devolve 200 sem filtros de localização', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(`${rota}/busca`)
      .query({ nome: 'Central' })
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].distanciaKm).toBeNull();
  });

  it('PATCH preserva dados omitidos', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .patch(`${rota}/${ESTABELECIMENTO_ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ telefone: '3133334444' })
      .expect(200);
    expect(resposta.body).toMatchObject({ ...dadosEstabelecimento, telefone: '3133334444' });
  });

  it('POST descarta campos que não estão no DTO', async () => {
    await request(contexto.app.getHttpServer())
      .post(rota)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ ...dadosEstabelecimento, id: 'estabelecimento-de-outro-gestor', avaliacaoMedia: 5 })
      .expect(201);
    const [dadosCriados] = repository.create.mock.calls[0] as [Record<string, unknown>];
    expect(dadosCriados).not.toHaveProperty('id');
    expect(dadosCriados).not.toHaveProperty('avaliacaoMedia');
  });

  it('PATCH descarta id no corpo e altera só o estabelecimento da URL', async () => {
    await request(contexto.app.getHttpServer())
      .patch(`${rota}/${ESTABELECIMENTO_ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ id: 'estabelecimento-de-outro-gestor', telefone: '3133334444' })
      .expect(200);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: ESTABELECIMENTO_ID, telefone: '3133334444' }),
    );
  });

  it('PATCH rejeita coordenada inválida sem salvar', async () => {
    await request(contexto.app.getHttpServer())
      .patch(`${rota}/${ESTABELECIMENTO_ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ latitude: 91 })
      .expect(400);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch', 'delete'] as const)(
    '%s /:id retorna 404 para recurso ausente',
    async (metodo) => {
      repository.findOne.mockResolvedValueOnce(null);
      const resposta = await request(contexto.app.getHttpServer())
        [metodo](`${rota}/${ESTABELECIMENTO_ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .send({})
        .expect(404);
      expect(resposta.body.message).toContain(ESTABELECIMENTO_ID);
    },
  );

  it('DELETE retorna 204 sem body', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .delete(`${rota}/${ESTABELECIMENTO_ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(204);
    expect(resposta.text).toBe('');
    expect(repository.remove).toHaveBeenCalledTimes(1);
  });

  it('falha de banco sem tradução específica retorna 500', async () => {
    repository.save.mockRejectedValueOnce(new Error('Banco indisponível'));
    const resposta = await request(contexto.app.getHttpServer())
      .post(rota)
      .auth(contexto.token(), { type: 'bearer' })
      .send(dadosEstabelecimento)
      .expect(500);
    expect(resposta.body).toEqual({ statusCode: 500, message: 'Internal server error' });
  });
});

describe('Profissionais — HTTP', () => {
  let contexto: AppTeste;
  const fotos = new Map<string, Buffer | null>();
  const comHorario = new Set<string>();
  const fotosDosUsuarios = {
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
  };
  const repository = Object.assign(repositoryMock(profissional()), { manager: fotosDosUsuarios });
  const estabelecimentos = repositoryMock(estabelecimento());
  const rota = `/api/estabelecimentos/${ESTABELECIMENTO_ID}/profissionais`;
  const SERVICO_ID = 'c1d2e3f4-0000-4000-8000-000000000000';
  const servicos = { findBy: vi.fn() };
  const usuarios = { existsBy: vi.fn() };
  const agendamentos = { count: vi.fn() };
  const manager = { create: vi.fn(), save: vi.fn(), update: vi.fn(), delete: vi.fn(), softDelete: vi.fn() };
  const dataSource = {
    transaction: vi.fn(),
    getRepository: (entidade: unknown) =>
      entidade === Servico ? servicos : entidade === Agendamento ? agendamentos : usuarios,
  };
  const cadastro = { ...dadosPessoa, servicoIds: [SERVICO_ID] };
  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [ProfissionaisController],
      providers: [
        { provide: DataSource, useValue: dataSource },
        ProfissionaisService,
        { provide: getRepositoryToken(Profissional), useValue: repository },
        { provide: getRepositoryToken(Estabelecimento), useValue: estabelecimentos },
      ],
    });
  });
  beforeEach(() => {
    fotos.clear();
    fotosDosUsuarios.find.mockClear();
    fotosDosUsuarios.update.mockClear();
    Object.assign(repository, repositoryMock(profissional()));
    Object.assign(estabelecimentos, repositoryMock(estabelecimento()));
  });
  afterAll(async () => contexto?.app.close());
  beforeEach(() => {
    Object.assign(repository, {
      findOneOrFail: vi.fn(async () => Object.assign(profissional(), { servicos: [{ id: SERVICO_ID }] })),
    });
    servicos.findBy.mockReset().mockResolvedValue([{ id: SERVICO_ID, estabelecimentoId: ESTABELECIMENTO_ID }]);
    usuarios.existsBy.mockReset().mockResolvedValue(false);
    manager.create.mockReset().mockImplementation((_entidade: unknown, dados: object) => ({ ...dados }));
    manager.update.mockReset().mockResolvedValue({ affected: 1 });
    manager.delete.mockReset().mockResolvedValue({ affected: 1 });
    manager.softDelete.mockReset().mockResolvedValue({ affected: 1 });
    agendamentos.count.mockReset().mockResolvedValue(0);
    manager.save.mockReset().mockImplementation(async (_entidade: unknown, dados: object) => ({ ...dados, id: ID }));
    dataSource.transaction
      .mockReset()
      .mockImplementation(async (trabalho: (m: typeof manager) => Promise<unknown>) => trabalho(manager));
  });
  const postar = (corpo: object, token = contexto.token(Role.GESTOR, ID)) =>
    request(contexto.app.getHttpServer()).post(rota).auth(token, { type: 'bearer' }).send(corpo);
  testarRotasProtegidas(
    () => contexto,
    [
      { metodo: 'post', caminho: rota },
      { metodo: 'get', caminho: rota },
      { metodo: 'get', caminho: `${rota}/publicos` },
      { metodo: 'get', caminho: `${rota}/${ID}` },
      { metodo: 'patch', caminho: `${rota}/${ID}` },
      { metodo: 'delete', caminho: `${rota}/${ID}` },
    ],
  );

  it('POST do gestor dono cria o profissional e não expõe a senha', async () => {
    const resposta = await postar(cadastro).expect(201);
    expect(resposta.body).toMatchObject({ id: ID, estabelecimentoId: ESTABELECIMENTO_ID });
    expect(resposta.body.servicos).toEqual([{ id: SERVICO_ID }]);
    expect(resposta.body.usuario).not.toHaveProperty('senha');
    expect(manager.save).toHaveBeenCalledWith(
      Usuario,
      expect.objectContaining({ email: dadosPessoa.email, perfil: Role.PROFISSIONAL }),
    );
    expect(servicos.findBy).toHaveBeenCalledWith({
      id: expect.anything(),
      estabelecimentoId: ESTABELECIMENTO_ID,
    });
  });

  it.each([Role.CLIENTE, Role.PROFISSIONAL])('POST retorna 403 para o perfil %s', async (perfil) => {
    await postar(cadastro, contexto.token(perfil)).expect(403);
    expect(estabelecimentos.findOneBy).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('POST retorna 403 para estabelecimento de outro gestor', async () => {
    const resposta = await postar(cadastro, contexto.token(Role.GESTOR, 'outro-gestor')).expect(403);
    expect(resposta.body.message).toBe('Este estabelecimento não pertence ao gestor.');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('POST retorna 404 para estabelecimento inexistente', async () => {
    estabelecimentos.findOneBy.mockResolvedValueOnce(null);
    await postar(cadastro).expect(404);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('POST retorna 400 para serviço de outro estabelecimento', async () => {
    servicos.findBy.mockResolvedValueOnce([]);
    const resposta = await postar(cadastro).expect(400);
    expect(resposta.body.message).toBe('Algum serviço informado não pertence ao estabelecimento.');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['email', 'invalido'],
    ['senha', '12345'],
    ['servicoIds', []],
    ['servicoIds', ['nao-e-uuid']],
  ])('POST retorna 400 com %s inválido', async (campo, valor) => {
    const resposta = await postar({ ...cadastro, [campo]: valor }).expect(400);
    expect(resposta.body.message).toEqual(expect.arrayContaining([expect.stringContaining(campo)]));
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['email', 'Email já cadastrado.'],
    ['cpf', 'CPF já cadastrado.'],
  ])('POST retorna 409 quando o %s já está em uso', async (campo, mensagem) => {
    usuarios.existsBy.mockImplementation(async (criterio: Record<string, unknown>) => campo in criterio);
    const resposta = await postar(cadastro).expect(409);
    expect(resposta.body.message).toBe(mensagem);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  const listar = (token = contexto.token(Role.GESTOR, ID)) =>
    request(contexto.app.getHttpServer()).get(rota).auth(token, { type: 'bearer' });

  it('GET do gestor dono devolve o resumo em ordem, sem CPF, telefone nem senha', async () => {
    repository.find.mockResolvedValueOnce([
      Object.assign(profissional(), { servicos: [{ id: SERVICO_ID, nome: 'Corte' }] }),
    ]);
    const resposta = await listar().expect(200);
    expect(resposta.body).toEqual([
      {
        id: ID,
        nome: dadosPessoa.nome,
        sobrenome: dadosPessoa.sobrenome,
        email: dadosPessoa.email,
        foto: null,
        servicos: [{ id: SERVICO_ID, nome: 'Corte' }],
        temHorarios: false,
      },
    ]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { estabelecimentoId: ESTABELECIMENTO_ID },
      relations: { servicos: true },
      order: { usuario: { nome: 'ASC', sobrenome: 'ASC' } },
    });
  });

  it('GET marca temHorarios quando o profissional tem horário ativo', async () => {
    comHorario.add(ID);
    const resposta = await listar().expect(200);
    comHorario.clear();
    expect(resposta.body[0].temHorarios).toBe(true);
  });

  it('GET retorna lista vazia', async () => {
    repository.find.mockResolvedValueOnce([]);
    const resposta = await listar().expect(200);
    expect(resposta.body).toEqual([]);
  });

  it('GET retorna 403 para estabelecimento de outro gestor', async () => {
    const resposta = await listar(contexto.token(Role.GESTOR, 'outro-gestor')).expect(403);
    expect(resposta.body.message).toBe('Este estabelecimento não pertence ao gestor.');
    expect(repository.find).not.toHaveBeenCalled();
  });

  it.each([Role.CLIENTE, Role.PROFISSIONAL])('GET retorna 403 para o perfil %s', async (perfil) => {
    await listar(contexto.token(perfil, ID)).expect(403);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('GET retorna 404 para estabelecimento inexistente', async () => {
    estabelecimentos.findOneBy.mockResolvedValueOnce(null);
    await listar().expect(404);
    expect(repository.find).not.toHaveBeenCalled();
  });

  const listarPublicos = (token: string) =>
    request(contexto.app.getHttpServer()).get(`${rota}/publicos`).auth(token, { type: 'bearer' });

  it.each([Role.CLIENTE, Role.PROFISSIONAL, Role.GESTOR])(
    'GET /publicos lista os profissionais para o perfil %s, sem e-mail',
    async (perfil) => {
      repository.find.mockResolvedValueOnce([
        Object.assign(profissional(), { servicos: [{ id: SERVICO_ID, nome: 'Corte' }] }),
      ]);
      const resposta = await listarPublicos(contexto.token(perfil, 'qualquer-usuario')).expect(200);
      expect(resposta.body).toEqual([
        {
          id: ID,
          nome: dadosPessoa.nome,
          sobrenome: dadosPessoa.sobrenome,
          foto: null,
          servicos: [{ id: SERVICO_ID, nome: 'Corte' }],
          temHorarios: false,
        },
      ]);
      expect(estabelecimentos.findOneBy).not.toHaveBeenCalled();
      expect(repository.findOne).not.toHaveBeenCalled();
    },
  );

  const rotaProfissional = `${rota}/${ID}`;
  const detalhar = (token = contexto.token(Role.GESTOR, ID)) =>
    request(contexto.app.getHttpServer()).get(rotaProfissional).auth(token, { type: 'bearer' });
  const editar = (corpo: object, token = contexto.token(Role.GESTOR, ID)) =>
    request(contexto.app.getHttpServer()).patch(rotaProfissional).auth(token, { type: 'bearer' }).send(corpo);

  it('GET /:id do gestor dono devolve o detalhe sem senha', async () => {
    const resposta = await detalhar().expect(200);
    expect(resposta.body).toEqual({
      id: ID,
      nome: dadosPessoa.nome,
      sobrenome: dadosPessoa.sobrenome,
      email: dadosPessoa.email,
      cpf: dadosPessoa.cpf,
      telefone: dadosPessoa.telefone,
      foto: null,
      servicos: [],
    });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: ID, estabelecimentoId: ESTABELECIMENTO_ID },
      relations: { servicos: true },
    });
  });

  it('PATCH do gestor dono altera os dados pessoais e os serviços', async () => {
    const resposta = await editar({ nome: 'Bia', telefone: '31988887777', servicoIds: [SERVICO_ID] }).expect(200);
    expect(resposta.body).not.toHaveProperty('senha');
    expect(manager.update).toHaveBeenCalledWith(Usuario, { id: ID }, { nome: 'Bia', telefone: '31988887777' });
    expect(manager.save).toHaveBeenCalledWith(Profissional, expect.objectContaining({ id: ID }));
  });

  it('PATCH descarta cpf, senha, usuarioId e estabelecimentoId', async () => {
    await editar({ nome: 'Bia', cpf: '98765432100', senha: 'nova-senha', usuarioId: 'outro', estabelecimentoId: 'outro' }).expect(200);
    expect(manager.update).toHaveBeenCalledWith(Usuario, { id: ID }, { nome: 'Bia' });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('PATCH retorna 409 para e-mail de outra pessoa sem gravar', async () => {
    usuarios.existsBy.mockResolvedValueOnce(true);
    const resposta = await editar({ email: 'outra@example.com' }).expect(409);
    expect(resposta.body.message).toBe('Email já cadastrado.');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each([
    { email: 'invalido' },
    { telefone: '123' },
    { servicoIds: [] },
    { nome: '' },
  ])('PATCH rejeita %o com 400 sem gravar', async (corpo) => {
    await editar(corpo).expect(400);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch'] as const)('%s /:id retorna 403 para estabelecimento de outro gestor', async (metodo) => {
    await request(contexto.app.getHttpServer())
      [metodo](rotaProfissional)
      .auth(contexto.token(Role.GESTOR, 'outro-gestor'), { type: 'bearer' })
      .send({ nome: 'Bia' })
      .expect(403);
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['get', Role.CLIENTE],
    ['get', Role.PROFISSIONAL],
    ['patch', Role.CLIENTE],
    ['patch', Role.PROFISSIONAL],
  ] as const)('%s /:id retorna 403 para o perfil %s', async (metodo, perfil) => {
    await request(contexto.app.getHttpServer())
      [metodo](rotaProfissional)
      .auth(contexto.token(perfil, ID), { type: 'bearer' })
      .send({ nome: 'Bia' })
      .expect(403);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch', 'delete'] as const)(
    '%s retorna 404 para profissional ausente ou de outro estabelecimento',
    async (metodo) => {
      repository.findOne.mockResolvedValueOnce(null);
      await request(contexto.app.getHttpServer())
        [metodo](rotaProfissional)
        .auth(contexto.token(), { type: 'bearer' })
        .send({ nome: 'Bia' })
        .expect(404);
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',
    'base64',
  );
  const enviarFoto = (
    conteudo: Buffer = png,
    token = contexto.token(Role.GESTOR, ID),
    contentType = 'image/png',
  ) =>
    request(contexto.app.getHttpServer())
      .patch(`${rotaProfissional}/foto`)
      .auth(token, { type: 'bearer' })
      .attach('foto', conteudo, { filename: 'foto.png', contentType });

  it('PATCH /:id/foto do gestor dono grava e devolve a data URL', async () => {
    const resposta = await enviarFoto().expect(200);
    expect(resposta.body.foto).toMatch(/^data:image\/png;base64,/);
    expect(fotosDosUsuarios.update).toHaveBeenCalledWith(Usuario, { id: ID }, { fotoPerfil: png });
  });

  it('PATCH /:id/foto recusa arquivo que não é imagem com 400', async () => {
    const resposta = await enviarFoto(Buffer.from('não sou uma imagem')).expect(400);
    expect(resposta.body.message).toBe('A foto deve ser um arquivo JPG, PNG ou WebP válido.');
    expect(fotosDosUsuarios.update).not.toHaveBeenCalled();
  });

  it('PATCH /:id/foto recusa arquivo acima de 2 MB', async () => {
    await enviarFoto(Buffer.alloc(2 * 1024 * 1024 + 1)).expect((resposta) => {
      expect([400, 413]).toContain(resposta.status);
    });
    expect(fotosDosUsuarios.update).not.toHaveBeenCalled();
  });

  it('PATCH /:id/foto retorna 403 para estabelecimento de outro gestor', async () => {
    await enviarFoto(png, contexto.token(Role.GESTOR, 'outro-gestor')).expect(403);
    expect(fotosDosUsuarios.update).not.toHaveBeenCalled();
  });

  it.each([Role.CLIENTE, Role.PROFISSIONAL])('PATCH /:id/foto retorna 403 para o perfil %s', async (perfil) => {
    await enviarFoto(png, contexto.token(perfil, ID)).expect(403);
    expect(fotosDosUsuarios.update).not.toHaveBeenCalled();
  });

  it('PATCH /:id/foto retorna 404 para profissional de outro estabelecimento', async () => {
    repository.findOne.mockResolvedValueOnce(null);
    await enviarFoto().expect(404);
    expect(fotosDosUsuarios.update).not.toHaveBeenCalled();
  });

  it('PATCH /:id/foto retorna 401 sem token', async () => {
    await request(contexto.app.getHttpServer())
      .patch(`${rotaProfissional}/foto`)
      .attach('foto', png, { filename: 'foto.png', contentType: 'image/png' })
      .expect(401);
  });

  const excluir = (token = contexto.token(Role.GESTOR, ID)) =>
    request(contexto.app.getHttpServer()).delete(rotaProfissional).auth(token, { type: 'bearer' });

  it('DELETE do gestor dono responde 204 e faz exclusão lógica liberando a conta', async () => {
    const resposta = await excluir().expect(204);
    expect(resposta.text).toBe('');
    expect(manager.softDelete).toHaveBeenCalledWith(Profissional, { id: ID });
    expect(manager.update).toHaveBeenCalledWith(
      Usuario,
      { id: ID },
      expect.objectContaining({ email: `excluido+${ID}@agiliza.invalid`, cpf: `excluido:${ID}` }),
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('DELETE retorna 409 com agendamento futuro em aberto, sem gravar', async () => {
    agendamentos.count.mockResolvedValueOnce(2);
    const resposta = await excluir().expect(409);
    expect(resposta.body.message).toBe(
      'O profissional tem agendamentos pendentes ou confirmados. Cancele ou conclua esses agendamentos antes de excluir.',
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('DELETE retorna 403 para estabelecimento de outro gestor', async () => {
    await excluir(contexto.token(Role.GESTOR, 'outro-gestor')).expect(403);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it.each([Role.CLIENTE, Role.PROFISSIONAL])('DELETE retorna 403 para o perfil %s', async (perfil) => {
    await excluir(contexto.token(perfil, ID)).expect(403);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
