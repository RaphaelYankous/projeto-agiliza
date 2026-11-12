import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Agendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Notificacao } from './entities/notificacao.entity.js';

export type NotificacaoResposta = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadaEm: Date;
};

@Injectable()
export class NotificacoesService {
  constructor(private readonly dataSource: DataSource) {}

  async listar(usuarioId: string): Promise<NotificacaoResposta[]> {
    const notificacoes = await this.dataSource.manager.find(Notificacao, {
      where: { usuarioId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return notificacoes.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      titulo: item.titulo,
      mensagem: item.mensagem,
      lida: item.lida,
      criadaEm: item.createdAt,
    }));
  }

  async marcarComoLida(usuarioId: string, id: string): Promise<void> {
    const resultado = await this.dataSource.manager.update(
      Notificacao,
      { id, usuarioId },
      { lida: true },
    );
    if (!resultado.affected) throw new NotFoundException('Notificação não encontrada.');
  }

  async criarParaAgendamento(id: string, tipo: 'agendamento_criado' | 'agendamento_cancelado') {
    const agendamento = await this.dataSource.manager.findOne(Agendamento, {
      where: { id },
      relations: { cliente: { usuario: true }, profissional: { usuario: true }, servico: true },
      loadEagerRelations: false,
    });
    if (!agendamento) return;

    const estabelecimento = await this.dataSource.manager.findOne(Estabelecimento, {
      where: { id: agendamento.profissional.estabelecimentoId },
      select: { id: true, nome: true, gestorId: true },
      loadEagerRelations: false,
    });
    if (!estabelecimento) return;

    const quando = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(agendamento.dataHoraInicio);
    const cancelado = tipo === 'agendamento_cancelado';
    const titulo = cancelado ? 'Agendamento cancelado' : 'Novo agendamento';
    const mensagem = cancelado
      ? `${agendamento.servico.nome} em ${quando} foi cancelado.`
      : `${agendamento.servico.nome} em ${quando} foi criado.`;
    const destinatarios = [
      agendamento.cliente.usuarioId,
      agendamento.profissional.usuarioId,
      estabelecimento.gestorId,
    ];

    await this.dataSource.manager.save(
      destinatarios.map((usuarioId) =>
        this.dataSource.manager.create(Notificacao, { usuarioId, tipo, titulo, mensagem }),
      ),
    );
  }
}
