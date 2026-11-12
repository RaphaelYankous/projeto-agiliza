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

const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32, 1)]);
const MENSAGEM_TIPO = 'A foto deve ser um arquivo JPG, PNG ou WebP válido.';
const MENSAGEM_TAMANHO = 'A foto deve ter no máximo 2 MB.';

function pngComTamanho(bytes: number) {
  return Buffer.concat([PNG, Buffer.alloc(bytes - PNG.length)]);
}

describe('Foto principal do estabelecimento — HTTP', () => {
  let contexto: AppTeste;
  const repository = repositoryMock(estabelecimento());
  const rota = `/api/estabelecimentos/${ESTABELECIMENTO_ID}/foto`;

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

  const enviar = (perfil = Role.GESTOR, sub = ID) =>
    request(contexto.app.getHttpServer()).patch(rota).auth(contexto.token(perfil, sub), { type: 'bearer' });

  describe('PATCH /:id/foto', () => {
    testarRotasProtegidas(() => contexto, [{ metodo: 'patch', caminho: rota }]);

    it('grava a foto do estabelecimento do gestor e devolve a data de atualização', async () => {
      const resposta = await enviar()
        .attach('foto', PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(200);

      expect(resposta.body).toEqual({ fotoAtualizadaEm: expect.any(String) });
      expect(repository.update).toHaveBeenCalledWith(
        { id: ESTABELECIMENTO_ID },
        { fotoPerfil: PNG, fotoAtualizadaEm: expect.any(Date) },
      );
    });

    it.each([Role.CLIENTE, Role.PROFISSIONAL])('retorna 403 para o perfil %s', async (perfil) => {
      await enviar(perfil)
        .attach('foto', PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(403);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('retorna 403 para o gestor de outro estabelecimento', async () => {
      await enviar(Role.GESTOR, 'gestor-de-outro')
        .attach('foto', PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(403);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it.each([
      ['conteúdo que não é imagem', Buffer.from('não é imagem'), 'image/png', MENSAGEM_TIPO],
      ['tipo declarado diferente do conteúdo', PNG, 'image/jpeg', MENSAGEM_TIPO],
      ['PNG com 2 MB + 1 byte', pngComTamanho(2 * 1024 * 1024 + 1), 'image/png', MENSAGEM_TAMANHO],
    ])('retorna 400 para %s sem gravar', async (_caso, conteudo, tipo, mensagem) => {
      const resposta = await enviar()
        .attach('foto', conteudo, { filename: 'foto.png', contentType: tipo })
        .expect(400);
      expect(resposta.body.message).toBe(mensagem);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('retorna 400 quando nenhum arquivo é enviado', async () => {
      const resposta = await enviar().field('outro', 'valor').expect(400);
      expect(resposta.body.message).toBe('Selecione uma foto.');
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('retorna 413 para arquivo acima de 5 MB sem gravar', async () => {
      await enviar()
        .attach('foto', pngComTamanho(5 * 1024 * 1024 + 1), { filename: 'foto.png', contentType: 'image/png' })
        .expect(413);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /:id/foto', () => {
    it('devolve a imagem sem exigir token, com o tipo e o cache corretos', async () => {
      repository.findOne.mockResolvedValueOnce(Object.assign(estabelecimento(), { fotoPerfil: PNG }));

      const resposta = await request(contexto.app.getHttpServer())
        .get(rota)
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
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: ESTABELECIMENTO_ID },
        select: { id: true, fotoPerfil: true },
      });
    });

    it('retorna 404 quando o estabelecimento não tem foto', async () => {
      repository.findOne.mockResolvedValueOnce(Object.assign(estabelecimento(), { fotoPerfil: null }));
      await request(contexto.app.getHttpServer()).get(rota).expect(404);
    });

    it('retorna 404 quando o estabelecimento não existe', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      await request(contexto.app.getHttpServer()).get(rota).expect(404);
    });
  });
});
