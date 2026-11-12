import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { In, Like, Repository } from 'typeorm';
import { Avaliacao, AvaliacaoDocument } from '../avaliacoes/schemas/avaliacao.schema.js';
import { tipoFoto, validarFoto, type ArquivoFoto } from '../common/utils/foto-perfil.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { CreateEstabelecimentoDto } from './dto/create-estabelecimento.dto.js';
import { UpdateEstabelecimentoDto } from './dto/update-estabelecimento.dto.js';
import { Estabelecimento } from './entities/estabelecimento.entity.js';

export type OrdenacaoBusca = 'distancia' | 'preco' | 'avaliacao' | 'nome';
export type OrdemBusca = 'asc' | 'desc';

export type FiltrosBusca = {
  nome?: string;
  ordenarPor?: OrdenacaoBusca;
  ordem?: OrdemBusca;
  lat?: string;
  lng?: string;
  raio?: string;
};

export type EstabelecimentoBusca = {
  id: string;
  nome: string;
  endereco: string;
  descricao?: string;
  telefone: string;
  latitude: number;
  longitude: number;
  horarioAbertura: string;
  horarioFechamento: string;
  fidelidade: boolean;
  redeSocial?: string[];
  distanciaKm: number | null;
  avaliacaoMedia: number | null;
  totalAvaliacoes: number;
  precoMinimo: number | null;
  fotoAtualizadaEm: Date | null;
};

type NotasEstabelecimento = {
  soma: number;
  total: number;
};

const RAIO_TERRA_KM = 6371;

function numero(valor?: string): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : null;
}

function distanciaEmKm(
  latitudeOrigem: number,
  longitudeOrigem: number,
  latitudeDestino: number,
  longitudeDestino: number,
): number {
  const emRadianos = (graus: number) => (graus * Math.PI) / 180;
  const deltaLatitude = emRadianos(latitudeDestino - latitudeOrigem);
  const deltaLongitude = emRadianos(longitudeDestino - longitudeOrigem);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(emRadianos(latitudeOrigem)) *
      Math.cos(emRadianos(latitudeDestino)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(a));
}

@Injectable()
export class EstabelecimentosService {
  constructor(
    @InjectRepository(Estabelecimento)
    private readonly estabelecimentoRepository: Repository<Estabelecimento>,
    @InjectRepository(Servico)
    private readonly servicoRepository: Repository<Servico>,
    @InjectRepository(Profissional)
    private readonly profissionalRepository: Repository<Profissional>,
    @InjectModel(Avaliacao.name)
    private readonly avaliacaoModel: Model<AvaliacaoDocument>,
  ) {}

