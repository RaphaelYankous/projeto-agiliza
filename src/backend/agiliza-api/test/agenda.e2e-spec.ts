import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AgendasController } from '../src/agenda/agenda.controller.js';
import { AgendasService } from '../src/agenda/agenda.service.js';
import { DisponibilidadeProfissional } from '../src/agenda/entities/disponibilidade-profissional.entity.js';
import { BloqueioAgenda } from '../src/agenda/entities/bloqueio-agenda.entity.js';
import { Agendamento } from '../src/agendamentos/entities/agendamento.entity.js';
import { Servico } from '../src/servicos/entities/servico.entity.js';
import { Estabelecimento } from '../src/estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from '../src/profissionais/entities/profissional.entity.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { ID } from './helpers/fixtures.js';
import { repositoryMock } from './helpers/mocks.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe('Agenda — HTTP', () => {
  const disponibilidadeDto = { diaSemana: 1, horaInicio: '09:00', horaFim: '11:00' };
  const bloqueioDto = { data: '2030-10-21' };
  const disponibilidades = repositoryMock(
    Object.assign(new DisponibilidadeProfissional(), {
      ...disponibilidadeDto,
      id: ID,
      profissionalId: ID,
      ativo: true,
    }),
  );
  const bloqueios = repositoryMock(
    Object.assign(new BloqueioAgenda(), { ...bloqueioDto, id: ID, profissionalId: ID }),
  );
  const servicos = repositoryMock(
    Object.assign(new Servico(), { id: ID, duracao: 40, estabelecimentoId: ID }),
  );
  const estabelecimentos = repositoryMock(
    Object.assign(new Estabelecimento(), {
      id: ID,
      gestorId: ID,
      horarioAbertura: '08:00:00',
      horarioFechamento: '19:00:00',
    }),
  );
  const profissionais = repositoryMock(
    Object.assign(new Profissional(), { id: ID, estabelecimentoId: ID }),
  );
  const OUTRO_GESTOR = '3b8c6a1e-5f4d-4b2a-9c7e-1d2f3a4b5c6d';
  const query = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getMany: vi.fn(async () => []),
  };
  let contexto: AppTeste;
  const rotaDisponibilidades = `/api/profissionais/${ID}/disponibilidades`;
  const rotaBloqueios = `/api/profissionais/${ID}/bloqueios`;
  const rotaHorarios = `/api/profissionais/${ID}/horarios-disponiveis`;

  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [AgendasController],
      providers: [
        AgendasService,
        { provide: getRepositoryToken(DisponibilidadeProfissional), useValue: disponibilidades },
        { provide: getRepositoryToken(BloqueioAgenda), useValue: bloqueios },
        { provide: getRepositoryToken(Servico), useValue: servicos },
        { provide: getRepositoryToken(Estabelecimento), useValue: estabelecimentos },
        { provide: getRepositoryToken(Profissional), useValue: profissionais },
        { provide: getRepositoryToken(Agendamento), useValue: { createQueryBuilder: () => query } },
      ],
    });
  });
  beforeEach(() => {
    Object.assign(
      disponibilidades,
      repositoryMock(
        Object.assign(new DisponibilidadeProfissional(), {
          ...disponibilidadeDto,
          id: ID,
          profissionalId: ID,
          ativo: true,
        }),
      ),
    );
    Object.assign(
      bloqueios,
      repositoryMock(
        Object.assign(new BloqueioAgenda(), { ...bloqueioDto, id: ID, profissionalId: ID }),
      ),
    );
    Object.assign(
      servicos,
      repositoryMock(Object.assign(new Servico(), { id: ID, duracao: 40, estabelecimentoId: ID })),
    );
    query.getMany.mockReset().mockResolvedValue([]);
    Object.assign(
      profissionais,
      repositoryMock(Object.assign(new Profissional(), { id: ID, estabelecimentoId: ID })),
    );
  });
  afterAll(async () => contexto?.app.close());

  testarRotasProtegidas(
    () => contexto,
    [
      { metodo: 'post', caminho: rotaDisponibilidades },
      { metodo: 'get', caminho: rotaDisponibilidades },
      { metodo: 'patch', caminho: `/api/disponibilidades/${ID}` },
      { metodo: 'delete', caminho: `/api/disponibilidades/${ID}` },
      { metodo: 'post', caminho: rotaBloqueios },
      { metodo: 'get', caminho: rotaBloqueios },
      { metodo: 'delete', caminho: `/api/bloqueios/${ID}` },
      { metodo: 'get', caminho: rotaHorarios },
    ],
  );

  it('POST disponibilidade retorna 201 vinculando o profissional da URL', async () => {
    disponibilidades.find.mockResolvedValueOnce([]);
    const resposta = await request(contexto.app.getHttpServer())
      .post(rotaDisponibilidades)
      .auth(contexto.token(), { type: 'bearer' })
      .send(disponibilidadeDto)
      .expect(201);
    expect(resposta.body).toMatchObject({ ...disponibilidadeDto, profissionalId: ID });
  });

  it.each([
    ['diaSemana', 7],
    ['horaInicio', '24:00'],
    ['horaFim', '12:60'],
  ])('POST disponibilidade rejeita %s inválido', async (campo, valor) => {
    await request(contexto.app.getHttpServer())
      .post(rotaDisponibilidades)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ ...disponibilidadeDto, [campo]: valor })
      .expect(400);
    expect(disponibilidades.save).not.toHaveBeenCalled();
  });

  it('GET disponibilidades retorna registros em consulta ordenada', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(rotaDisponibilidades)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toHaveLength(1);
    expect(disponibilidades.find).toHaveBeenCalledWith({
      where: { profissionalId: ID },
      order: { diaSemana: 'ASC', horaInicio: 'ASC' },
    });
  });

  it('PATCH disponibilidade desativa sem alterar horários', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .patch(`/api/disponibilidades/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ ativo: false })
      .expect(200);
    expect(resposta.body).toMatchObject({ ...disponibilidadeDto, ativo: false });
  });

  it.each([
    [
      { horaInicio: '11:00', horaFim: '10:00' },
      'O horário final precisa ser posterior ao horário inicial.',
    ],
    [
      { horaInicio: '18:00', horaFim: '20:00' },
      'O horário precisa estar dentro do funcionamento do estabelecimento (08:00 às 19:00).',
    ],
    [
      { horaInicio: '10:00', horaFim: '12:00' },
      'Este horário se sobrepõe a outro já cadastrado na segunda-feira (09:00 às 11:00).',
    ],
  ])('POST disponibilidade recusa %o com 400 e a mensagem', async (horas, mensagem) => {
    const resposta = await request(contexto.app.getHttpServer())
      .post(rotaDisponibilidades)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ diaSemana: 1, ...horas })
      .expect(400);
    expect(resposta.body.message).toBe(mensagem);
    expect(disponibilidades.save).not.toHaveBeenCalled();
  });

  it('PATCH disponibilidade recusa horário que passa a sobrepor outro do mesmo dia', async () => {
    disponibilidades.find.mockResolvedValueOnce([
      Object.assign(new DisponibilidadeProfissional(), {
        id: 'outro',
        diaSemana: 1,
        horaInicio: '12:00:00',
        horaFim: '14:00:00',
      }),
    ]);
    const resposta = await request(contexto.app.getHttpServer())
      .patch(`/api/disponibilidades/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ horaFim: '13:00' })
      .expect(400);
    expect(resposta.body.message).toBe(
      'Este horário se sobrepõe a outro já cadastrado na segunda-feira (12:00 às 14:00).',
    );
  });

  it('PATCH só de ativo funciona num horário antigo fora do funcionamento', async () => {
    disponibilidades.findOneBy.mockResolvedValueOnce(
      Object.assign(new DisponibilidadeProfissional(), {
        id: ID,
        profissionalId: ID,
        diaSemana: 1,
        horaInicio: '06:00:00',
        horaFim: '21:00:00',
        ativo: true,
      }),
    );
    const resposta = await request(contexto.app.getHttpServer())
      .patch(`/api/disponibilidades/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ ativo: false })
      .expect(200);
    expect(resposta.body).toMatchObject({ ativo: false, horaInicio: '06:00:00' });
  });

  it('PATCH disponibilidade rejeita horário malformado', async () => {
    await request(contexto.app.getHttpServer())
      .patch(`/api/disponibilidades/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ horaFim: '24:00' })
      .expect(400);
    expect(disponibilidades.save).not.toHaveBeenCalled();
  });

  it('PATCH disponibilidade retorna 404 para recurso ausente', async () => {
    disponibilidades.findOneBy.mockResolvedValueOnce(null);
    await request(contexto.app.getHttpServer())
      .patch(`/api/disponibilidades/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ ativo: false })
      .expect(404);
  });

  it('DELETE disponibilidade retorna 204 sem body', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .delete(`/api/disponibilidades/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(204);
    expect(resposta.text).toBe('');
  });

  it('DELETE disponibilidade retorna 404 para recurso ausente', async () => {
    disponibilidades.findOneBy.mockResolvedValueOnce(null);
    await request(contexto.app.getHttpServer())
      .delete(`/api/disponibilidades/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(404);
  });

  it('POST bloqueio de dia inteiro retorna 201', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post(rotaBloqueios)
      .auth(contexto.token(), { type: 'bearer' })
      .send(bloqueioDto)
      .expect(201);
    expect(resposta.body).toMatchObject({ ...bloqueioDto, profissionalId: ID });
  });

  it('POST bloqueio parcial preserva os horários enviados', async () => {
    const dto = { ...bloqueioDto, horaInicio: '13:00', horaFim: '14:00', motivo: 'Consulta' };
    const resposta = await request(contexto.app.getHttpServer())
      .post(rotaBloqueios)
      .auth(contexto.token(), { type: 'bearer' })
      .send(dto)
      .expect(201);
    expect(resposta.body).toMatchObject(dto);
  });

  it('POST bloqueio rejeita data inválida', async () => {
    await request(contexto.app.getHttpServer())
      .post(rotaBloqueios)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ data: 'invalida' })
      .expect(400);
    expect(bloqueios.save).not.toHaveBeenCalled();
  });

  it('GET bloqueios retorna lista', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(rotaBloqueios)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toHaveLength(1);
  });

  it('DELETE bloqueio retorna 204 sem body', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .delete(`/api/bloqueios/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(204);
    expect(resposta.text).toBe('');
  });

  it('DELETE bloqueio retorna 404 para recurso ausente', async () => {
    bloqueios.findOneBy.mockResolvedValueOnce(null);
    await request(contexto.app.getHttpServer())
      .delete(`/api/bloqueios/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(404);
  });

  it('GET horários usa a data e o serviço da query para calcular horários de 30 em 30 minutos', async () => {
    bloqueios.find.mockResolvedValueOnce([]);
    const resposta = await request(contexto.app.getHttpServer())
      .get(rotaHorarios)
      .query({ data: '2030-10-21', servicoId: ID })
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual(['09:00', '09:30', '10:00']);
    expect(servicos.findOneBy).toHaveBeenCalledWith({ id: ID });
    expect(estabelecimentos.findOneBy).toHaveBeenCalledWith({ id: ID });
  });

  it('GET horários retorna [] sem disponibilidade', async () => {
    disponibilidades.find.mockResolvedValueOnce([]);
    const resposta = await request(contexto.app.getHttpServer())
      .get(rotaHorarios)
      .query({ data: '2030-10-21', servicoId: ID })
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual([]);
  });

  it('GET horários respeita o horário de funcionamento do estabelecimento', async () => {
    bloqueios.find.mockResolvedValueOnce([]);
    estabelecimentos.findOneBy.mockResolvedValueOnce(
      Object.assign(new Estabelecimento(), {
        horarioAbertura: '09:30:00',
        horarioFechamento: '10:30:00',
      }),
    );
    const resposta = await request(contexto.app.getHttpServer())
      .get(rotaHorarios)
      .query({ data: '2030-10-21', servicoId: ID })
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual(['09:30']);
  });

  it('GET horários retorna 404 para serviço ausente', async () => {
    servicos.findOneBy.mockResolvedValueOnce(null);
    await request(contexto.app.getHttpServer())
      .get(rotaHorarios)
      .query({ data: '2030-10-21', servicoId: ID })
      .auth(contexto.token(), { type: 'bearer' })
      .expect(404);
  });

  const rotasDoGestor = [
    { metodo: 'post', caminho: rotaDisponibilidades, corpo: disponibilidadeDto },
    { metodo: 'patch', caminho: `/api/disponibilidades/${ID}`, corpo: { ativo: false } },
    { metodo: 'delete', caminho: `/api/disponibilidades/${ID}` },
    { metodo: 'post', caminho: rotaBloqueios, corpo: bloqueioDto },
    { metodo: 'get', caminho: rotaBloqueios },
    { metodo: 'delete', caminho: `/api/bloqueios/${ID}` },
  ] as const;

  function chamar(rota: (typeof rotasDoGestor)[number], token: string) {
    const requisicao = request(contexto.app.getHttpServer())
      [rota.metodo](rota.caminho)
      .auth(token, { type: 'bearer' });
    return 'corpo' in rota ? requisicao.send(rota.corpo) : requisicao;
  }

  describe.each(rotasDoGestor)('$metodo $caminho', (rota) => {
    it.each([Role.CLIENTE, Role.PROFISSIONAL])('recusa o perfil %s com 403', async (role) => {
      await chamar(rota, contexto.token(role)).expect(403);
      expect(profissionais.findOne).not.toHaveBeenCalled();
    });

    it('recusa o gestor de outro estabelecimento com 403', async () => {
      const resposta = await chamar(rota, contexto.token(Role.GESTOR, OUTRO_GESTOR)).expect(403);
      expect(resposta.body.message).toBe('Este profissional não pertence ao seu estabelecimento.');
      expect(disponibilidades.save).not.toHaveBeenCalled();
      expect(disponibilidades.delete).not.toHaveBeenCalled();
      expect(bloqueios.save).not.toHaveBeenCalled();
      expect(bloqueios.delete).not.toHaveBeenCalled();
    });

    it('responde 404 quando o profissional não existe', async () => {
      profissionais.findOne.mockResolvedValueOnce(null);
      const resposta = await chamar(rota, contexto.token(Role.GESTOR)).expect(404);
      expect(resposta.body.message).toBe('Profissional não encontrado.');
    });
  });

  it.each([Role.CLIENTE, Role.PROFISSIONAL])(
    'GET disponibilidades e horários continuam abertos para %s',
    async (role) => {
      await request(contexto.app.getHttpServer())
        .get(rotaDisponibilidades)
        .auth(contexto.token(role), { type: 'bearer' })
        .expect(200);
      bloqueios.find.mockResolvedValueOnce([]);
      await request(contexto.app.getHttpServer())
        .get(rotaHorarios)
        .query({ data: '2030-10-21', servicoId: ID })
        .auth(contexto.token(role), { type: 'bearer' })
        .expect(200);
      expect(profissionais.findOne).not.toHaveBeenCalled();
    },
  );
});
