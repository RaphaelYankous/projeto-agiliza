import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { Estabelecimento } from '../entities/estabelecimento.entity.js';
import { EstabelecimentoFoto } from '../entities/estabelecimento-foto.entity.js';
import {
  EstabelecimentoGaleriaService,
  mensagemLimiteGaleria,
  type ArquivoGaleria,
} from './estabelecimento-galeria.service.js';

const ESTABELECIMENTO_ID = 'estab-1';
const GESTOR_ID = 'gestor-1';
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16, 1)]);

function png(nome = 'foto.png'): ArquivoGaleria {
  return { buffer: PNG, mimetype: 'image/png', size: PNG.length, originalname: nome };
}

function montar({ existentes = 0, gestorId = GESTOR_ID, estabelecimento = true } = {}) {
  const estabelecimentoRepository = {
    findOne: vi.fn(async () =>
      estabelecimento ? Object.assign(new Estabelecimento(), { id: ESTABELECIMENTO_ID, gestorId }) : null,
    ),
  };
  const fotoRepository = {
    find: vi.fn(async () => [
      { id: 'f1', createdAt: new Date('2030-01-01T10:00:00') },
      { id: 'f2', createdAt: new Date('2030-01-01T11:00:00') },
    ]),
    findOne: vi.fn(),
    delete: vi.fn(async () => ({ affected: 1 })),
  };
  const manager = {
    findOne: vi.fn(async () => ({ id: ESTABELECIMENTO_ID })),
    count: vi.fn(async () => existentes),
    insert: vi.fn(async () => undefined),
  };
  const dataSource = { transaction: vi.fn(async (trabalho: (m: typeof manager) => Promise<void>) => trabalho(manager)) };
  const service = new EstabelecimentoGaleriaService(
    estabelecimentoRepository as unknown as Repository<Estabelecimento>,
    fotoRepository as unknown as Repository<EstabelecimentoFoto>,
    dataSource as unknown as DataSource,
  );
  return { service, estabelecimentoRepository, fotoRepository, manager, dataSource };
}

