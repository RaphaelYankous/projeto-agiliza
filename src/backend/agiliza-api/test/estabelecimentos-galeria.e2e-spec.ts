import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Estabelecimento } from '../src/estabelecimentos/entities/estabelecimento.entity.js';
import { EstabelecimentoFoto } from '../src/estabelecimentos/entities/estabelecimento-foto.entity.js';
import { EstabelecimentoGaleriaController } from '../src/estabelecimentos/galeria/estabelecimento-galeria.controller.js';
import { EstabelecimentoGaleriaService } from '../src/estabelecimentos/galeria/estabelecimento-galeria.service.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { ESTABELECIMENTO_ID, ID } from './helpers/fixtures.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32, 1)]);
const FOTO_ID = '3b9a1f0e-7c2d-4e8a-9f61-2d5c8b7a4e10';
const MENSAGEM_TIPO = 'A foto deve ser um arquivo JPG, PNG ou WebP válido.';
const MENSAGEM_TAMANHO = 'A foto deve ter no máximo 2 MB.';

function pngComTamanho(bytes: number) {
  return Buffer.concat([PNG, Buffer.alloc(bytes - PNG.length)]);
}

describe('Galeria do estabelecimento — HTTP', () => {
  let contexto: AppTeste;
  let existentes = 0;
  const estabelecimentoRepository = { findOne: vi.fn() };
  const fotoRepository = { find: vi.fn(), findOne: vi.fn(), delete: vi.fn() };
  const manager = { findOne: vi.fn(), count: vi.fn(), insert: vi.fn() };
  const dataSource = { transaction: vi.fn() };
  const rota = `/api/estabelecimentos/${ESTABELECIMENTO_ID}/fotos`;

  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [EstabelecimentoGaleriaController],
      providers: [
        EstabelecimentoGaleriaService,
        { provide: getRepositoryToken(Estabelecimento), useValue: estabelecimentoRepository },
        { provide: getRepositoryToken(EstabelecimentoFoto), useValue: fotoRepository },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    existentes = 0;
    estabelecimentoRepository.findOne.mockResolvedValue(
      Object.assign(new Estabelecimento(), { id: ESTABELECIMENTO_ID, gestorId: ID }),
    );
    fotoRepository.find.mockResolvedValue([{ id: FOTO_ID, createdAt: new Date('2030-01-01T10:00:00') }]);
    fotoRepository.delete.mockResolvedValue({ affected: 1 });
    manager.findOne.mockResolvedValue({ id: ESTABELECIMENTO_ID });
    manager.count.mockImplementation(async () => existentes);
    manager.insert.mockResolvedValue(undefined);
    dataSource.transaction.mockImplementation(async (trabalho: (m: typeof manager) => Promise<void>) =>
      trabalho(manager),
    );
  });

  afterAll(async () => contexto?.app.close());

  const enviar = (perfil = Role.GESTOR, sub = ID) =>
    request(contexto.app.getHttpServer()).post(rota).auth(contexto.token(perfil, sub), { type: 'bearer' });
  const remover = (perfil = Role.GESTOR, sub = ID) =>
    request(contexto.app.getHttpServer())
      .delete(`${rota}/${FOTO_ID}`)
      .auth(contexto.token(perfil, sub), { type: 'bearer' });

  describe('GET /:id/fotos', () => {
    it('lista as fotos sem exigir token', async () => {
      const resposta = await request(contexto.app.getHttpServer()).get(rota).expect(200);

      expect(resposta.body).toEqual([{ id: FOTO_ID, criadaEm: new Date('2030-01-01T10:00:00').toISOString() }]);
    });
  });

  describe('GET /:id/fotos/:fotoId', () => {
    it('devolve a imagem sem exigir token, com o tipo e o cache corretos', async () => {
      fotoRepository.findOne.mockResolvedValueOnce({ id: FOTO_ID, conteudo: PNG });

      const resposta = await request(contexto.app.getHttpServer())
        .get(`${rota}/${FOTO_ID}`)
        .buffer(true)
        .parse((res, callback) => {
          const partes: Buffer[] = [];
          res.on('data', (parte: Buffer) => partes.push(parte));
          res.on('end', () => callback(null, Buffer.concat(partes)));
        })
        .expect(200);

      expect(resposta.headers['content-type']).toBe('image/png');
      expect(resposta.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(Buffer.compare(resposta.body as Buffer, PNG)).toBe(0);
    });

    it('retorna 404 para foto inexistente ou de outro estabelecimento', async () => {
      fotoRepository.findOne.mockResolvedValueOnce(null);
      await request(contexto.app.getHttpServer()).get(`${rota}/${FOTO_ID}`).expect(404);
    });
  });

  describe('POST /:id/fotos', () => {
    testarRotasProtegidas(() => contexto, [{ metodo: 'post', caminho: rota }]);

    it('grava várias fotos de uma vez e devolve a lista atualizada', async () => {
      const resposta = await enviar()
        .attach('fotos', PNG, { filename: 'a.png', contentType: 'image/png' })
        .attach('fotos', PNG, { filename: 'b.png', contentType: 'image/png' })
        .attach('fotos', PNG, { filename: 'c.png', contentType: 'image/png' })
        .expect(201);

      expect(manager.insert).toHaveBeenCalledTimes(3);
      expect(resposta.body).toEqual([{ id: FOTO_ID, criadaEm: expect.any(String) }]);
    });

    it.each([Role.CLIENTE, Role.PROFISSIONAL])('retorna 403 para o perfil %s', async (perfil) => {
      await enviar(perfil).attach('fotos', PNG, { filename: 'a.png', contentType: 'image/png' }).expect(403);
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('retorna 403 para o gestor de outro estabelecimento', async () => {
      await enviar(Role.GESTOR, 'gestor-de-outro')
        .attach('fotos', PNG, { filename: 'a.png', contentType: 'image/png' })
        .expect(403);
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it.each([
      ['conteúdo que não é imagem', Buffer.from('não é imagem'), 'image/png', MENSAGEM_TIPO],
      ['tipo declarado diferente do conteúdo', PNG, 'image/jpeg', MENSAGEM_TIPO],
      ['PNG com 2 MB + 1 byte', pngComTamanho(2 * 1024 * 1024 + 1), 'image/png', MENSAGEM_TAMANHO],
    ])('retorna 400 para %s no meio do envio, sem gravar nada', async (_caso, conteudo, tipo, mensagem) => {
      const resposta = await enviar()
        .attach('fotos', PNG, { filename: 'a.png', contentType: 'image/png' })
        .attach('fotos', conteudo, { filename: 'ruim.png', contentType: tipo })
        .expect(400);

      expect(resposta.body.message).toBe(`ruim.png: ${mensagem}`);
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('retorna 400 quando o envio passaria de 10 fotos', async () => {
      existentes = 9;

      const resposta = await enviar()
        .attach('fotos', PNG, { filename: 'a.png', contentType: 'image/png' })
        .attach('fotos', PNG, { filename: 'b.png', contentType: 'image/png' })
        .expect(400);

      expect(resposta.body.message).toBe('A galeria aceita no máximo 10 fotos. Você pode adicionar mais 1.');
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('retorna 400 com a mensagem do limite para 11 arquivos num envio', async () => {
      let requisicao = enviar();
      for (let i = 0; i < 11; i++) {
        requisicao = requisicao.attach('fotos', PNG, { filename: `${i}.png`, contentType: 'image/png' });
      }

      const resposta = await requisicao.expect(400);

      expect(resposta.body.message).toBe('A galeria aceita no máximo 10 fotos.');
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('retorna 400 quando nenhum arquivo é enviado', async () => {
      const resposta = await enviar().field('outro', 'valor').expect(400);
      expect(resposta.body.message).toBe('Selecione ao menos uma foto.');
    });

    it('retorna 413 para arquivo acima de 5 MB sem gravar', async () => {
      await enviar()
        .attach('fotos', pngComTamanho(5 * 1024 * 1024 + 1), { filename: 'a.png', contentType: 'image/png' })
        .expect(413);
      expect(manager.insert).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:id/fotos/:fotoId', () => {
    testarRotasProtegidas(() => contexto, [{ metodo: 'delete', caminho: `${rota}/${FOTO_ID}` }]);

    it('remove a foto e devolve 204', async () => {
      await remover().expect(204);
      expect(fotoRepository.delete).toHaveBeenCalledWith({ id: FOTO_ID, estabelecimentoId: ESTABELECIMENTO_ID });
    });

    it.each([Role.CLIENTE, Role.PROFISSIONAL])('retorna 403 para o perfil %s', async (perfil) => {
      await remover(perfil).expect(403);
      expect(fotoRepository.delete).not.toHaveBeenCalled();
    });

    it('retorna 403 para o gestor de outro estabelecimento', async () => {
      await remover(Role.GESTOR, 'gestor-de-outro').expect(403);
      expect(fotoRepository.delete).not.toHaveBeenCalled();
    });

    it('retorna 404 quando a foto não é do estabelecimento', async () => {
      fotoRepository.delete.mockResolvedValueOnce({ affected: 0 });
      await remover().expect(404);
    });
  });
});
