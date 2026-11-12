import request from 'supertest';
import { PerfilProfissionalController } from '../src/perfil-profissional/perfil-profissional.controller.js';
import { PerfilProfissionalService } from '../src/perfil-profissional/perfil-profissional.service.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { ID } from './helpers/fixtures.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe('Perfil profissional — HTTP', () => {
  const service = { consultar: vi.fn(), atualizar: vi.fn(), atualizarFoto: vi.fn(), avaliacoes: vi.fn() };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64');
  let contexto: AppTeste;
  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [PerfilProfissionalController],
      providers: [{ provide: PerfilProfissionalService, useValue: service }],
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    service.consultar.mockResolvedValue({ nome: 'Roberto', servicos: [] });
    service.atualizar.mockResolvedValue({ nome: 'Ana', sobrenome: 'Silva' });
    service.atualizarFoto.mockResolvedValue({ foto: 'data:image/png;base64,imagem' });
    service.avaliacoes.mockResolvedValue({ media: null, quantidade: 0, avaliacoes: [] });
  });
  afterAll(async () => contexto?.app.close());

  const rota = '/api/meu-perfil-profissional';
  testarRotasProtegidas(() => contexto, [
    { metodo: 'get', caminho: rota }, { metodo: 'patch', caminho: rota },
    { metodo: 'patch', caminho: `${rota}/foto` },
    { metodo: 'get', caminho: `${rota}/avaliacoes` },
  ]);

  it.each([Role.CLIENTE, Role.GESTOR])('nega acesso de %s a todas as opções', async (role) => {
    for (const caminho of [rota, `${rota}/avaliacoes`]) {
      await request(contexto.app.getHttpServer()).get(caminho)
        .auth(contexto.token(role), { type: 'bearer' }).expect(403);
    }
    await request(contexto.app.getHttpServer()).patch(rota)
      .auth(contexto.token(role), { type: 'bearer' }).send({ nome: 'A', sobrenome: 'B' }).expect(403);
    await request(contexto.app.getHttpServer()).patch(`${rota}/foto`)
      .auth(contexto.token(role), { type: 'bearer' }).attach('foto', png, { filename: 'foto.png', contentType: 'image/png' }).expect(403);
    expect(service.consultar).not.toHaveBeenCalled();
  });

  it('consulta o perfil e avaliações de quem está no token', async () => {
    const auth = contexto.token(Role.PROFISSIONAL);
    await request(contexto.app.getHttpServer()).get(rota).auth(auth, { type: 'bearer' }).expect(200);
    await request(contexto.app.getHttpServer()).get(`${rota}/avaliacoes`).auth(auth, { type: 'bearer' }).expect(200);
    expect(service.consultar).toHaveBeenCalledWith(ID);
    expect(service.avaliacoes).toHaveBeenCalledWith(ID);
  });

  it('valida o nome antes de atualizar', async () => {
    const auth = contexto.token(Role.PROFISSIONAL);
    await request(contexto.app.getHttpServer()).patch(rota).auth(auth, { type: 'bearer' })
      .send({ nome: '', sobrenome: 'Silva' }).expect(400);
    expect(service.atualizar).not.toHaveBeenCalled();
  });

  it('atualiza somente com o id do titular vindo do token', async () => {
    const auth = contexto.token(Role.PROFISSIONAL);
    await request(contexto.app.getHttpServer()).patch(rota).auth(auth, { type: 'bearer' })
      .send({ nome: 'Ana', sobrenome: 'Silva' }).expect(200);
    expect(service.atualizar).toHaveBeenCalledWith(ID, { nome: 'Ana', sobrenome: 'Silva' });
  });

  it('recebe foto multipart do profissional logado e rejeita arquivo ausente ou grande', async () => {
    const auth = contexto.token(Role.PROFISSIONAL);
    await request(contexto.app.getHttpServer()).patch(`${rota}/foto`)
      .auth(auth, { type: 'bearer' }).expect(400);
    const resposta = await request(contexto.app.getHttpServer()).patch(`${rota}/foto`)
      .auth(auth, { type: 'bearer' }).attach('foto', png, { filename: 'foto.png', contentType: 'image/png' }).expect(200);
    expect(resposta.body.foto).toMatch(/^data:image\/png;base64,/);
    expect(service.atualizarFoto).toHaveBeenCalledWith(ID, expect.objectContaining({
      buffer: png, mimetype: 'image/png', size: png.length,
    }));
    await request(contexto.app.getHttpServer()).patch(`${rota}/foto`)
      .auth(auth, { type: 'bearer' })
      .attach('foto', Buffer.alloc(2 * 1024 * 1024 + 1), { filename: 'grande.png', contentType: 'image/png' })
      .expect(413);
  });
});
