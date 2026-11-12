import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AgendamentosController } from '../src/agendamentos/agendamentos.controller.js';
import { AgendamentosService } from '../src/agendamentos/agendamentos.service.js';
import { Agendamento, StatusAgendamento } from '../src/agendamentos/entities/agendamento.entity.js';
import { Cliente } from '../src/clientes/entities/cliente.entity.js';
import { Profissional } from '../src/profissionais/entities/profissional.entity.js';
import { Servico } from '../src/servicos/entities/servico.entity.js';
import { BloqueioAgenda } from '../src/agenda/entities/bloqueio-agenda.entity.js';
import { EmailService } from '../src/email/email.service.js';
import { FidelidadeService } from '../src/fidelidade/fidelidade.service.js';
import { NotificacoesService } from '../src/notificacoes/notificacoes.service.js';
import { ClienteEstabelecimento } from '../src/fidelidade/entities/cliente-estabelecimento.entity.js';
import { Estabelecimento } from '../src/estabelecimentos/entities/estabelecimento.entity.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { ESTABELECIMENTO_ID, ID } from './helpers/fixtures.js';
import { agendamentosMock, AGORA, dadosAgendamento, INICIO } from './helpers/agendamentos.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe('Agendamentos — HTTP', () => {
  let contexto: AppTeste;
  let mocks: ReturnType<typeof agendamentosMock>;
  const dataSource = {};
  const email = {};
  const fidelidadeRepository = {};
  const notificacoes = { criarParaAgendamento: vi.fn(async () => undefined) };
  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [AgendamentosController],
      providers: [
        AgendamentosService,
        FidelidadeService,
        { provide: getRepositoryToken(ClienteEstabelecimento), useValue: fidelidadeRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: EmailService, useValue: email },
        { provide: NotificacoesService, useValue: notificacoes },
      ],
    });
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
    mocks = agendamentosMock();
    Object.assign(dataSource, mocks.dataSource);
    Object.assign(email, mocks.email);
    Object.assign(fidelidadeRepository, mocks.fidelidadeRepository);
  });
  afterEach(() => vi.useRealTimers());
  afterAll(async () => contexto?.app.close());
  testarRotasProtegidas(
    () => contexto,
    [
      { metodo: 'post', caminho: '/api/agendamentos' },
      { metodo: 'get', caminho: '/api/agendamentos/meus' },
      { metodo: 'delete', caminho: `/api/agendamentos/${ID}` },
      { metodo: 'patch', caminho: `/api/agendamentos/${ID}` },
    ],
  );

  it.each([Role.GESTOR, Role.PROFISSIONAL])(
    'nega criação e cancelamento ao perfil %s',
    async (role) => {
      await request(contexto.app.getHttpServer())
        .post('/api/agendamentos')
        .auth(contexto.token(role), { type: 'bearer' })
        .send(dadosAgendamento)
        .expect(403);
      await request(contexto.app.getHttpServer())
        .delete(`/api/agendamentos/${ID}`)
        .auth(contexto.token(role), { type: 'bearer' })
        .expect(403);
      expect(mocks.dataSource.createQueryRunner).not.toHaveBeenCalled();
    },
  );

  it.each([Role.GESTOR, Role.PROFISSIONAL])(
    'GET /meus nega a listagem ao perfil %s',
    async (role) => {
      await request(contexto.app.getHttpServer())
        .get('/api/agendamentos/meus')
        .auth(contexto.token(role), { type: 'bearer' })
        .expect(403);
      expect(mocks.manager.find).not.toHaveBeenCalled();
    },
  );

  it('GET /meus retorna 200 com os agendamentos do cliente do JWT e sem dados extras', async () => {
    mocks.manager.find.mockImplementation(async (entidade: Function) => {
      if (entidade === Agendamento) {
        return [
          Object.assign(new Agendamento(), {
            id: ID,
            status: StatusAgendamento.CONCLUIDO,
            clienteId: ID,
            dataHoraInicio: new Date(INICIO),
            dataHoraFim: new Date('2030-10-21T10:40:00'),
            servico: { id: ID, nome: 'Corte' },
            profissional: {
              id: ID,
              estabelecimentoId: ESTABELECIMENTO_ID,
              usuario: { nome: 'Carlos', sobrenome: 'Souza' },
            },
          }),
        ];
      }
      if (entidade === Estabelecimento) {
        return [
          Object.assign(new Estabelecimento(), {
            id: ESTABELECIMENTO_ID,
            nome: 'Barbearia Central',
            fotoAtualizadaEm: new Date('2030-10-01T12:00:00'),
          }),
        ];
      }
      return [];
    });

    const resposta = await request(contexto.app.getHttpServer())
      .get('/api/agendamentos/meus')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(200);

    expect(resposta.body).toEqual([
      {
        id: ID,
        status: StatusAgendamento.CONCLUIDO,
        clienteId: ID,
        dataHoraInicio: new Date(INICIO).toISOString(),
        dataHoraFim: new Date('2030-10-21T10:40:00').toISOString(),
        servico: { id: ID, nome: 'Corte' },
        profissional: { id: ID, nome: 'Carlos', sobrenome: 'Souza' },
        estabelecimento: {
          id: ESTABELECIMENTO_ID,
          nome: 'Barbearia Central',
          fotoAtualizadaEm: new Date('2030-10-01T12:00:00').toISOString(),
        },
      },
    ]);
    expect(mocks.manager.findOne).toHaveBeenCalledWith(Cliente, {
      where: { usuarioId: ID },
      loadEagerRelations: false,
    });
  });

  it('GET /meus retorna 404 quando o usuário logado não tem cadastro de cliente', async () => {
    mocks.registros.set(Cliente, null);

    await request(contexto.app.getHttpServer())
      .get('/api/agendamentos/meus')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(404);
  });

  it('POST retorna 201, usa cliente do JWT, calcula fim e envia email após commit', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post('/api/agendamentos')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .send({ ...dadosAgendamento, clienteId: 'outro', status: 3 })
      .expect(201);
    expect(resposta.body).toMatchObject({
      id: ID,
      clienteId: ID,
      profissionalId: ID,
      servicoId: ID,
      status: StatusAgendamento.PENDENTE,
      dataHoraInicio: new Date(INICIO).toISOString(),
      dataHoraFim: new Date('2030-10-21T10:40:00').toISOString(),
    });
    expect(mocks.manager.findOne).toHaveBeenCalledWith(Cliente, {
      where: { usuarioId: ID },
      loadEagerRelations: false,
    });
    expect(mocks.runner.commitTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.email.enviarAgendamentoCriado.mock.invocationCallOrder[0],
    );
    expect(mocks.saldos.size).toBe(0);
  });

  it('POST rejeita data malformada antes de abrir transação', async () => {
    await request(contexto.app.getHttpServer())
      .post('/api/agendamentos')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .send({ ...dadosAgendamento, dataHoraInicio: 'invalida' })
      .expect(400);
    expect(mocks.dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it.each([
    '2030-10-19T10:00:00',
    '2030-10-21T08:00:00',
    '2030-10-21T17:30:00',
    '2030-10-21T10:15:00',
    '2030-10-21T10:00:30',
  ])('POST rejeita horário %s', async (dataHoraInicio) => {
    await request(contexto.app.getHttpServer())
      .post('/api/agendamentos')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .send({ ...dadosAgendamento, dataHoraInicio })
      .expect(400);
    expect(mocks.manager.save).not.toHaveBeenCalled();
  });

  it.each([Cliente, Profissional, Servico])(
    'POST retorna 404 para %s ausente',
    async (entidade) => {
      mocks.registros.set(entidade, null);
      await request(contexto.app.getHttpServer())
        .post('/api/agendamentos')
        .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
        .send(dadosAgendamento)
        .expect(404);
      expect(mocks.runner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mocks.runner.release).toHaveBeenCalledTimes(1);
    },
  );

  it('POST rejeita serviço de outro estabelecimento', async () => {
    Object.assign(mocks.registros.get(Servico)!, { estabelecimentoId: 'outro' });
    await request(contexto.app.getHttpServer())
      .post('/api/agendamentos')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .send(dadosAgendamento)
      .expect(400);
  });

  it('POST rejeita ausência de disponibilidade do profissional', async () => {
    mocks.disponibilidades.splice(0);
    await request(contexto.app.getHttpServer())
      .post('/api/agendamentos')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .send(dadosAgendamento)
      .expect(400);
  });

  it('POST rejeita bloqueio de dia inteiro', async () => {
    mocks.bloqueios.push(Object.assign(new BloqueioAgenda(), { horaInicio: null, horaFim: null }));
    await request(contexto.app.getHttpServer())
      .post('/api/agendamentos')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .send(dadosAgendamento)
      .expect(400);
  });

  it('POST retorna 409 para horário ocupado sem enviar email', async () => {
    mocks.manager.exists.mockResolvedValueOnce(true);
    await request(contexto.app.getHttpServer())
      .post('/api/agendamentos')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .send(dadosAgendamento)
      .expect(409);
    expect(mocks.email.enviarAgendamentoCriado).not.toHaveBeenCalled();
  });

  it('DELETE retorna 204, cancela sem apagar e envia email após commit', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .delete(`/api/agendamentos/${ID}`)
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(204);
    expect(resposta.text).toBe('');
    expect(mocks.manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: StatusAgendamento.CANCELADO }),
    );
    expect(mocks.runner.commitTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.email.enviarAgendamentoCancelado.mock.invocationCallOrder[0],
    );
    expect(mocks.saldos.size).toBe(0);
  });

  it('DELETE retorna 403 para agendamento de outro cliente', async () => {
    Object.assign(mocks.registros.get(Agendamento)!, { clienteId: 'outro' });
    await request(contexto.app.getHttpServer())
      .delete(`/api/agendamentos/${ID}`)
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(403);
    expect(mocks.manager.save).not.toHaveBeenCalled();
  });

  it('DELETE retorna 404 para agendamento ausente', async () => {
    mocks.registros.set(Agendamento, null);
    await request(contexto.app.getHttpServer())
      .delete(`/api/agendamentos/${ID}`)
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(404);
  });

  it.each([StatusAgendamento.CANCELADO, StatusAgendamento.CONCLUIDO])(
    'DELETE retorna 409 para status %s',
    async (status) => {
      Object.assign(mocks.registros.get(Agendamento)!, { status });
      await request(contexto.app.getHttpServer())
        .delete(`/api/agendamentos/${ID}`)
        .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
        .expect(409);
      expect(mocks.email.enviarAgendamentoCancelado).not.toHaveBeenCalled();
    },
  );

  it.each([Role.GESTOR, Role.PROFISSIONAL, Role.CLIENTE])(
    'PATCH permite ao perfil %s concluir e credita o cliente do agendamento',
    async (role) => {
      Object.assign(mocks.registros.get(Estabelecimento)!, { fidelidade: true });
      const resposta = await request(contexto.app.getHttpServer())
        .patch(`/api/agendamentos/${ID}`)
        .auth(contexto.token(role, 'outro-usuario'), { type: 'bearer' })
        .send({
          status: StatusAgendamento.CONCLUIDO,
          clienteId: 'outro-cliente',
          estabelecimentoId: 'outro-estabelecimento',
          pontos: 9999,
        })
        .expect(200);
      expect(resposta.body).toMatchObject({
        id: ID,
        clienteId: ID,
        status: StatusAgendamento.CONCLUIDO,
      });
      const chave = mocks.chaveSaldo(
        ID,
        (mocks.registros.get(Profissional) as Profissional).estabelecimentoId,
      );
      expect(mocks.saldos.get(chave)).toMatchObject({ clienteId: ID, pontos: 10 });
      expect(mocks.runner.commitTransaction).toHaveBeenCalledTimes(1);
    },
  );

  it('PATCH conclui sem crédito com programa desativado', async () => {
    Object.assign(mocks.registros.get(Estabelecimento)!, { fidelidade: false });
    await request(contexto.app.getHttpServer())
      .patch(`/api/agendamentos/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ status: StatusAgendamento.CONCLUIDO })
      .expect(200);
    expect(mocks.saldos.size).toBe(0);
  });

  it('PATCH conclui sem criar saldo quando o serviço oferece zero pontos', async () => {
    Object.assign(mocks.registros.get(Estabelecimento)!, { fidelidade: true });
    Object.assign(mocks.registros.get(Servico)!, { pontoFidelidade: 0 });
    await request(contexto.app.getHttpServer())
      .patch(`/api/agendamentos/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ status: StatusAgendamento.CONCLUIDO })
      .expect(200);
    expect(mocks.saldos.size).toBe(0);
  });

  it('PATCH acumula sobre saldo anterior e não duplica em uma repetição', async () => {
    Object.assign(mocks.registros.get(Estabelecimento)!, { fidelidade: true });
    const estabelecimentoId = (mocks.registros.get(Profissional) as Profissional).estabelecimentoId;
    const chave = mocks.chaveSaldo(ID, estabelecimentoId);
    mocks.saldos.set(
      chave,
      Object.assign(new ClienteEstabelecimento(), { clienteId: ID, estabelecimentoId, pontos: 15 }),
    );
    for (let repeticao = 0; repeticao < 2; repeticao++) {
      await request(contexto.app.getHttpServer())
        .patch(`/api/agendamentos/${ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .send({ status: StatusAgendamento.CONCLUIDO })
        .expect(200);
    }
    expect(mocks.saldos.get(chave)?.pontos).toBe(25);
    expect(mocks.saldos.size).toBe(1);
    expect(
      mocks.manager.save.mock.calls.filter(([entidade]) => entidade === ClienteEstabelecimento),
    ).toHaveLength(1);
  });

  it.each([StatusAgendamento.CONCLUIDO, StatusAgendamento.CANCELADO])(
    'PATCH retorna 409 ao tentar sair do estado definitivo %s',
    async (status) => {
      Object.assign(mocks.registros.get(Agendamento)!, { status });
      const resposta = await request(contexto.app.getHttpServer())
        .patch(`/api/agendamentos/${ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .send({ status: StatusAgendamento.CONFIRMADO })
        .expect(409);
      expect(resposta.body.statusCode).toBe(409);
      expect(mocks.manager.save).not.toHaveBeenCalled();
      expect(mocks.saldos.size).toBe(0);
    },
  );

  it('PATCH retorna 409 para conclusão de atendimento cancelado', async () => {
    Object.assign(mocks.registros.get(Agendamento)!, { status: StatusAgendamento.CANCELADO });
    await request(contexto.app.getHttpServer())
      .patch(`/api/agendamentos/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ status: StatusAgendamento.CONCLUIDO })
      .expect(409);
    expect(mocks.saldos.size).toBe(0);
  });

  it.each([
    {},
    { status: null },
    { status: 4 },
    { status: 1.5 },
    { status: true },
    { status: '2' },
    { status: 'CONCLUIDO' },
  ])('PATCH rejeita body %j sem acessar a persistência', async (body) => {
    const resposta = await request(contexto.app.getHttpServer())
      .patch(`/api/agendamentos/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send(body)
      .expect(400);
    expect(resposta.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('status')]),
    );
    expect(mocks.dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('PATCH retorna 404 quando o agendamento não existe', async () => {
    mocks.registros.set(Agendamento, null);
    await request(contexto.app.getHttpServer())
      .patch(`/api/agendamentos/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ status: StatusAgendamento.CONCLUIDO })
      .expect(404);
    expect(mocks.runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.runner.release).toHaveBeenCalledTimes(1);
  });

  it('PATCH retorna 404 quando o estabelecimento do atendimento não existe', async () => {
    mocks.registros.set(Estabelecimento, null);
    await request(contexto.app.getHttpServer())
      .patch(`/api/agendamentos/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ status: StatusAgendamento.CONCLUIDO })
      .expect(404);
    expect(mocks.saldos.size).toBe(0);
    expect(mocks.runner.rollbackTransaction).toHaveBeenCalledTimes(1);
  });

  it('PATCH retorna 500 e solicita rollback quando o crédito falha', async () => {
    Object.assign(mocks.registros.get(Estabelecimento)!, { fidelidade: true });
    mocks.manager.save.mockImplementation(async (entidade: object | Function, dados?: object) => {
      if (entidade === ClienteEstabelecimento) throw new Error('Falha interna no saldo');
      return dados ?? entidade;
    });
    const resposta = await request(contexto.app.getHttpServer())
      .patch(`/api/agendamentos/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ status: StatusAgendamento.CONCLUIDO })
      .expect(500);
    expect(resposta.body).toEqual({ statusCode: 500, message: 'Internal server error' });
    expect(mocks.runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.runner.release).toHaveBeenCalledTimes(1);
    expect(mocks.runner.commitTransaction).not.toHaveBeenCalled();
  });
});
