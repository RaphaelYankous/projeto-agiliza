import { NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { NotificacoesController } from '../src/notificacoes/notificacoes.controller.js';
import { NotificacoesService } from '../src/notificacoes/notificacoes.service.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { ID } from './helpers/fixtures.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe('Notificações — HTTP', () => {
  const service = { listar: vi.fn(), marcarComoLida: vi.fn() };
  let contexto: AppTeste;

  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [NotificacoesController],
      providers: [{ provide: NotificacoesService, useValue: service }],
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    service.listar.mockResolvedValue([
      {
        id: 'n1',
        tipo: 'agendamento_criado',
        titulo: 'Novo agendamento',
        mensagem: 'Corte foi criado.',
        lida: false,
        criadaEm: '2030-10-20T08:00:00.000Z',
      },
    ]);
    service.marcarComoLida.mockResolvedValue(undefined);
  });
  afterAll(async () => contexto?.app.close());

  testarRotasProtegidas(
    () => contexto,
    [
      { metodo: 'get', caminho: '/api/notificacoes' },
      { metodo: 'patch', caminho: '/api/notificacoes/n1/lida' },
    ],
  );

  it.each([Role.CLIENTE, Role.PROFISSIONAL, Role.GESTOR])(
    'GET lista as notificações do usuário do token (%s)',
    async (perfil) => {
      const resposta = await request(contexto.app.getHttpServer())
        .get('/api/notificacoes')
        .auth(contexto.token(perfil, 'usuario-do-token'), { type: 'bearer' })
        .expect(200);

      expect(resposta.body).toEqual([expect.objectContaining({ id: 'n1', lida: false })]);
      expect(service.listar).toHaveBeenCalledWith('usuario-do-token');
    },
  );

  it('PATCH /:id/lida marca a notificação do usuário do token e responde 204 sem corpo', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .patch('/api/notificacoes/n1/lida')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(204);

    expect(resposta.body).toEqual({});
    expect(service.marcarComoLida).toHaveBeenCalledWith(ID, 'n1');
  });

  it('PATCH /:id/lida responde 404 quando a notificação não é do usuário', async () => {
    service.marcarComoLida.mockRejectedValueOnce(
      new NotFoundException('Notificação não encontrada.'),
    );

    const resposta = await request(contexto.app.getHttpServer())
      .patch('/api/notificacoes/de-outro/lida')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(404);

    expect(resposta.body.message).toBe('Notificação não encontrada.');
  });
});
