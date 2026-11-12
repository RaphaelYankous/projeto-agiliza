import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nModule } from 'nestjs-i18n';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { configurarApp } from '../src/app.setup.js';
import { AuthGuard } from '../src/auth/guards/auth.guard.js';
import { RoleGuard } from '../src/auth/guards/roles.guard.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { Servico } from '../src/servicos/entities/servico.entity.js';
import { Estabelecimento } from '../src/estabelecimentos/entities/estabelecimento.entity.js';
import { Agendamento } from '../src/agendamentos/entities/agendamento.entity.js';
import { ServicosController } from '../src/servicos/servicos.controller.js';
import { ServicosService } from '../src/servicos/servicos.service.js';

const estabelecimentoId = 'e0426438-21f6-497f-a695-026826f82999';
const servicoId = '8f47e310-235b-4d52-9862-c9be5f7e6a98';
const rota = `/api/estabelecimentos/${estabelecimentoId}/servicos`;
const dadosValidos = {
  nome: 'Corte',
  preco: 4500,
  descricao: 'Corte com acabamento',
  duracao: 40,
  pontoFidelidade: 0,
  estabelecimentoId,
};
const dataRegistro = new Date('2026-10-10T12:00:00.000Z');
const respostaServico = {
  id: servicoId,
  ...dadosValidos,
  createdAt: dataRegistro.toISOString(),
  updatedAt: dataRegistro.toISOString(),
};

function novoServico() {
  return Object.assign(new Servico(), {
    ...dadosValidos,
    id: servicoId,
    createdAt: dataRegistro,
    updatedAt: dataRegistro,
  });
}

function montarRepository() {
  return {
    create: vi.fn((dados: object) => Object.assign(new Servico(), dados)),
    save: vi.fn(async (servico: Servico) =>
      Object.assign(servico, {
        id: servicoId,
        createdAt: dataRegistro,
        updatedAt: dataRegistro,
      }),
    ),
    find: vi.fn(async () => [novoServico()]),
    findOne: vi.fn(async (): Promise<Servico | null> => novoServico()),
    remove: vi.fn(async (servico: Servico) => servico),
  };
}

function montarEstabelecimentoRepository() {
  return {
    existsBy: vi.fn(async () => true),
  };
}

function montarAgendamentoRepository() {
  return {
    existsBy: vi.fn(async () => false),
  };
}

const operacoes = [
  { metodo: 'get', caminho: rota },
  { metodo: 'get', caminho: `${rota}/publicos` },
  { metodo: 'post', caminho: rota },
  { metodo: 'get', caminho: `${rota}/${servicoId}` },
  { metodo: 'patch', caminho: `${rota}/${servicoId}` },
  { metodo: 'delete', caminho: `${rota}/${servicoId}` },
] as const;