describe('EstabelecimentoGaleriaService', () => {
  describe('listar', () => {
    it('lista só id e data, na ordem de envio, sem ler o arquivo', async () => {
      const { service, fotoRepository } = montar();

      const fotos = await service.listar(ESTABELECIMENTO_ID);

      expect(fotoRepository.find).toHaveBeenCalledWith({
        where: { estabelecimentoId: ESTABELECIMENTO_ID },
        select: { id: true, createdAt: true },
        order: { createdAt: 'ASC' },
      });
      expect(fotos).toEqual([
        { id: 'f1', criadaEm: new Date('2030-01-01T10:00:00') },
        { id: 'f2', criadaEm: new Date('2030-01-01T11:00:00') },
      ]);
    });
  });

  describe('foto', () => {
    it('devolve o conteúdo e o tipo da foto do estabelecimento', async () => {
      const { service, fotoRepository } = montar();
      fotoRepository.findOne.mockResolvedValueOnce({ id: 'f1', conteudo: PNG });

      await expect(service.foto(ESTABELECIMENTO_ID, 'f1')).resolves.toEqual({ conteudo: PNG, tipo: 'image/png' });
      expect(fotoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'f1', estabelecimentoId: ESTABELECIMENTO_ID },
        select: { id: true, conteudo: true },
      });
    });

    it('lança 404 quando a foto não existe ou é de outro estabelecimento', async () => {
      const { service, fotoRepository } = montar();
      fotoRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.foto(ESTABELECIMENTO_ID, 'outra')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('adicionar', () => {
    it('grava todas as fotos numa transação, travando o estabelecimento antes de contar', async () => {
      const { service, manager } = montar({ existentes: 2 });

      const fotos = await service.adicionar(ESTABELECIMENTO_ID, GESTOR_ID, [png('a.png'), png('b.png'), png('c.png')]);

      expect(manager.findOne).toHaveBeenCalledWith(Estabelecimento, {
        where: { id: ESTABELECIMENTO_ID },
        select: { id: true },
        lock: { mode: 'pessimistic_write' },
      });
      expect(manager.insert).toHaveBeenCalledTimes(3);
      expect(manager.insert).toHaveBeenCalledWith(EstabelecimentoFoto, {
        estabelecimentoId: ESTABELECIMENTO_ID,
        conteudo: PNG,
      });
      expect(fotos).toHaveLength(2);
    });

    it('aceita completar exatamente 10 fotos', async () => {
      const { service, manager } = montar({ existentes: 7 });

      await service.adicionar(ESTABELECIMENTO_ID, GESTOR_ID, [png(), png(), png()]);

      expect(manager.insert).toHaveBeenCalledTimes(3);
    });

    it('recusa por inteiro um envio que passaria de 10 fotos', async () => {
      const { service, manager } = montar({ existentes: 8 });

      const envio = service.adicionar(ESTABELECIMENTO_ID, GESTOR_ID, [png(), png(), png()]);

      await expect(envio).rejects.toThrow(
        new BadRequestException('A galeria aceita no máximo 10 fotos. Você pode adicionar mais 2.'),
      );
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('recusa por inteiro um envio com um arquivo inválido no meio, citando o nome dele', async () => {
      const { service, dataSource } = montar();
      const gif = { buffer: Buffer.from('GIF89a'), mimetype: 'image/gif', size: 6, originalname: 'animacao.gif' };

      const envio = service.adicionar(ESTABELECIMENTO_ID, GESTOR_ID, [png(), gif, png()]);

      await expect(envio).rejects.toThrow(
        new BadRequestException('animacao.gif: A foto deve ser um arquivo JPG, PNG ou WebP válido.'),
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('recusa um arquivo acima de 2 MB com a mensagem de tamanho', async () => {
      const { service, dataSource } = montar();
      const grande = { ...png('grande.png'), size: 2 * 1024 * 1024 + 1 };

      await expect(service.adicionar(ESTABELECIMENTO_ID, GESTOR_ID, [grande])).rejects.toThrow(
        new BadRequestException('A foto deve ter no máximo 2 MB.'),
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('recusa um envio sem arquivos', async () => {
      const { service } = montar();

      await expect(service.adicionar(ESTABELECIMENTO_ID, GESTOR_ID, [])).rejects.toThrow(
        new BadRequestException('Selecione ao menos uma foto.'),
      );
    });

    it('lança 403 para o gestor de outro estabelecimento, sem gravar', async () => {
      const { service, dataSource } = montar({ gestorId: 'outro-gestor' });

      await expect(service.adicionar(ESTABELECIMENTO_ID, GESTOR_ID, [png()])).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('lança 404 quando o estabelecimento não existe', async () => {
      const { service } = montar({ estabelecimento: false });

      await expect(service.adicionar(ESTABELECIMENTO_ID, GESTOR_ID, [png()])).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remover', () => {
    it('apaga só a foto daquele estabelecimento', async () => {
      const { service, fotoRepository } = montar();

      await service.remover(ESTABELECIMENTO_ID, GESTOR_ID, 'f1');

      expect(fotoRepository.delete).toHaveBeenCalledWith({ id: 'f1', estabelecimentoId: ESTABELECIMENTO_ID });
    });

    it('lança 404 quando a foto não é do estabelecimento', async () => {
      const { service, fotoRepository } = montar();
      fotoRepository.delete.mockResolvedValueOnce({ affected: 0 });

      await expect(service.remover(ESTABELECIMENTO_ID, GESTOR_ID, 'outra')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lança 403 para o gestor de outro estabelecimento, sem apagar', async () => {
      const { service, fotoRepository } = montar({ gestorId: 'outro-gestor' });

      await expect(service.remover(ESTABELECIMENTO_ID, GESTOR_ID, 'f1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(fotoRepository.delete).not.toHaveBeenCalled();
    });
  });

  it('mensagem do limite quando a galeria já está cheia', () => {
    expect(mensagemLimiteGaleria(10)).toBe('A galeria já tem 10 fotos. Remova uma para adicionar outra.');
  });
});
