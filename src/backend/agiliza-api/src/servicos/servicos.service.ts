import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servico } from './entities/servico.entity.js';
import { Agendamento } from '../agendamentos/entities/agendamento.entity.js';
import { CreateServicoDto } from './dto/create-servico.dto.js';
import { UpdateServicoDto } from './dto/update-servico.dto.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';

@Injectable()
export class ServicosService {
  constructor(
    @InjectRepository(Servico)
    private readonly servicoRepository: Repository<Servico>,
    @InjectRepository(Estabelecimento)
    private readonly estabelecimentoRepository: Repository<Estabelecimento>,
    @InjectRepository(Agendamento)
    private readonly agendamentoRepository: Repository<Agendamento>,
  ) {}

  private async garantirEstabelecimentoDoGestor(
    estabelecimentoId: string,
    gestorId: string,
  ): Promise<void> {
    const estabelecimento = await this.estabelecimentoRepository.findOneBy({
      id: estabelecimentoId,
    });
    if (!estabelecimento) {
      throw new NotFoundException(
        `Estabelecimento com ID ${estabelecimentoId} não encontrado.`,
      );
    }
    if (estabelecimento.gestorId !== gestorId) {
      throw new ForbiddenException('Este estabelecimento não pertence ao gestor.');
    }
  }

  async create(
    estabelecimentoId: string,
    gestorId: string,
    createServicoDto: CreateServicoDto,
  ): Promise<Servico> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);
    const servico = this.servicoRepository.create(createServicoDto);
    return this.servicoRepository.save(servico);
  }

  async findAllByEstabelecimento(
    estabelecimentoId: string,
    gestorId: string,
  ): Promise<Servico[]> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);
    return this.servicoRepository.find({
      where: { estabelecimentoId },
    });
  }

  async findAllPublicos(estabelecimentoId: string): Promise<Servico[]> {
    return this.servicoRepository.find({ where: { estabelecimentoId } });
  }

  async findOne(
    estabelecimentoId: string,
    gestorId: string,
    id: string,
  ): Promise<Servico> {
    const servico = await this.servicoRepository.findOne({
      where: { id },
    });

    if (!servico) {
      throw new NotFoundException(`Serviço com ID ${id} não encontrado.`);
    }

    await this.garantirEstabelecimentoDoGestor(servico.estabelecimentoId, gestorId);
    return servico;
  }

  async update(
    estabelecimentoId: string,
    gestorId: string,
    id: string,
    updateServicoDto: UpdateServicoDto,
  ): Promise<Servico> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);
    const servico = await this.servicoRepository.findOne({
      where: { id, estabelecimentoId },
    });

    if (!servico) {
      throw new NotFoundException(`Serviço com ID ${id} não encontrado.`);
    }

    const { nome, preco, descricao, duracao, pontoFidelidade } = updateServicoDto;
    const dadosAtualizados = Object.fromEntries(
      Object.entries({ nome, preco, descricao, duracao, pontoFidelidade }).filter(
        ([, valor]) => valor !== undefined,
      ),
    );
    Object.assign(servico, dadosAtualizados);
    return this.servicoRepository.save(servico);
  }

  async remove(
    estabelecimentoId: string,
    gestorId: string,
    id: string,
  ): Promise<void> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);
    const servico = await this.servicoRepository.findOne({
      where: { id, estabelecimentoId },
    });

    if (!servico) {
      throw new NotFoundException(`Serviço com ID ${id} não encontrado.`);
    }

    const temAgendamentos = await this.agendamentoRepository.existsBy({
      servicoId: id,
    });

    if (temAgendamentos) {
      throw new ConflictException(`Não é possível excluir o serviço porque existem agendamentos vinculados a ele.`);
    }

    await this.servicoRepository.remove(servico);
  }
}
