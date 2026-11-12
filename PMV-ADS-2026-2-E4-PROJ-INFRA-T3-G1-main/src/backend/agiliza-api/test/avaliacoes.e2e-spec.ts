import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { AvaliacoesController } from '../src/avaliacoes/avaliacoes.controller.js';
import { AvaliacoesService } from '../src/avaliacoes/avaliacoes.service.js';
import { Avaliacao } from '../src/avaliacoes/schemas/avaliacao.schema.js';
import { dadosAvaliacao, OBJECT_ID } from './helpers/fixtures.js';
import { modelMock } from './helpers/mocks.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe('Avaliações — HTTP', () => {
  const documento = { _id: OBJECT_ID, ...dadosAvaliacao };
  let contexto: AppTeste;
  let mocks = modelMock(documento);
  const model = mocks.model;
  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [AvaliacoesController],
      providers: [AvaliacoesService, { provide: getModelToken(Avaliacao.name), useValue: model }],
    });
  });
  beforeEach(() => {
    mocks = modelMock(documento);
    Object.assign(model, {
      find: mocks.model.find,
      findById: mocks.model.findById,
      findByIdAndUpdate: mocks.model.findByIdAndUpdate,
      findByIdAndDelete: mocks.model.findByIdAndDelete,
    });
    model.mockClear();
    model.mockImplementation(mocks.model.getMockImplementation()!);
  });
  afterAll(async () => contexto?.app.close());
  testarRotasProtegidas(
    () => contexto,
    [
      { metodo: 'post', caminho: '/api/avaliacoes' },
      { metodo: 'get', caminho: '/api/avaliacoes' },
      { metodo: 'get', caminho: `/api/avaliacoes/${OBJECT_ID}` },
      { metodo: 'patch', caminho: `/api/avaliacoes/${OBJECT_ID}` },
      { metodo: 'delete', caminho: `/api/avaliacoes/${OBJECT_ID}` },
    ],
  );

  it('POST retorna 201 com a avaliação', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post('/api/avaliacoes')
      .auth(contexto.token(), { type: 'bearer' })
      .send(dadosAvaliacao)
      .expect(201);
    expect(resposta.body).toEqual(documento);
    expect(model).toHaveBeenCalledWith(dadosAvaliacao);
  });

  it.each([0, 6, '5'])('POST rejeita nota %j', async (nota) => {
    await request(contexto.app.getHttpServer())
      .post('/api/avaliacoes')
      .auth(contexto.token(), { type: 'bearer' })
      .send({ ...dadosAvaliacao, nota })
      .expect(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('GET retorna lista ordenada e aceita resultado vazio', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get('/api/avaliacoes')
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual([documento]);
    expect(mocks.listagem.sort).toHaveBeenCalledWith({ createdAt: -1 });
    mocks.listagem.exec.mockResolvedValueOnce([]);
    const vazia = await request(contexto.app.getHttpServer())
      .get('/api/avaliacoes')
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(vazia.body).toEqual([]);
  });

  it('GET /:id retorna avaliação encontrada', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(`/api/avaliacoes/${OBJECT_ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual(documento);
  });

  it('PATCH retorna a nota atualizada', async () => {
    mocks.atualizacao.exec.mockResolvedValueOnce({ ...documento, nota: 4 });
    const resposta = await request(contexto.app.getHttpServer())
      .patch(`/api/avaliacoes/${OBJECT_ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ nota: 4 })
      .expect(200);
    expect(resposta.body).toEqual({ ...documento, nota: 4 });
  });

  it('PATCH rejeita nota fora dos limites', async () => {
    await request(contexto.app.getHttpServer())
      .patch(`/api/avaliacoes/${OBJECT_ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ nota: 0 })
      .expect(400);
    expect(mocks.model.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch', 'delete'] as const)(
    '%s retorna 404 para avaliação ausente',
    async (metodo) => {
      mocks.busca.exec.mockResolvedValueOnce(null);
      mocks.atualizacao.exec.mockResolvedValueOnce(null);
      mocks.exclusao.exec.mockResolvedValueOnce(null);
      await request(contexto.app.getHttpServer())
        [metodo](`/api/avaliacoes/${OBJECT_ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .send({})
        .expect(404);
    },
  );

  it('DELETE retorna 200 com confirmação, conforme contrato atual', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .delete(`/api/avaliacoes/${OBJECT_ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual({ deleted: true });
  });

  it('erro do model retorna 500 sem detalhes internos', async () => {
    mocks.save.mockRejectedValueOnce(new Error('MongoDB indisponível'));
    const resposta = await request(contexto.app.getHttpServer())
      .post('/api/avaliacoes')
      .auth(contexto.token(), { type: 'bearer' })
      .send(dadosAvaliacao)
      .expect(500);
    expect(resposta.body).toEqual({ statusCode: 500, message: 'Internal server error' });
  });
});
