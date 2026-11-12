import bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { UsuariosController } from '../src/usuarios/usuarios.controller.js';
import { UsuariosService } from '../src/usuarios/usuarios.service.js';
import { Usuario, Role } from '../src/usuarios/entities/usuario.entity.js';
import { IsUnique } from '../src/common/validators/isUnique.validator.js';
import { usuario, dadosPessoa, ID } from './helpers/fixtures.js';
import { repositoryMock } from './helpers/mocks.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe('Autenticação e usuários — HTTP', () => {
  let contexto: AppTeste;
  let senhaHash: string;
  const repository = repositoryMock(usuario());
  const query = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getExists: vi.fn(async () => false),
  };

  beforeAll(async () => {
    senhaHash = await bcrypt.hash(dadosPessoa.senha, 4);
    contexto = await criarAppTeste({
      controllers: [AuthController, UsuariosController],
      providers: [
        AuthService,
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useValue: repository },
      ],
    });
  });
  beforeEach(() => {
    Object.assign(repository, repositoryMock(Object.assign(usuario(), { senha: senhaHash })));
    query.getExists.mockReset().mockResolvedValue(false);
    IsUnique.init({ createQueryBuilder: () => query } as unknown as EntityManager);
  });
  afterAll(async () => contexto?.app.close());

  testarRotasProtegidas(() => contexto, [
    { metodo: 'get', caminho: '/api/usuarios' },
    { metodo: 'get', caminho: '/api/usuarios/me/foto' },
  ]);

  it.each([Role.CLIENTE, Role.GESTOR, Role.PROFISSIONAL])(
    'GET /usuarios/me/foto devolve a foto do usuário do token para o perfil %s',
    async (perfil) => {
      const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
      repository.findOne.mockResolvedValueOnce(Object.assign(usuario(perfil), { fotoPerfil: png }));
      const resposta = await request(contexto.app.getHttpServer())
        .get('/api/usuarios/me/foto')
        .auth(contexto.token(perfil, 'usuario-2'), { type: 'bearer' })
        .expect(200);
      expect(resposta.body).toEqual({ foto: `data:image/png;base64,${png.toString('base64')}` });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'usuario-2' },
        select: { id: true, fotoPerfil: true },
      });
    },
  );

  it('GET /usuarios/me/foto devolve foto nula para usuário sem foto', async () => {
    repository.findOne.mockResolvedValueOnce(Object.assign(usuario(), { fotoPerfil: null }));
    const resposta = await request(contexto.app.getHttpServer())
      .get('/api/usuarios/me/foto')
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual({ foto: null });
  });

  it('login público retorna apenas access_token com JWT válido e expiração de oito horas', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: dadosPessoa.email, senha: dadosPessoa.senha })
      .expect(200);
    expect(Object.keys(resposta.body)).toEqual(['access_token']);
    const payload = await contexto.jwt.verifyAsync(resposta.body.access_token);
    expect(payload).toMatchObject({ sub: ID, email: dadosPessoa.email, role: Role.CLIENTE });
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
  });

  it('login retorna 401 para email ausente', async () => {
    repository.findOneBy.mockResolvedValueOnce(null);
    await request(contexto.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ausente@example.com', senha: 'Senha123!' })
      .expect(401);
  });

  it('login retorna 401 para senha incorreta', async () => {
    await request(contexto.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: dadosPessoa.email, senha: 'incorreta' })
      .expect(401);
  });

  it('login rejeita entrada inválida e traduz a mensagem para português', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'invalido', senha: '' })
      .expect(400);
    expect(resposta.body.message).toEqual(
      expect.arrayContaining(['email deve ser válido', 'senha não deve ser vazio']),
    );
    expect(repository.findOneBy).not.toHaveBeenCalled();
  });

  it('POST /usuarios público persiste hash e não o expõe na resposta', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post('/api/usuarios')
      .send({ ...dadosPessoa, perfil: Role.CLIENTE })
      .expect(201);
    expect(resposta.body).toMatchObject({ id: ID, email: dadosPessoa.email, perfil: Role.CLIENTE });
    expect(resposta.body).not.toHaveProperty('senha');
    const [persistido] = repository.save.mock.calls[0];
    expect(persistido.senha).not.toBe(dadosPessoa.senha);
    await expect(bcrypt.compare(dadosPessoa.senha, persistido.senha)).resolves.toBe(true);
  });

  it('POST /usuarios rejeita email já existente no validador antes de salvar', async () => {
    query.getExists.mockResolvedValueOnce(true);
    const resposta = await request(contexto.app.getHttpServer())
      .post('/api/usuarios')
      .send({ ...dadosPessoa, perfil: Role.CLIENTE })
      .expect(400);
    expect(resposta.body.message).toContain('email já está em uso');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('POST /usuarios retorna 409 se a duplicidade surgir ao salvar', async () => {
    repository.save.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    await request(contexto.app.getHttpServer())
      .post('/api/usuarios')
      .send({ ...dadosPessoa, perfil: Role.CLIENTE })
      .expect(409);
  });

  it('POST /usuarios rejeita perfil fora do enum', async () => {
    await request(contexto.app.getHttpServer())
      .post('/api/usuarios')
      .send({ ...dadosPessoa, perfil: 'dono' })
      .expect(400);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('GET /usuarios retorna lista sem senhas', async () => {
    repository.find.mockResolvedValueOnce([
      Object.assign(usuario(), { fotoPerfil: Buffer.from([137, 80, 78, 71]) }),
    ]);
    const resposta = await request(contexto.app.getHttpServer())
      .get('/api/usuarios')
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0]).not.toHaveProperty('senha');
    expect(resposta.body[0]).not.toHaveProperty('fotoPerfil');
  });

  it('GET /usuarios retorna lista vazia', async () => {
    repository.find.mockResolvedValueOnce([]);
    const resposta = await request(contexto.app.getHttpServer())
      .get('/api/usuarios')
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual([]);
  });
});