describe('Serviços — contrato HTTP atual', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let token: string;
  let repository: ReturnType<typeof montarRepository>;

  beforeAll(async () => {
    repository = montarRepository();
    const estabelecimentoRepository = montarEstabelecimentoRepository();
    const agendamentoRepository = montarAgendamentoRepository();
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'segredo-exclusivo-dos-testes-de-servicos' }),
        I18nModule.forRoot({
          fallbackLanguage: 'pt-BR',
          loaderOptions: {
            path: fileURLToPath(new URL('../src/i18n/', import.meta.url)),
            watch: false,
          },
        }),
      ],
      controllers: [ServicosController],
      providers: [
        ServicosService,
        { provide: getRepositoryToken(Servico), useValue: repository },
        {
          provide: getRepositoryToken(Estabelecimento),
          useValue: estabelecimentoRepository,
        },
        {
          provide: getRepositoryToken(Agendamento),
          useValue: agendamentoRepository,
        },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RoleGuard },
      ],
    }).compile();

    app = module.createNestApplication({ logger: false });
    configurarApp(app);
    await app.init();
    jwt = module.get(JwtService);
    token = jwt.sign({ sub: 'usuario-teste', email: 'teste@example.com', role: Role.GESTOR });
  });

  beforeEach(() => {
    Object.assign(repository, montarRepository());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe.each(operacoes)('$metodo $caminho', ({ metodo, caminho }) => {
    it.each(['ausente', 'inválido', 'expirado', 'Basic'])(
      'retorna 401 para token %s antes de acessar o repositório',
      async (cenario) => {
        const requisicao = request(app.getHttpServer())[metodo](caminho).send(dadosValidos);
        if (cenario === 'inválido') requisicao.set('Authorization', 'Bearer token-invalido');
        if (cenario === 'expirado') {
          const expirado = jwt.sign({ sub: 'usuario-teste', role: Role.GESTOR }, { expiresIn: -1 });
          requisicao.set('Authorization', `Bearer ${expirado}`);
        }
        if (cenario === 'Basic') requisicao.set('Authorization', `Basic ${token}`);

        const resposta = await requisicao.expect(401);

        expect(resposta.body).toMatchObject({ statusCode: 401 });
        for (const mock of Object.values(repository)) expect(mock).not.toHaveBeenCalled();
      },
    );
  });

  it('POST retorna 201 com o serviço criado e datas serializadas', async () => {
    const resposta = await request(app.getHttpServer())
      .post(rota)
      .auth(token, { type: 'bearer' })
      .send(dadosValidos)
      .expect(201);

    expect(resposta.body).toEqual(respostaServico);
    expect(repository.create).toHaveBeenCalledWith(dadosValidos);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('POST utiliza o estabelecimento da URL quando o body informa outro', async () => {
    const resposta = await request(app.getHttpServer())
      .post(rota)
      .auth(token, { type: 'bearer' })
      .send({ ...dadosValidos, estabelecimentoId: 'outro-estabelecimento' })
      .expect(201);

    expect(resposta.body.estabelecimentoId).toBe(estabelecimentoId);
    expect(repository.create).toHaveBeenCalledWith(dadosValidos);
  });

  it('POST usa o estabelecimentoId da rota quando o body não informa', async () => {
    const { estabelecimentoId: _id, ...body } = dadosValidos;
    const resposta = await request(app.getHttpServer())
      .post(rota)
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);

    expect(resposta.body.estabelecimentoId).toBe(estabelecimentoId);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ estabelecimentoId }),
    );
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['nome', ''],
    ['descricao', 123],
    ['preco', 0],
    ['preco', 45.5],
    ['duracao', -1],
    ['duracao', '40'],
    ['pontoFidelidade', -1],
  ])('POST retorna 400 quando %s recebe %j', async (campo, valor) => {
    const resposta = await request(app.getHttpServer())
      .post(rota)
      .auth(token, { type: 'bearer' })
      .send({ ...dadosValidos, [campo]: valor })
      .expect(400);

    expect(resposta.body).toMatchObject({ statusCode: 400, message: expect.any(Array) });
    expect(resposta.body.message).toEqual(expect.arrayContaining([expect.stringContaining(campo)]));
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('GET retorna a lista filtrada pelo estabelecimento', async () => {
    const resposta = await request(app.getHttpServer())
      .get(rota)
      .auth(token, { type: 'bearer' })
      .expect(200);

    expect(resposta.body).toEqual([respostaServico]);
    expect(repository.find).toHaveBeenCalledWith({ where: { estabelecimentoId } });
  });

  it('GET retorna 200 e [] quando o catálogo está vazio', async () => {
    repository.find.mockResolvedValueOnce([]);
    const resposta = await request(app.getHttpServer())
      .get(rota)
      .auth(token, { type: 'bearer' })
      .expect(200);

    expect(resposta.body).toEqual([]);
  });

  it('GET /:id retorna os detalhes do serviço', async () => {
    const resposta = await request(app.getHttpServer())
      .get(`${rota}/${servicoId}`)
      .auth(token, { type: 'bearer' })
      .expect(200);

    expect(resposta.body).toEqual(respostaServico);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: servicoId } });
  });

  it('PATCH retorna 200 com atualização parcial e preserva os campos omitidos', async () => {
    const resposta = await request(app.getHttpServer())
      .patch(`${rota}/${servicoId}`)
      .auth(token, { type: 'bearer' })
      .send({ preco: 5000 })
      .expect(200);

    expect(resposta.body).toEqual({ ...respostaServico, preco: 5000 });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ...dadosValidos,
        preco: 5000,
      }),
    );
  });

  it('PATCH aceita body vazio no contrato atual', async () => {
    const resposta = await request(app.getHttpServer())
      .patch(`${rota}/${servicoId}`)
      .auth(token, { type: 'bearer' })
      .send({})
      .expect(200);

    expect(resposta.body).toEqual(respostaServico);
  });

  it.each([
    ['preco', 0],
    ['duracao', 1.5],
    ['pontoFidelidade', -1],
  ])('PATCH retorna 400 quando %s recebe %j', async (campo, valor) => {
    const resposta = await request(app.getHttpServer())
      .patch(`${rota}/${servicoId}`)
      .auth(token, { type: 'bearer' })
      .send({ [campo]: valor })
      .expect(400);

    expect(resposta.body.message).toEqual(expect.arrayContaining([expect.stringContaining(campo)]));
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch', 'delete'] as const)(
    '%s /:id retorna 404 quando o serviço não existe',
    async (metodo) => {
      repository.findOne.mockResolvedValueOnce(null);
      const resposta = await request(app.getHttpServer())
        [metodo](`${rota}/${servicoId}`)
        .auth(token, { type: 'bearer' })
        .send({})
        .expect(404);

      expect(resposta.body).toEqual({
        statusCode: 404,
        message: `Serviço com ID ${servicoId} não encontrado.`,
        error: 'Not Found',
      });
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );

  it('DELETE retorna 204 sem corpo e remove o serviço encontrado', async () => {
    const resposta = await request(app.getHttpServer())
      .delete(`${rota}/${servicoId}`)
      .auth(token, { type: 'bearer' })
      .expect(204);

    expect(resposta.text).toBe('');
    expect(repository.remove).toHaveBeenCalledWith(novoServico());
  });

  it.each(Object.values(Role))(
    'permite cadastro pelo perfil %s no contrato atual',
    async (role) => {
      const tokenPerfil = jwt.sign({ sub: 'usuario-teste', role });
      await request(app.getHttpServer())
        .post(rota)
        .auth(tokenPerfil, { type: 'bearer' })
        .send(dadosValidos)
        .expect(201);

      expect(repository.save).toHaveBeenCalledTimes(1);
    },
  );

  it('retorna 500 sem expor detalhes de uma falha inesperada de persistência', async () => {
    repository.save.mockRejectedValueOnce(new Error('Detalhe interno do banco'));
    const resposta = await request(app.getHttpServer())
      .post(rota)
      .auth(token, { type: 'bearer' })
      .send(dadosValidos)
      .expect(500);

    expect(resposta.body).toEqual({ statusCode: 500, message: 'Internal server error' });
  });

  it('retorna 408 quando a consulta ultrapassa o timeout global', async () => {
    // RxJS schedules timeout via setInterval; keep HTTP sockets on real timers.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    repository.find.mockImplementationOnce(() => new Promise(() => {}));
    const respostaPendente = request(app.getHttpServer())
      .get(rota)
      .auth(token, { type: 'bearer' })
      .then((resposta) => resposta);

    await vi.waitFor(() => expect(repository.find).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(10_001);
    const resposta = await respostaPendente;

    expect(resposta.status).toBe(408);
    expect(resposta.body).toMatchObject({ statusCode: 408 });
  });

  it.each([Role.CLIENTE, Role.PROFISSIONAL, Role.GESTOR])(
    'GET /publicos lista os serviços do estabelecimento para o perfil %s',
    async (perfil) => {
      const tokenDoPerfil = jwt.sign({ sub: 'qualquer-usuario', email: 'x@example.com', role: perfil });
      const resposta = await request(app.getHttpServer())
        .get(`${rota}/publicos`)
        .auth(tokenDoPerfil, { type: 'bearer' })
        .expect(200);

      expect(resposta.body).toEqual([respostaServico]);
      expect(repository.find).toHaveBeenCalledWith({ where: { estabelecimentoId } });
      expect(repository.findOne).not.toHaveBeenCalled();
    },
  );

  it.each([Role.CLIENTE, Role.PROFISSIONAL])(
    'GET da lista do gestor retorna 403 para o perfil %s',
    async (perfil) => {
      const tokenDoPerfil = jwt.sign({ sub: 'qualquer-usuario', email: 'x@example.com', role: perfil });
      await request(app.getHttpServer()).get(rota).auth(tokenDoPerfil, { type: 'bearer' }).expect(403);

      expect(repository.find).not.toHaveBeenCalled();
    },
  );
});
