import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { Repository } from 'typeorm';
import { EstabelecimentosService } from './estabelecimentos.service.js';
import type { Estabelecimento } from './entities/estabelecimento.entity.js';
import type { Servico } from '../servicos/entities/servico.entity.js';
import type { Profissional } from '../profissionais/entities/profissional.entity.js';
import type { AvaliacaoDocument } from '../avaliacoes/schemas/avaliacao.schema.js';
import {
  dadosEstabelecimento,
  estabelecimento,
  ESTABELECIMENTO_ID,
  ID,
} from '../../test/helpers/fixtures.js';
import { repositoryMock } from '../../test/helpers/mocks.js';

function montar() {
  const registro = estabelecimento();
  const repository = repositoryMock(registro);
  const servicoRepository = { find: vi.fn(async () => []) };
  const profissionalRepository = { find: vi.fn(async () => []) };
  const avaliacaoModel = { find: vi.fn(() => ({ exec: async () => [] })) };
  const service = new EstabelecimentosService(
    repository as unknown as Repository<Estabelecimento>,
    servicoRepository as unknown as Repository<Servico>,
    profissionalRepository as unknown as Repository<Profissional>,
    avaliacaoModel as unknown as Model<AvaliacaoDocument>,
  );
  return { service, repository, registro };
}

describe('EstabelecimentosService', () => {
  it('cadastra os dados recebidos e retorna o resultado persistido', async () => {
    const { service, repository, registro } = montar();
    repository.save.mockResolvedValueOnce(registro);
    await expect(service.create(dadosEstabelecimento)).resolves.toBe(registro);
    expect(repository.create).toHaveBeenCalledWith(dadosEstabelecimento);
  });

  it('lista estabelecimentos e aceita catálogo vazio', async () => {
    const { service, repository, registro } = montar();
    await expect(service.findAll()).resolves.toEqual([registro]);
    repository.find.mockResolvedValueOnce([]);
    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('filtra pelo gestor informado', async () => {
    const { service, repository } = montar();
    await service.findByGestorId(ID);
    expect(repository.find).toHaveBeenCalledWith({ where: { gestorId: ID } });
  });

  it('busca pelo ID e preserva campos na atualização parcial', async () => {
    const { service, repository } = montar();
    const resultado = await service.update(ESTABELECIMENTO_ID, ID, {
      telefone: '3133334444',
    });
    expect(resultado).toMatchObject({ ...dadosEstabelecimento, telefone: '3133334444' });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: ESTABELECIMENTO_ID } });
  });

  it('ignora o gestorId enviado no corpo da atualização', async () => {
    const { service, registro } = montar();
    await service.update(ESTABELECIMENTO_ID, ID, { gestorId: 'outro-gestor' });
    expect(registro.gestorId).toBe(ID);
  });

  it.each(['findOne', 'update', 'remove'] as const)(
    '%s rejeita recurso ausente sem gravar',
    async (metodo) => {
      const { service, repository } = montar();
      repository.findOne.mockResolvedValueOnce(null);
      const chamada = {
        findOne: () => service.findOne(ESTABELECIMENTO_ID),
        update: () => service.update(ESTABELECIMENTO_ID, ID, {}),
        remove: () => service.remove(ESTABELECIMENTO_ID, ID),
      }[metodo];
      await expect(chamada()).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );

  it('remove o registro encontrado', async () => {
    const { service, repository, registro } = montar();
    await expect(service.remove(ESTABELECIMENTO_ID, ID)).resolves.toBeUndefined();
    expect(repository.remove).toHaveBeenCalledWith(registro);
  });

  it('recusa atualização de estabelecimento de outro gestor', async () => {
    const { service, repository } = montar();
    await expect(
      service.update(ESTABELECIMENTO_ID, 'gestor-de-outro', { telefone: '3133334444' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('recusa remoção de estabelecimento de outro gestor', async () => {
    const { service, repository } = montar();
    await expect(service.remove(ESTABELECIMENTO_ID, 'gestor-de-outro')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('propaga falhas de persistência sem classificá-las como 404', async () => {
    const { service, repository } = montar();
    const erro = new Error('Banco indisponível');
    repository.save.mockRejectedValueOnce(erro);
    await expect(service.create(dadosEstabelecimento)).rejects.toBe(erro);
  });

  describe('foto principal', () => {
    const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16)]);
    const arquivoPng = { buffer: PNG, mimetype: 'image/png', size: PNG.length };

    it('grava a foto e a data de atualização do estabelecimento do gestor', async () => {
      const { service, repository } = montar();
      const resultado = await service.atualizarFoto(ESTABELECIMENTO_ID, ID, arquivoPng);
      expect(repository.update).toHaveBeenCalledWith(
        { id: ESTABELECIMENTO_ID },
        { fotoPerfil: PNG, fotoAtualizadaEm: resultado.fotoAtualizadaEm },
      );
      expect(resultado.fotoAtualizadaEm).toBeInstanceOf(Date);
    });

    it('recusa a foto de estabelecimento de outro gestor sem gravar', async () => {
      const { service, repository } = montar();
      await expect(
        service.atualizarFoto(ESTABELECIMENTO_ID, 'gestor-de-outro', arquivoPng),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it.each([
      ['sem arquivo', undefined, 'Selecione uma foto.'],
      ['acima de 2 MB', { ...arquivoPng, size: 2 * 1024 * 1024 + 1 }, 'A foto deve ter no máximo 2 MB.'],
      ['com tipo declarado diferente do conteúdo', { ...arquivoPng, mimetype: 'image/jpeg' }, 'A foto deve ser um arquivo JPG, PNG ou WebP válido.'],
      ['que não é imagem', { buffer: Buffer.from('texto'), mimetype: 'image/png', size: 5 }, 'A foto deve ser um arquivo JPG, PNG ou WebP válido.'],
    ])('recusa foto %s sem gravar', async (_caso, arquivo, mensagem) => {
      const { service, repository } = montar();
      const chamada = service.atualizarFoto(ESTABELECIMENTO_ID, ID, arquivo);
      await expect(chamada).rejects.toBeInstanceOf(BadRequestException);
      await expect(chamada).rejects.toThrow(mensagem);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('devolve o conteúdo e o tipo da foto lendo só a coluna da foto', async () => {
      const { service, repository, registro } = montar();
      repository.findOne.mockResolvedValueOnce(Object.assign(registro, { fotoPerfil: PNG }));
      await expect(service.foto(ESTABELECIMENTO_ID)).resolves.toEqual({
        conteudo: PNG,
        tipo: 'image/png',
      });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: ESTABELECIMENTO_ID },
        select: { id: true, fotoPerfil: true },
      });
    });

    it.each([
      ['o estabelecimento não existe', null],
      ['o estabelecimento não tem foto', { id: ESTABELECIMENTO_ID, fotoPerfil: null }],
    ])('responde 404 quando %s', async (_caso, encontrado) => {
      const { service, repository } = montar();
      repository.findOne.mockResolvedValueOnce(encontrado as never);
      await expect(service.foto(ESTABELECIMENTO_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