  async create(createDto: CreateEstabelecimentoDto): Promise<Estabelecimento> {
    try {
      const estabelecimento = this.estabelecimentoRepository.create(createDto);
      return await this.estabelecimentoRepository.save(estabelecimento);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('CNPJ ou e-mail já cadastrado.');
      }

      throw error;
    }
  }

  async findAll(): Promise<Estabelecimento[]> {
    return this.estabelecimentoRepository.find();
  }

  async buscar(filtros: FiltrosBusca = {}): Promise<EstabelecimentoBusca[]> {
    const nome = filtros.nome?.trim();
    const estabelecimentos = await this.estabelecimentoRepository.find({
      where: nome ? { nome: Like(`%${nome}%`) } : {},
    });

    if (estabelecimentos.length === 0) return [];

    const ids = estabelecimentos.map((estabelecimento) => estabelecimento.id);
    const servicos = await this.servicoRepository.find({
      where: { estabelecimentoId: In(ids) },
    });
    const profissionais = await this.profissionalRepository.find({
      where: { estabelecimentoId: In(ids) },
      withDeleted: true,
    });
    const avaliacoes = await this.carregarAvaliacoes(profissionais);

    const precos = this.agruparPrecos(servicos);
    const notas = this.agruparNotas(avaliacoes, profissionais);

    const latitude = numero(filtros.lat);
    const longitude = numero(filtros.lng);
    const origem =
      latitude !== null && longitude !== null ? { latitude, longitude } : null;
    const raio = numero(filtros.raio);

    const resultados = estabelecimentos.map<EstabelecimentoBusca>((estabelecimento) => {
      const nota = notas.get(estabelecimento.id);

      return {
        id: estabelecimento.id,
        nome: estabelecimento.nome,
        endereco: estabelecimento.endereco,
        descricao: estabelecimento.descricao,
        telefone: estabelecimento.telefone,
        latitude: estabelecimento.latitude,
        longitude: estabelecimento.longitude,
        horarioAbertura: estabelecimento.horarioAbertura,
        horarioFechamento: estabelecimento.horarioFechamento,
        fidelidade: estabelecimento.fidelidade,
        redeSocial: estabelecimento.redeSocial,
        fotoAtualizadaEm: estabelecimento.fotoAtualizadaEm ?? null,
        distanciaKm: origem
          ? this.arredondar(
              distanciaEmKm(
                origem.latitude,
                origem.longitude,
                estabelecimento.latitude,
                estabelecimento.longitude,
              ),
              1,
            )
          : null,
        avaliacaoMedia: nota ? this.arredondar(nota.soma / nota.total, 1) : null,
        totalAvaliacoes: nota?.total ?? 0,
        precoMinimo: precos.get(estabelecimento.id) ?? null,
      };
    });

    const visiveis =
      origem && raio !== null
        ? resultados.filter(
            (estabelecimento) =>
              estabelecimento.distanciaKm !== null &&
              estabelecimento.distanciaKm <= raio,
          )
        : resultados;

    return this.ordenar(visiveis, filtros.ordenarPor ?? 'avaliacao', filtros.ordem);
  }

  async findOne(id: string): Promise<Estabelecimento> {
    const estabelecimento = await this.estabelecimentoRepository.findOne({
      where: { id },
    });

    if (!estabelecimento) {
      throw new NotFoundException(`Estabelecimento com ID ${id} não encontrado.`);
    }

    return estabelecimento;
  }

  async findByGestorId(gestorId: string): Promise<Estabelecimento[]> {
    return this.estabelecimentoRepository.find({
      where: { gestorId },
    });
  }

  async update(
    id: string,
    gestorId: string,
    updateDto: UpdateEstabelecimentoDto,
  ): Promise<Estabelecimento> {
    const estabelecimento = await this.somenteDoGestor(id, gestorId);
    const dados = { ...updateDto };
    delete dados.gestorId;
    const estabelecimentoAtualizado = Object.assign(estabelecimento, dados);

    try {
      return await this.estabelecimentoRepository.save(estabelecimentoAtualizado);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('CNPJ ou e-mail já cadastrado.');
      }

      throw error;
    }
  }

  async atualizarFoto(
    id: string,
    gestorId: string,
    arquivo?: ArquivoFoto,
  ): Promise<{ fotoAtualizadaEm: Date }> {
    await this.somenteDoGestor(id, gestorId);
    const fotoPerfil = validarFoto(arquivo);
    const fotoAtualizadaEm = new Date();
    await this.estabelecimentoRepository.update({ id }, { fotoPerfil, fotoAtualizadaEm });
    return { fotoAtualizadaEm };
  }

  async foto(id: string): Promise<{ conteudo: Buffer; tipo: string }> {
    const estabelecimento = await this.estabelecimentoRepository.findOne({
      where: { id },
      select: { id: true, fotoPerfil: true },
    });
    const conteudo = estabelecimento?.fotoPerfil;
    const tipo = conteudo ? tipoFoto(conteudo) : null;

    if (!conteudo || !tipo) {
      throw new NotFoundException('Foto do estabelecimento não encontrada.');
    }

    return { conteudo, tipo };
  }

  async remove(id: string, gestorId: string): Promise<void> {
    const estabelecimento = await this.somenteDoGestor(id, gestorId);
    await this.estabelecimentoRepository.remove(estabelecimento);
  }

  private async somenteDoGestor(id: string, gestorId: string): Promise<Estabelecimento> {
    const estabelecimento = await this.findOne(id);

    if (estabelecimento.gestorId !== gestorId) {
      throw new ForbiddenException('Você só pode alterar os seus estabelecimentos.');
    }

    return estabelecimento;
  }

  private async carregarAvaliacoes(profissionais: Profissional[]): Promise<Avaliacao[]> {
    if (profissionais.length === 0) return [];

    const ids = profissionais.map((profissional) => profissional.id);
    try {
      return await this.avaliacaoModel.find({ profissionalId: { $in: ids } }).exec();
    } catch {
      // A busca continua funcionando mesmo se o serviço de avaliações estiver indisponível.
      return [];
    }
  }

  private agruparPrecos(servicos: Servico[]): Map<string, number> {
    const precos = new Map<string, number>();

    for (const servico of servicos) {
      const atual = precos.get(servico.estabelecimentoId);
      if (atual === undefined || servico.preco < atual) {
        precos.set(servico.estabelecimentoId, servico.preco);
      }
    }

    return precos;
  }

  private agruparNotas(
    avaliacoes: Avaliacao[],
    profissionais: Profissional[],
  ): Map<string, NotasEstabelecimento> {
    const estabelecimentoDoProfissional = new Map(
      profissionais.map((profissional) => [profissional.id, profissional.estabelecimentoId]),
    );
    const notas = new Map<string, NotasEstabelecimento>();

    for (const avaliacao of avaliacoes) {
      const estabelecimentoId = estabelecimentoDoProfissional.get(avaliacao.profissionalId);
      if (!estabelecimentoId) continue;

      const atual = notas.get(estabelecimentoId) ?? { soma: 0, total: 0 };
      atual.soma += avaliacao.nota;
      atual.total += 1;
      notas.set(estabelecimentoId, atual);
    }

    return notas;
  }

  private ordenar(
    resultados: EstabelecimentoBusca[],
    ordenarPor: OrdenacaoBusca,
    ordem?: OrdemBusca,
  ): EstabelecimentoBusca[] {
    const ordemPadrao: OrdemBusca = ordenarPor === 'avaliacao' ? 'desc' : 'asc';
    const fator = (ordem ?? ordemPadrao) === 'asc' ? 1 : -1;

    return [...resultados].sort((a, b) => {
      const valorA = this.valorDe(a, ordenarPor);
      const valorB = this.valorDe(b, ordenarPor);

      if (valorA === null && valorB === null) return this.compararNomes(a, b);
      if (valorA === null) return 1;
      if (valorB === null) return -1;

      const comparacao =
        ordenarPor === 'nome'
          ? String(valorA).localeCompare(String(valorB), 'pt-BR', { sensitivity: 'base' })
          : Number(valorA) - Number(valorB);

      return comparacao * fator || this.compararNomes(a, b);
    });
  }

  private valorDe(
    estabelecimento: EstabelecimentoBusca,
    ordenarPor: OrdenacaoBusca,
  ): number | string | null {
    switch (ordenarPor) {
      case 'distancia':
        return estabelecimento.distanciaKm;
      case 'preco':
        return estabelecimento.precoMinimo;
      case 'avaliacao':
        return estabelecimento.avaliacaoMedia;
      case 'nome':
        return estabelecimento.nome;
    }
  }

  private compararNomes(a: EstabelecimentoBusca, b: EstabelecimentoBusca): number {
    return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
  }

  private arredondar(valor: number, casas: number): number {
    const fator = 10 ** casas;
    return Math.round(valor * fator) / fator;
  }
}
