import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Avaliacao } from '../src/avaliacoes/schemas/avaliacao.schema.js';
import { EstabelecimentosController } from '../src/estabelecimentos/estabelecimentos.controller.js';
import { EstabelecimentosService } from '../src/estabelecimentos/estabelecimentos.service.js';
import { Estabelecimento } from '../src/estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from '../src/profissionais/entities/profissional.entity.js';
import { Servico } from '../src/servicos/entities/servico.entity.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { estabelecimento, ESTABELECIMENTO_ID, ID } from './helpers/fixtures.js';
import { repositoryMock } from './helpers/mocks.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe('Estabelecimentos do gestor logado — HTTP', () => {
  let contexto: AppTeste;
  const repository = repositoryMock(estabelecimento());
  const rota = '/api/estabelecimentos/meus';

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

  testarRotasProtegidas(() => contexto, [{ metodo: 'get', caminho: rota }]);

  it.each([Role.CLIENTE, Role.PROFISSIONAL])('retorna 403 para o perfil %s', async (perfil) => {
    await request(contexto.app.getHttpServer())
      .get(rota)
      .auth(contexto.token(perfil), { type: 'bearer' })
      .expect(403);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('retorna os estabelecimentos do gestor do token', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(rota)
      .auth(contexto.token(Role.GESTOR, ID), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual([expect.objectContaining({ id: ESTABELECIMENTO_ID })]);
    expect(repository.find).toHaveBeenCalledWith({ where: { gestorId: ID } });
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('retorna [] quando o gestor não tem estabelecimento', async () => {
    repository.find.mockResolvedValueOnce([]);
    const resposta = await request(contexto.app.getHttpServer())
      .get(rota)
      .auth(contexto.token(Role.GESTOR, ID), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual([]);
  });
});
