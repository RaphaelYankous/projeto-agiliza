import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { ClientesController } from '../src/clientes/clientes.controller.js';
import { ClientesService } from '../src/clientes/clientes.service.js';
import { Cliente } from '../src/clientes/entities/cliente.entity.js';
import { GestoresController } from '../src/gestores/gestores.controller.js';
import { GestoresService } from '../src/gestores/gestores.service.js';
import { Gestor } from '../src/gestores/entities/gestor.entity.js';
import { Usuario, Role } from '../src/usuarios/entities/usuario.entity.js';
import { dadosPessoa, usuario, ID } from './helpers/fixtures.js';
import { perfisMock } from './helpers/perfis.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

describe.each([
  {
    nome: 'Clientes',
    tipo: 'cliente' as const,
    rota: '/api/clientes',
    controller: ClientesController,
    service: ClientesService,
    entidade: Cliente,
  },
  {
    nome: 'Gestores',
    tipo: 'gestor' as const,
    rota: '/api/gestores',
    controller: GestoresController,
    service: GestoresService,
    entidade: Gestor,
  },
])('$nome — HTTP', ({ tipo, rota, controller, service, entidade }) => {
  let contexto: AppTeste;
  let mocks: ReturnType<typeof perfisMock>;
  const repository = {};
  const usuarioRepository = {};
  const dataSource = {};
  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [controller],
      providers: [
        service,
        { provide: getRepositoryToken(entidade), useValue: repository },
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    });
  });
  beforeEach(() => {
    mocks = perfisMock(tipo);
    Object.assign(repository, mocks.repository);
    Object.assign(usuarioRepository, mocks.usuarioRepository);
    Object.assign(dataSource, mocks.dataSource);
  });
  afterAll(async () => contexto?.app.close());

  testarRotasProtegidas(
    () => contexto,
    [
      { metodo: 'get', caminho: rota },
      { metodo: 'get', caminho: `${rota}/${ID}` },
      { metodo: 'patch', caminho: `${rota}/${ID}` },
      { metodo: 'delete', caminho: `${rota}/${ID}` },
    ],
  );

  it('POST público cria perfil sem expor senha nem hash', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post(rota)
      .send(dadosPessoa)
      .expect(201);
    expect(resposta.body).toMatchObject({
      usuarioId: ID,
      usuario: { email: dadosPessoa.email, perfil: tipo },
    });
    expect(resposta.body.usuario).not.toHaveProperty('senha');
    expect(mocks.manager.save).toHaveBeenCalledTimes(2);
  });

  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const cadastroMultipart = (foto?: Buffer, contentType = 'image/png') => {
    const requisicao = request(contexto.app.getHttpServer()).post(rota);
    for (const [campo, valor] of Object.entries(dadosPessoa)) requisicao.field(campo, valor);
    return foto ? requisicao.attach('foto', foto, { filename: 'foto.png', contentType }) : requisicao;
  };

  it('POST multipart com foto válida cria o perfil e grava a foto no usuário', async () => {
    await cadastroMultipart(png).expect(201);
    expect(mocks.manager.create).toHaveBeenCalledWith(Usuario, expect.objectContaining({ fotoPerfil: png }));
  });

  it('POST multipart sem foto cria o perfil sem foto', async () => {
    await cadastroMultipart().expect(201);
    expect(mocks.manager.create).toHaveBeenCalledWith(Usuario, expect.objectContaining({ fotoPerfil: null }));
  });

  it('POST JSON sem foto continua criando o perfil sem foto', async () => {
    await request(contexto.app.getHttpServer()).post(rota).send(dadosPessoa).expect(201);
    expect(mocks.manager.create).toHaveBeenCalledWith(Usuario, expect.objectContaining({ fotoPerfil: null }));
  });

  it.each([
    ['conteúdo que não é imagem', Buffer.from('não sou uma imagem'), 'image/png', 'A foto deve ser um arquivo JPG, PNG ou WebP válido.'],
    ['tipo declarado diferente do conteúdo', png, 'image/jpeg', 'A foto deve ser um arquivo JPG, PNG ou WebP válido.'],
    [
      'foto acima de 2 MB',
      Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024 + 1 - png.length)]),
      'image/png',
      'A foto deve ter no máximo 2 MB.',
    ],
  ])('POST recusa %s com 400 sem criar a conta', async (_caso, foto, contentType, mensagem) => {
    const resposta = await cadastroMultipart(foto, contentType).expect(400);
    expect(resposta.body.message).toBe(mensagem);
    expect(mocks.manager.save).not.toHaveBeenCalled();
  });

  it('POST recusa foto acima de 5 MB no próprio upload (413) sem criar a conta', async () => {
    await cadastroMultipart(Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)])).expect(413);
    expect(mocks.manager.save).not.toHaveBeenCalled();
  });

  it('POST rejeita email inválido antes da persistência', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post(rota)
      .send({ ...dadosPessoa, email: 'invalido' })
      .expect(400);
    expect(resposta.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('email')]),
    );
    expect(mocks.manager.save).not.toHaveBeenCalled();
  });

  it('GET lista perfis sem senha', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(rota)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].usuario).not.toHaveProperty('senha');
  });

  it('GET aceita lista vazia', async () => {
    mocks.repository.find.mockResolvedValueOnce([]);
    const resposta = await request(contexto.app.getHttpServer())
      .get(rota)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual([]);
  });

  it('GET /:id carrega o usuário vinculado sem senha', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(`${rota}/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toMatchObject({ usuarioId: ID });
    expect(resposta.body.usuario).not.toHaveProperty('senha');
  });

  it('PATCH altera dados e retorna o usuário atualizado sem senha', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .patch(`${rota}/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ nome: 'Maria' })
      .expect(200);
    expect(resposta.body.usuario).toMatchObject({ nome: 'Maria', email: dadosPessoa.email });
    expect(resposta.body.usuario).not.toHaveProperty('senha');
  });

  it('PATCH rejeita email inválido', async () => {
    await request(contexto.app.getHttpServer())
      .patch(`${rota}/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .send({ email: 'invalido' })
      .expect(400);
    expect(mocks.manager.save).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch', 'delete'] as const)(
    '%s retorna 404 para perfil inexistente',
    async (metodo) => {
      mocks.repository.findOne.mockResolvedValueOnce(null);
      await request(contexto.app.getHttpServer())
        [metodo](`${rota}/${ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .send({})
        .expect(404);
      expect(mocks.manager.save).not.toHaveBeenCalled();
      expect(mocks.usuarioRepository.delete).not.toHaveBeenCalled();
    },
  );

  it('DELETE remove o usuário vinculado e retorna 204 sem body', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .delete(`${rota}/${ID}`)
      .auth(contexto.token(), { type: 'bearer' })
      .expect(204);
    expect(resposta.text).toBe('');
    expect(mocks.usuarioRepository.delete).toHaveBeenCalledWith(ID);
  });

  if (tipo === 'gestor') {
    it.each([Role.CLIENTE, Role.PROFISSIONAL])(
      'nega todas as operações protegidas ao perfil %s',
      async (role) => {
        for (const metodo of ['get', 'patch', 'delete'] as const) {
          await request(contexto.app.getHttpServer())
            [metodo](`${rota}/${ID}`)
            .auth(contexto.token(role), { type: 'bearer' })
            .send({})
            .expect(403);
        }
        await request(contexto.app.getHttpServer())
          .get(rota)
          .auth(contexto.token(role), { type: 'bearer' })
          .expect(403);
        expect(mocks.repository.findOne).not.toHaveBeenCalled();
        expect(mocks.manager.save).not.toHaveBeenCalled();
      },
    );

    it('POST converte duplicidade da transação em 409', async () => {
      mocks.dataSource.transaction.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
      await request(contexto.app.getHttpServer()).post(rota).send(dadosPessoa).expect(409);
    });

    it('PATCH converte duplicidade da transação em 409', async () => {
      mocks.dataSource.transaction.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
      await request(contexto.app.getHttpServer())
        .patch(`${rota}/${ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .send({ email: 'outro@example.com' })
        .expect(409);
    });
  } else {
    it.each(['email', 'cpf'])('POST retorna 409 para %s duplicado', async (campo) => {
      mocks.usuarioRepository.findOne.mockImplementation(async (opcoes: unknown) => {
        const where = (opcoes as { where: Record<string, unknown> }).where;
        return campo in where ? usuario() : null;
      });
      await request(contexto.app.getHttpServer()).post(rota).send(dadosPessoa).expect(409);
      expect(mocks.runner.startTransaction).not.toHaveBeenCalled();
    });

    it('POST desfaz a transação e retorna 400 em falha de gravação', async () => {
      mocks.manager.save.mockRejectedValueOnce(new Error('Falha ao gravar'));
      await request(contexto.app.getHttpServer()).post(rota).send(dadosPessoa).expect(400);
      expect(mocks.runner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mocks.runner.release).toHaveBeenCalledTimes(1);
    });

    it('PATCH retorna 409 quando email pertence a outro usuário', async () => {
      mocks.usuarioRepository.findOne.mockResolvedValueOnce(
        Object.assign(usuario(), { id: 'outro' }),
      );
      await request(contexto.app.getHttpServer())
        .patch(`${rota}/${ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .send({ email: 'outro@example.com' })
        .expect(409);
      expect(mocks.runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('PATCH retorna 404 para usuário vinculado ausente', async () => {
      mocks.manager.findOne.mockResolvedValueOnce(null);
      await request(contexto.app.getHttpServer())
        .patch(`${rota}/${ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .send({ nome: 'Maria' })
        .expect(404);
    });

    const edicaoComFoto = (foto: Buffer, contentType = 'image/png') =>
      request(contexto.app.getHttpServer())
        .patch(`${rota}/${ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .field('nome', 'Maria')
        .attach('foto', foto, { filename: 'foto.png', contentType });

    it('PATCH multipart com foto válida grava a foto no usuário', async () => {
      await edicaoComFoto(png).expect(200);
      expect(mocks.manager.update).toHaveBeenCalledWith(Usuario, { id: ID }, { fotoPerfil: png });
    });

    it.each([
      ['conteúdo que não é imagem', Buffer.from('não sou uma imagem'), 'A foto deve ser um arquivo JPG, PNG ou WebP válido.'],
      ['foto acima de 2 MB', Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)]), 'A foto deve ter no máximo 2 MB.'],
    ])('PATCH recusa %s com 400 sem gravar', async (_caso, foto, mensagem) => {
      const resposta = await edicaoComFoto(foto).expect(400);
      expect(resposta.body.message).toBe(mensagem);
      expect(mocks.manager.update).not.toHaveBeenCalled();
      expect(mocks.manager.save).not.toHaveBeenCalled();
    });

    it('PATCH ignora o antigo fotoPerfil em base64', async () => {
      await request(contexto.app.getHttpServer())
        .patch(`${rota}/${ID}`)
        .auth(contexto.token(), { type: 'bearer' })
        .send({ fotoPerfil: 'Zm90bw==' })
        .expect(200);
      expect(mocks.manager.update).not.toHaveBeenCalled();
    });
  }
});
