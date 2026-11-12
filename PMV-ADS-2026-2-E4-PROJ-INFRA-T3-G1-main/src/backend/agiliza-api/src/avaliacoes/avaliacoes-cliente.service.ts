import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import type { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { Agendamento, StatusAgendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Cliente } from '../clientes/entities/cliente.entity.js';
import { tipoFoto, validarFotoOpcional, type ArquivoFoto } from '../common/utils/foto-perfil.js';
import type { CriarAvaliacaoClienteDto } from './dto/criar-avaliacao-cliente.dto.js';
import { Avaliacao, type AvaliacaoDocument } from './schemas/avaliacao.schema.js';
import {
  AvaliacaoVinculo,
  type AvaliacaoVinculoDocument,
} from './schemas/avaliacao-vinculo.schema.js';

export type AvaliacaoClienteResposta = {
  id: string;
  agendamentoId: string;
  nota: number;
  comentario: string;
  temFoto: boolean;
};

export type AvaliacaoDoClienteResumo = {
  agendamentoId: string;
  nota: number;
  comentario: string;
  temFoto: boolean;
};

const JA_AVALIADO = 'Este atendimento já foi avaliado.';
const CODIGO_DUPLICADO = 11000;

@Injectable()
export class AvaliacoesClienteService {
  constructor(
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(Agendamento) private readonly agendamentos: Repository<Agendamento>,
    @InjectModel(Avaliacao.name) private readonly avaliacaoModel: Model<AvaliacaoDocument>,
    @InjectModel(AvaliacaoVinculo.name)
    private readonly vinculoModel: Model<AvaliacaoVinculoDocument>,
  ) {}

  async criar(
    usuarioId: string,
    agendamentoId: string,
    dto: CriarAvaliacaoClienteDto,
    arquivo?: ArquivoFoto,
  ): Promise<AvaliacaoClienteResposta> {
    const cliente = await this.buscarCliente(usuarioId);

    const agendamento = await this.agendamentos.findOne({
      where: { id: agendamentoId },
      withDeleted: true,
      loadEagerRelations: false,
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    if (agendamento.clienteId !== cliente.id) {
      throw new ForbiddenException('Este agendamento pertence a outro cliente.');
    }
    if (agendamento.status !== StatusAgendamento.CONCLUIDO) {
      throw new ConflictException('Só é possível avaliar atendimentos concluídos.');
    }

    // Cobre também avaliações criadas pela rota antiga POST /avaliacoes.
    if (await this.avaliacaoModel.exists({ agendamentoId })) {
      throw new ConflictException(JA_AVALIADO);
    }

    const foto = validarFotoOpcional(arquivo) ?? undefined;
    const comentario = dto.comentario?.trim() || undefined;

    // O vínculo único é gravado primeiro: se dois envios chegarem juntos, só um passa.
    try {
      await this.vinculoModel.create({ agendamentoId, clienteId: cliente.id, foto });
    } catch (erro) {
      if ((erro as { code?: number }).code === CODIGO_DUPLICADO) {
        throw new ConflictException(JA_AVALIADO);
      }
      throw erro;
    }

    try {
      const avaliacao = await this.avaliacaoModel.create({
        clienteId: cliente.id,
        profissionalId: agendamento.profissionalId,
        agendamentoId,
        nota: Number(dto.nota),
        comentario,
      });
      await this.vinculoModel.updateOne({ agendamentoId }, { avaliacaoId: String(avaliacao._id) });
      return {
        id: String(avaliacao._id),
        agendamentoId,
        nota: avaliacao.nota,
        comentario: avaliacao.comentario ?? '',
        temFoto: Boolean(foto),
      };
    } catch (erro) {
      // Não deixa o atendimento "preso" como avaliado sem avaliação.
      await this.vinculoModel.deleteOne({ agendamentoId });
      throw erro;
    }
  }

  async listarDoCliente(usuarioId: string): Promise<AvaliacaoDoClienteResumo[]> {
    const cliente = await this.buscarCliente(usuarioId);
    const avaliacoes = await this.avaliacaoModel
      .find({ clienteId: cliente.id }, { agendamentoId: 1, nota: 1, comentario: 1 })
      .exec();
    // A foto não é carregada aqui: só se consulta quais vínculos têm foto.
    const comFoto = await this.vinculoModel
      .find({ clienteId: cliente.id, foto: { $type: 'binData' } }, { agendamentoId: 1 })
      .exec();
    const idsComFoto = new Set(comFoto.map((vinculo) => vinculo.agendamentoId));
    return avaliacoes.map(({ agendamentoId, nota, comentario }) => ({
      agendamentoId,
      nota,
      comentario: comentario ?? '',
      temFoto: idsComFoto.has(agendamentoId),
    }));
  }

  // Só o dono da avaliação recebe a foto; para os demais o resultado é 404.
  async buscarFoto(usuarioId: string, agendamentoId: string): Promise<{ conteudo: Buffer; tipo: string }> {
    const cliente = await this.buscarCliente(usuarioId);
    const vinculo = await this.vinculoModel
      .findOne({ agendamentoId, clienteId: cliente.id })
      .select('+foto')
      .exec();
    const tipo = vinculo?.foto ? tipoFoto(vinculo.foto) : null;
    if (!vinculo?.foto || !tipo) throw new NotFoundException('Foto não encontrada.');
    return { conteudo: vinculo.foto, tipo };
  }

  private async buscarCliente(usuarioId: string): Promise<Cliente> {
    const cliente = await this.clientes.findOne({
      where: { usuarioId },
      loadEagerRelations: false,
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');
    return cliente;
  }
}
