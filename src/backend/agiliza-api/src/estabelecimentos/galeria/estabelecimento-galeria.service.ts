import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { tipoFoto, validarFoto, type ArquivoFoto } from '../../common/utils/foto-perfil.js';
import { Estabelecimento } from '../entities/estabelecimento.entity.js';
import { EstabelecimentoFoto } from '../entities/estabelecimento-foto.entity.js';

export const LIMITE_GALERIA = 10;
export const MENSAGEM_ENVIO_ACIMA_DO_LIMITE = `A galeria aceita no máximo ${LIMITE_GALERIA} fotos.`;

export type ArquivoGaleria = ArquivoFoto & { originalname?: string };
export type FotoGaleria = { id: string; criadaEm: Date };

export function mensagemLimiteGaleria(existentes: number): string {
  const restantes = LIMITE_GALERIA - existentes;
  return restantes > 0
    ? `${MENSAGEM_ENVIO_ACIMA_DO_LIMITE} Você pode adicionar mais ${restantes}.`
    : `A galeria já tem ${LIMITE_GALERIA} fotos. Remova uma para adicionar outra.`;
}

@Injectable()
export class EstabelecimentoGaleriaService {
  constructor(
    @InjectRepository(Estabelecimento)
    private readonly estabelecimentoRepository: Repository<Estabelecimento>,
    @InjectRepository(EstabelecimentoFoto)
    private readonly fotoRepository: Repository<EstabelecimentoFoto>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(estabelecimentoId: string): Promise<FotoGaleria[]> {
    const fotos = await this.fotoRepository.find({
      where: { estabelecimentoId },
      select: { id: true, createdAt: true },
      order: { createdAt: 'ASC' },
    });
    return fotos.map((foto) => ({ id: foto.id, criadaEm: foto.createdAt }));
  }

  async foto(estabelecimentoId: string, fotoId: string): Promise<{ conteudo: Buffer; tipo: string }> {
    const foto = await this.fotoRepository.findOne({
      where: { id: fotoId, estabelecimentoId },
      select: { id: true, conteudo: true },
    });
    const conteudo = foto?.conteudo;
    const tipo = conteudo ? tipoFoto(conteudo) : null;

    if (!conteudo || !tipo) {
      throw new NotFoundException('Foto da galeria não encontrada.');
    }

    return { conteudo, tipo };
  }

  async adicionar(
    estabelecimentoId: string,
    gestorId: string,
    arquivos: ArquivoGaleria[] = [],
  ): Promise<FotoGaleria[]> {
    await this.somenteDoGestor(estabelecimentoId, gestorId);
    if (arquivos.length === 0) throw new BadRequestException('Selecione ao menos uma foto.');
    const conteudos = arquivos.map((arquivo) => this.validar(arquivo, arquivos.length > 1));

    await this.dataSource.transaction(async (manager) => {
      await manager.findOne(Estabelecimento, {
        where: { id: estabelecimentoId },
        select: { id: true },
        lock: { mode: 'pessimistic_write' },
      });
      const existentes = await manager.count(EstabelecimentoFoto, { where: { estabelecimentoId } });
      if (existentes + conteudos.length > LIMITE_GALERIA) {
        throw new BadRequestException(mensagemLimiteGaleria(existentes));
      }
      for (const conteudo of conteudos) {
        await manager.insert(EstabelecimentoFoto, { estabelecimentoId, conteudo });
      }
    });

    return this.listar(estabelecimentoId);
  }

  async remover(estabelecimentoId: string, gestorId: string, fotoId: string): Promise<void> {
    await this.somenteDoGestor(estabelecimentoId, gestorId);
    const resultado = await this.fotoRepository.delete({ id: fotoId, estabelecimentoId });
    if (!resultado.affected) {
      throw new NotFoundException('Foto da galeria não encontrada.');
    }
  }

  private validar(arquivo: ArquivoGaleria, comNome: boolean): Buffer {
    try {
      return validarFoto(arquivo);
    } catch (erro) {
      if (comNome && arquivo.originalname && erro instanceof BadRequestException) {
        throw new BadRequestException(`${arquivo.originalname}: ${erro.message}`);
      }
      throw erro;
    }
  }

  private async somenteDoGestor(estabelecimentoId: string, gestorId: string): Promise<void> {
    const estabelecimento = await this.estabelecimentoRepository.findOne({
      where: { id: estabelecimentoId },
      select: { id: true, gestorId: true },
    });

    if (!estabelecimento) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    if (estabelecimento.gestorId !== gestorId) {
      throw new ForbiddenException('Você só pode alterar os seus estabelecimentos.');
    }
  }
}
