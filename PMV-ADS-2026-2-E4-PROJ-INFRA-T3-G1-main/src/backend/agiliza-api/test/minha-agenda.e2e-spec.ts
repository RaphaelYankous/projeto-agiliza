import { BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { MinhaAgendaController } from '../src/agenda/minha-agenda.controller.js';
import { MinhaAgendaService } from '../src/agenda/minha-agenda.service.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { ID } from './helpers/fixtures.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe('Minha agenda — HTTP', () => {
  const service = {
    consultar: vi.fn(),
    listarBloqueios: vi.fn(),
    criarBloqueio: vi.fn(),
    removerBloqueio: vi.fn(),
    listarDisponibilidades: vi.fn(),
    criarDisponibilidade: vi.fn(),
    removerDisponibilidade: vi.fn(),
  };
  let contexto: AppTeste;

  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [MinhaAgendaController],
      providers: [{ provide: MinhaAgendaService, useValue: service }],
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    service.consultar.mockResolvedValue({ data: '2030-10-21', disponibilidades: [], bloqueios: [], agendamentos: [] });
    service.listarBloqueios.mockResolvedValue([]);
    service.criarBloqueio.mockResolvedValue({ id: ID });
    service.removerBloqueio.mockResolvedValue(undefined);
    service.listarDisponibilidades.mockResolvedValue([]);
    service.criarDisponibilidade.mockResolvedValue({ id: ID });
    service.removerDisponibilidade.mockResolvedValue(undefined);
  });
  afterAll(async () => contexto?.app.close());

  testarRotasProtegidas(() => contexto, [
    { metodo: 'get', caminho: '/api/minha-agenda?data=2030-10-21' },
    { metodo: 'get', caminho: '/api/minha-agenda/bloqueios' },
    { metodo: 'post', caminho: '/api/minha-agenda/bloqueios' },
    { metodo: 'delete', caminho: `/api/minha-agenda/bloqueios/${ID}` },
    { metodo: 'get', caminho: '/api/minha-agenda/disponibilidades' },
    { metodo: 'post', caminho: '/api/minha-agenda/disponibilidades' },
    { metodo: 'delete', caminho: `/api/minha-agenda/disponibilidades/${ID}` },
  ]);

  it.each([Role.CLIENTE, Role.GESTOR])('não permite acesso para %s', async (role) => {
    await request(contexto.app.getHttpServer()).get('/api/minha-agenda?data=2030-10-21')
      .auth(contexto.token(role), { type: 'bearer' }).expect(403);
    await request(contexto.app.getHttpServer()).get('/api/minha-agenda/bloqueios')
      .auth(contexto.token(role), { type: 'bearer' }).expect(403);
    await request(contexto.app.getHttpServer()).post('/api/minha-agenda/bloqueios')
      .auth(contexto.token(role), { type: 'bearer' }).send({ data: '2030-10-21' }).expect(403);
    await request(contexto.app.getHttpServer()).delete(`/api/minha-agenda/bloqueios/${ID}`)
      .auth(contexto.token(role), { type: 'bearer' }).expect(403);
    expect(service.consultar).not.toHaveBeenCalled();
  });

  it('consulta só o profissional identificado pelo token e exige a data', async () => {
    await request(contexto.app.getHttpServer()).get('/api/minha-agenda')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).expect(400);
    await request(contexto.app.getHttpServer()).get('/api/minha-agenda?data=2030-13-99')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).expect(400);
    await request(contexto.app.getHttpServer()).get('/api/minha-agenda?data=2030-10-21')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).expect(200);
    expect(service.consultar).toHaveBeenCalledWith(ID, '2030-10-21');
  });

  it('cria e remove bloqueios do profissional do token', async () => {
    const dto = { data: '2030-10-21', horaInicio: '09:00', horaFim: '09:30', motivo: 'Almoço' };
    await request(contexto.app.getHttpServer()).post('/api/minha-agenda/bloqueios')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).send(dto).expect(201);
    expect(service.criarBloqueio).toHaveBeenCalledWith(ID, dto);
    await request(contexto.app.getHttpServer()).delete(`/api/minha-agenda/bloqueios/${ID}`)
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).expect(204);
    expect(service.removerBloqueio).toHaveBeenCalledWith(ID, ID);
  });

  it('lista e cadastra bloqueio para dia inteiro com o usuário do token', async () => {
    await request(contexto.app.getHttpServer()).get('/api/minha-agenda/bloqueios')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).expect(200);
    expect(service.listarBloqueios).toHaveBeenCalledWith(ID);
    await request(contexto.app.getHttpServer()).post('/api/minha-agenda/bloqueios')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' })
      .send({ data: '2030-10-21', motivo: 'Folga' }).expect(201);
    expect(service.criarBloqueio).toHaveBeenCalledWith(ID, { data: '2030-10-21', motivo: 'Folga' });
  });

  const disponibilidade = { diaSemana: 1, horaInicio: '09:00', horaFim: '18:00' };

  it.each([Role.CLIENTE, Role.GESTOR])('não permite que %s gerencie disponibilidades', async (role) => {
    const servidor = contexto.app.getHttpServer();
    await request(servidor).get('/api/minha-agenda/disponibilidades')
      .auth(contexto.token(role), { type: 'bearer' }).expect(403);
    await request(servidor).post('/api/minha-agenda/disponibilidades')
      .auth(contexto.token(role), { type: 'bearer' }).send(disponibilidade).expect(403);
    await request(servidor).delete(`/api/minha-agenda/disponibilidades/${ID}`)
      .auth(contexto.token(role), { type: 'bearer' }).expect(403);
    expect(service.listarDisponibilidades).not.toHaveBeenCalled();
    expect(service.criarDisponibilidade).not.toHaveBeenCalled();
    expect(service.removerDisponibilidade).not.toHaveBeenCalled();
  });

  it('devolve 400 com a mensagem quando o horário desrespeita as regras', async () => {
    service.criarDisponibilidade.mockRejectedValueOnce(
      new BadRequestException('O horário precisa estar dentro do funcionamento do estabelecimento (08:00 às 19:00).'),
    );
    const resposta = await request(contexto.app.getHttpServer()).post('/api/minha-agenda/disponibilidades')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).send(disponibilidade).expect(400);
    expect(resposta.body.message).toBe('O horário precisa estar dentro do funcionamento do estabelecimento (08:00 às 19:00).');
  });

  it('lista, cadastra e remove disponibilidades do profissional do token', async () => {
    const servidor = contexto.app.getHttpServer();
    await request(servidor).get('/api/minha-agenda/disponibilidades')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).expect(200);
    expect(service.listarDisponibilidades).toHaveBeenCalledWith(ID);
    await request(servidor).post('/api/minha-agenda/disponibilidades')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).send(disponibilidade).expect(201);
    expect(service.criarDisponibilidade).toHaveBeenCalledWith(ID, disponibilidade);
    await request(servidor).delete(`/api/minha-agenda/disponibilidades/${ID}`)
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' }).expect(204);
    expect(service.removerDisponibilidade).toHaveBeenCalledWith(ID, ID);
  });

  it.each([
    ['diaSemana', 7],
    ['horaInicio', '24:00'],
    ['horaFim', '9h'],
  ])('rejeita disponibilidade com %s inválido sem chamar o service', async (campo, valor) => {
    await request(contexto.app.getHttpServer()).post('/api/minha-agenda/disponibilidades')
      .auth(contexto.token(Role.PROFISSIONAL), { type: 'bearer' })
      .send({ ...disponibilidade, [campo]: valor }).expect(400);
    expect(service.criarDisponibilidade).not.toHaveBeenCalled();
  });
});
