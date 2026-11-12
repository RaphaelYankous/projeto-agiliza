import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Agendamento, StatusAgendamento } from '../src/agendamentos/entities/agendamento.entity.js';
import { AvaliacoesClienteController } from '../src/avaliacoes/avaliacoes-cliente.controller.js';
import { AvaliacoesClienteService } from '../src/avaliacoes/avaliacoes-cliente.service.js';
import { Avaliacao } from '../src/avaliacoes/schemas/avaliacao.schema.js';
import { AvaliacaoVinculo } from '../src/avaliacoes/schemas/avaliacao-vinculo.schema.js';
import { Cliente } from '../src/clientes/entities/cliente.entity.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { ID, OBJECT_ID } from './helpers/fixtures.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

const PROFISSIONAL_ID = '9d5e3c52-1a4f-4b3b-8f0e-6a1f2c3d4e5f';
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32)]);
const ROTA = `/api/avaliacoes/agendamento/${ID}`;
const MINHAS = '/api/avaliacoes/cliente/minhas';
const FOTO = `/api/avaliacoes/agendamento/${ID}/foto`;

describe('Avaliações do cliente — HTTP', () => {
  let contexto: AppTeste;
  const clientes = { findOne: vi.fn() };
  const agendamentos = { findOne: vi.fn() };
  const avaliacaoModel = { exists: vi.fn(), create: vi.fn(), find: vi.fn() };
  const vinculoModel = {
    create: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const concluido = () =>
    Object.assign(new Agendamento(), {
      id: ID,
      clienteId: ID,
      profissionalId: PROFISSIONAL_ID,
      status: StatusAgendamento.CONCLUIDO,
    });
  const comoCliente = () => contexto.token(Role.CLIENTE);

  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [AvaliacoesClienteController],
      providers: [
        AvaliacoesClienteService,
        { provide: getRepositoryToken(Cliente), useValue: clientes },
        { provide: getRepositoryToken(Agendamento), useValue: agendamentos },
        { provide: getModelToken(Avaliacao.name), useValue: avaliacaoModel },
        { provide: getModelToken(AvaliacaoVinculo.name), useValue: vinculoModel },
      ],
    });
  });
  beforeEach(() => {
    vi.resetAllMocks();
    clientes.findOne.mockResolvedValue({ id: ID });
    agendamentos.findOne.mockResolvedValue(concluido());
    avaliacaoModel.exists.mockResolvedValue(null);
    avaliacaoModel.create.mockImplementation(async (dados: object) => ({ _id: OBJECT_ID, ...dados }));
    avaliacaoModel.find.mockReturnValue({
      exec: async () => [{ agendamentoId: ID, nota: 5, comentario: 'não deve vazar' }],
    });
    vinculoModel.create.mockResolvedValue({});
    vinculoModel.updateOne.mockResolvedValue({});
    vinculoModel.deleteOne.mockResolvedValue({});
    vinculoModel.find.mockReturnValue({ exec: async () => [{ agendamentoId: ID }] });
    vinculoModel.findOne.mockReturnValue({ select: () => ({ exec: async () => ({ foto: PNG }) }) });
  });
  afterAll(async () => contexto?.app.close());

  testarRotasProtegidas(
    () => contexto,
    [
      { metodo: 'post', caminho: ROTA },
      { metodo: 'get', caminho: MINHAS },
      { metodo: 'get', caminho: FOTO },
    ],
  );

  it.each([Role.GESTOR, Role.PROFISSIONAL])('nega as duas rotas ao perfil %s', async (role) => {
    const servidor = contexto.app.getHttpServer();
    await request(servidor).post(ROTA).auth(contexto.token(role), { type: 'bearer' }).send({ nota: 5 }).expect(403);
    await request(servidor).get(MINHAS).auth(contexto.token(role), { type: 'bearer' }).expect(403);
    await request(servidor).get(FOTO).auth(contexto.token(role), { type: 'bearer' }).expect(403);
    expect(vinculoModel.create).not.toHaveBeenCalled();
  });

  it('POST com JSON retorna 201 e ignora campos extras como clienteId e profissionalId', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post(ROTA)
      .auth(comoCliente(), { type: 'bearer' })
      .send({ nota: 5, comentario: 'Ótimo', clienteId: 'outro', profissionalId: 'outro' })
      .expect(201);
    expect(resposta.body).toEqual({
      id: OBJECT_ID,
      agendamentoId: ID,
      nota: 5,
      comentario: 'Ótimo',
      temFoto: false,
    });
    expect(avaliacaoModel.create).toHaveBeenCalledWith({
      clienteId: ID,
      profissionalId: PROFISSIONAL_ID,
      agendamentoId: ID,
      nota: 5,
      comentario: 'Ótimo',
    });
  });

  it('POST multipart com foto retorna 201 e guarda a foto no vínculo', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post(ROTA)
      .auth(comoCliente(), { type: 'bearer' })
      .field('nota', '4')
      .field('comentario', 'Gostei')
      .attach('foto', PNG, { filename: 'foto.png', contentType: 'image/png' })
      .expect(201);
    expect(resposta.body).toMatchObject({ nota: 4, comentario: 'Gostei', temFoto: true });
    expect(vinculoModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ agendamentoId: ID, foto: expect.any(Buffer) }),
    );
  });

  it.each([0, 6, 2.5, 'abc'])('POST rejeita nota %j com 400', async (nota) => {
    await request(contexto.app.getHttpServer())
      .post(ROTA)
      .auth(comoCliente(), { type: 'bearer' })
      .send({ nota })
      .expect(400);
    expect(vinculoModel.create).not.toHaveBeenCalled();
  });

  it('POST rejeita corpo sem nota e comentário com mais de 500 caracteres', async () => {
    const servidor = contexto.app.getHttpServer();
    await request(servidor).post(ROTA).auth(comoCliente(), { type: 'bearer' }).send({}).expect(400);
    await request(servidor)
      .post(ROTA)
      .auth(comoCliente(), { type: 'bearer' })
      .send({ nota: 5, comentario: 'a'.repeat(501) })
      .expect(400);
  });

  it('POST rejeita arquivo que não é imagem mesmo com mimetype de imagem', async () => {
    await request(contexto.app.getHttpServer())
      .post(ROTA)
      .auth(comoCliente(), { type: 'bearer' })
      .field('nota', '5')
      .attach('foto', Buffer.from('texto qualquer'), { filename: 'falsa.png', contentType: 'image/png' })
      .expect(400);
    expect(vinculoModel.create).not.toHaveBeenCalled();
  });

  it('POST rejeita foto acima do limite do upload', async () => {
    await request(contexto.app.getHttpServer())
      .post(ROTA)
      .auth(comoCliente(), { type: 'bearer' })
      .field('nota', '5')
      .attach('foto', Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]), {
        filename: 'grande.png',
        contentType: 'image/png',
      })
      .expect(413);
  });

  it('POST retorna 404 para agendamento inexistente e 403 para o de outro cliente', async () => {
    const servidor = contexto.app.getHttpServer();
    agendamentos.findOne.mockResolvedValueOnce(null);
    await request(servidor).post(ROTA).auth(comoCliente(), { type: 'bearer' }).send({ nota: 5 }).expect(404);
    agendamentos.findOne.mockResolvedValueOnce(Object.assign(concluido(), { clienteId: 'outro' }));
    await request(servidor).post(ROTA).auth(comoCliente(), { type: 'bearer' }).send({ nota: 5 }).expect(403);
    expect(vinculoModel.create).not.toHaveBeenCalled();
  });

  it('POST retorna 409 se o atendimento não foi concluído', async () => {
    agendamentos.findOne.mockResolvedValueOnce(
      Object.assign(concluido(), { status: StatusAgendamento.CONFIRMADO }),
    );
    const resposta = await request(contexto.app.getHttpServer())
      .post(ROTA)
      .auth(comoCliente(), { type: 'bearer' })
      .send({ nota: 5 })
      .expect(409);
    expect(resposta.body.message).toBe('Só é possível avaliar atendimentos concluídos.');
  });

  it('POST retorna 409 na segunda tentativa (já avaliado) e no envio simultâneo', async () => {
    const servidor = contexto.app.getHttpServer();
    avaliacaoModel.exists.mockResolvedValueOnce({ _id: OBJECT_ID });
    const repetida = await request(servidor)
      .post(ROTA)
      .auth(comoCliente(), { type: 'bearer' })
      .send({ nota: 5 })
      .expect(409);
    expect(repetida.body.message).toBe('Este atendimento já foi avaliado.');

    vinculoModel.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));
    await request(servidor).post(ROTA).auth(comoCliente(), { type: 'bearer' }).send({ nota: 5 }).expect(409);
    expect(avaliacaoModel.create).not.toHaveBeenCalled();
  });

  it('POST: erro do banco retorna 500 sem detalhes e libera o vínculo', async () => {
    avaliacaoModel.create.mockRejectedValueOnce(new Error('MongoDB indisponível'));
    const resposta = await request(contexto.app.getHttpServer())
      .post(ROTA)
      .auth(comoCliente(), { type: 'bearer' })
      .send({ nota: 5 })
      .expect(500);
    expect(resposta.body).toEqual({ statusCode: 500, message: 'Internal server error' });
    expect(vinculoModel.deleteOne).toHaveBeenCalledWith({ agendamentoId: ID });
  });

  it('GET /minhas lista nota, comentário e temFoto do cliente do token, sem a foto', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(MINHAS)
      .auth(comoCliente(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual([
      { agendamentoId: ID, nota: 5, comentario: 'não deve vazar', temFoto: true },
    ]);
    expect(avaliacaoModel.find).toHaveBeenCalledWith(
      { clienteId: ID },
      { agendamentoId: 1, nota: 1, comentario: 1 },
    );
  });

  it('GET /minhas retorna 404 se o usuário não tem cadastro de cliente', async () => {
    clientes.findOne.mockResolvedValueOnce(null);
    await request(contexto.app.getHttpServer())
      .get(MINHAS)
      .auth(comoCliente(), { type: 'bearer' })
      .expect(404);
  });

  it('GET /foto devolve a imagem com o tipo correto e cache privado', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(FOTO)
      .auth(comoCliente(), { type: 'bearer' })
      .expect(200);
    expect(resposta.headers['content-type']).toBe('image/png');
    expect(resposta.headers['cache-control']).toBe('private, max-age=300');
    expect(Buffer.compare(resposta.body, PNG)).toBe(0);
    expect(vinculoModel.findOne).toHaveBeenCalledWith({ agendamentoId: ID, clienteId: ID });
  });

  it('GET /foto retorna 404 se não há foto ou a avaliação é de outro cliente', async () => {
    vinculoModel.findOne.mockReturnValueOnce({ select: () => ({ exec: async () => null }) });
    await request(contexto.app.getHttpServer())
      .get(FOTO)
      .auth(comoCliente(), { type: 'bearer' })
      .expect(404);
  });
});
