import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, LessThan, MoreThan, Not } from 'typeorm';
import { BloqueioAgenda } from '../agenda/entities/bloqueio-agenda.entity.js';
import { DisponibilidadeProfissional } from '../agenda/entities/disponibilidade-profissional.entity.js';
import { Cliente } from '../clientes/entities/cliente.entity.js';
import { EmailService } from '../email/email.service.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto.js';
import { Agendamento, StatusAgendamento } from './entities/agendamento.entity.js';
import { FidelidadeService } from '../fidelidade/fidelidade.service.js';
import { UpdateAgendamentoStatusDto } from './dto/update-agendamento-status.dto.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { alinhadoAoPasso } from '../agenda/regras-horario.js';

const MS_POR_MINUTO = 60_000;

export type AgendamentoDoClienteResposta = {
  id: string;
  status: StatusAgendamento;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  clienteId: string;
  servico: { id: string; nome: string };
  profissional: { id: string; nome: string; sobrenome: string };
  estabelecimento: { id: string; nome: string; fotoAtualizadaEm: Date | null };
};

export type ResumoMensalEstabelecimento = {
  servicosRealizados: number;
  agendamentos: number;
  faturamentoEstimado: number;
  agendamentosHoje: number;
};

// "09:30:00" -> 570 (minutos desde a meia-noite)
function horarioParaMinutos(horario: string): number {
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

function minutosDoDia(data: Date): number {
  return data.getHours() * 60 + data.getMinutes();
}

// Date -> "2030-10-21" (dia no horário local, o mesmo formato da coluna date dos bloqueios)
function dataLocal(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

@Injectable()
export class AgendamentosService {
  private readonly logger = new Logger(AgendamentosService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly fidelidadeService: FidelidadeService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  // Lista os agendamentos do cliente do token, do mais recente ao mais antigo.
  // O cliente é sempre achado pelo usuário do token, nunca por um ID vindo da URL.
  async listarDoCliente(usuarioId: string): Promise<AgendamentoDoClienteResposta[]> {
    const manager = this.dataSource.manager;

    const cliente = await manager.findOne(Cliente, {
      where: { usuarioId },
      loadEagerRelations: false,
    });
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    // withDeleted: o histórico mantém o profissional que já foi excluído.
    // select: não carrega as fotos (blob) do profissional nem os campos que a tela não usa.
    const agendamentos = await manager.find(Agendamento, {
      where: { clienteId: cliente.id },
      relations: { servico: true, profissional: { usuario: true } },
      select: {
        id: true,
        status: true,
        dataHoraInicio: true,
        dataHoraFim: true,
        clienteId: true,
        servico: { id: true, nome: true },
        profissional: {
          id: true,
          estabelecimentoId: true,
          usuario: { id: true, nome: true, sobrenome: true },
        },
      },
      withDeleted: true,
      loadEagerRelations: false,
      order: { dataHoraInicio: 'DESC' },
    });
    if (agendamentos.length === 0) return [];

    // O profissional só guarda o ID do estabelecimento, então o nome vem de uma segunda consulta.
    const estabelecimentoIds = [
      ...new Set(agendamentos.map((agendamento) => agendamento.profissional.estabelecimentoId)),
    ];
    const estabelecimentos = await manager.find(Estabelecimento, {
      where: { id: In(estabelecimentoIds) },
      select: { id: true, nome: true, fotoAtualizadaEm: true },
      loadEagerRelations: false,
    });
    const porId = new Map(
      estabelecimentos.map((estabelecimento) => [estabelecimento.id, estabelecimento]),
    );

    return agendamentos.map((agendamento) => {
      const { servico, profissional } = agendamento;
      const estabelecimento = porId.get(profissional.estabelecimentoId);
      return {
        id: agendamento.id,
        status: agendamento.status,
        dataHoraInicio: agendamento.dataHoraInicio,
        dataHoraFim: agendamento.dataHoraFim,
        clienteId: agendamento.clienteId,
        servico: { id: servico.id, nome: servico.nome },
        profissional: {
          id: profissional.id,
          nome: profissional.usuario.nome,
          sobrenome: profissional.usuario.sobrenome,
        },
        estabelecimento: {
          id: profissional.estabelecimentoId,
          nome: estabelecimento?.nome ?? 'Estabelecimento indisponível',
          fotoAtualizadaEm: estabelecimento?.fotoAtualizadaEm ?? null,
        },
      };
    });
  }

  // Resumo do mês para o painel do gestor: serviços concluídos, agendamentos
  // ativos (sem cancelados), faturamento estimado (soma dos preços dos serviços
  // dos agendamentos ativos) e agendamentos de hoje.
  async resumoMensalDoEstabelecimento(
    gestorId: string,
    estabelecimentoId: string,
  ): Promise<ResumoMensalEstabelecimento> {
    const manager = this.dataSource.manager;

    const estabelecimento = await manager.findOne(Estabelecimento, {
      where: { id: estabelecimentoId },
      loadEagerRelations: false,
    });
    if (!estabelecimento) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    if (estabelecimento.gestorId !== gestorId) {
      throw new ForbiddenException('Você só pode consultar os seus estabelecimentos.');
    }

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const fimHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);

    const doEstabelecimento = () =>
      manager
        .createQueryBuilder(Agendamento, 'agendamento')
        .innerJoin('agendamento.profissional', 'profissional')
        .where('profissional.estabelecimentoId = :estabelecimentoId', { estabelecimentoId });

    const agendamentosDoMes = await doEstabelecimento()
      .leftJoinAndSelect('agendamento.servico', 'servico')
      .andWhere(
        'agendamento.dataHoraInicio >= :inicioMes AND agendamento.dataHoraInicio < :fimMes',
        { inicioMes, fimMes },
      )
      .getMany();

    const agendamentosHoje = await doEstabelecimento()
      .andWhere(
        'agendamento.dataHoraInicio >= :inicioHoje AND agendamento.dataHoraInicio < :fimHoje',
        { inicioHoje, fimHoje },
      )
      .andWhere('agendamento.status != :cancelado', { cancelado: StatusAgendamento.CANCELADO })
      .getCount();

    const ativos = agendamentosDoMes.filter(
      (agendamento) => agendamento.status !== StatusAgendamento.CANCELADO,
    );

    return {
      servicosRealizados: agendamentosDoMes.filter(
        (agendamento) => agendamento.status === StatusAgendamento.CONCLUIDO,
      ).length,
      agendamentos: ativos.length,
      faturamentoEstimado: ativos.reduce(
        (total, agendamento) => total + (agendamento.servico?.preco ?? 0),
        0,
      ),
      agendamentosHoje,
    };
  }

  // Só muda o status para cancelado; o horário volta a ficar livre.
  async cancel(usuarioId: string, id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');
    let emailAgendamento: { agendamento: Agendamento; cliente: Cliente };

    try {
      const manager = queryRunner.manager;

      // Trava o agendamento para evitar cancelamento duplo.
      const agendamento = await manager.findOne(Agendamento, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
        loadEagerRelations: false,
      });
      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${id} não encontrado.`);
      }

      const cliente = await manager.findOne(Cliente, {
        where: { usuarioId },
        loadEagerRelations: false,
      });
      if (!cliente) {
        throw new NotFoundException('Cliente não encontrado.');
      }

      if (agendamento.clienteId !== cliente.id) {
        throw new ForbiddenException('Você só pode cancelar os seus próprios agendamentos.');
      }

      if (agendamento.status === StatusAgendamento.CANCELADO) {
        throw new ConflictException('O agendamento já foi cancelado.');
      }
      if (agendamento.status === StatusAgendamento.CONCLUIDO) {
        throw new ConflictException('Não é possível cancelar um agendamento concluído.');
      }

      agendamento.status = StatusAgendamento.CANCELADO;
      await manager.save(agendamento);

      await queryRunner.commitTransaction();
      emailAgendamento = { agendamento, cliente };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // E-mail só depois do commit.
    await this.notificar('cancelado', emailAgendamento.agendamento, emailAgendamento.cliente);
    await this.registrarNotificacao(id, 'agendamento_cancelado');
  }

  private async registrarNotificacao(
    agendamentoId: string,
    tipo: 'agendamento_criado' | 'agendamento_cancelado',
  ): Promise<void> {
    try {
      await this.notificacoesService.criarParaAgendamento(agendamentoId, tipo);
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      this.logger.error(`Não foi possível registrar a notificação ${tipo}: ${motivo}`);
    }
  }

  // Erro no e-mail só vai para o log, não afeta o agendamento.
  private async notificar(
    tipo: 'criado' | 'cancelado',
    agendamento: Agendamento,
    cliente: Cliente,
  ): Promise<void> {
    try {
      const manager = this.dataSource.manager;
      const [clienteComUsuario, profissional, servico] = await Promise.all([
        manager.findOneOrFail(Cliente, { where: { id: cliente.id } }),
        manager.findOneOrFail(Profissional, { where: { id: agendamento.profissionalId } }),
        manager.findOneOrFail(Servico, { where: { id: agendamento.servicoId } }),
      ]);
      const estabelecimento = await manager.findOneOrFail(Estabelecimento, {
        where: { id: profissional.estabelecimentoId },
      });

      const { usuario } = clienteComUsuario;
      const dados = {
        destinatarioEmail: usuario.email,
        destinatarioNome: usuario.nome,
        servicoNome: servico.nome,
        profissionalNome: profissional.usuario.nome,
        estabelecimentoNome: estabelecimento.nome,
        dataHoraInicio: agendamento.dataHoraInicio,
      };
      if (tipo === 'criado') {
        await this.emailService.enviarAgendamentoCriado(dados);
      } else {
        await this.emailService.enviarAgendamentoCancelado(dados);
      }
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      this.logger.error(`Não foi possível enviar o e-mail de agendamento ${tipo}: ${motivo}`);
    }
  }

  async create(usuarioId: string, dto: CreateAgendamentoDto): Promise<Agendamento> {
    const inicio = new Date(dto.dataHoraInicio);

    if (inicio.getTime() <= Date.now()) {
      throw new BadRequestException('O horário do agendamento deve estar no futuro.');
    }

    if (!alinhadoAoPasso(minutosDoDia(inicio)) || inicio.getSeconds() || inicio.getMilliseconds()) {
      throw new BadRequestException('O horário precisa começar em hora cheia ou meia hora.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    // READ COMMITTED para enxergar agendamentos já confirmados por outros clientes.
    await queryRunner.startTransaction('READ COMMITTED');
    let salvo: Agendamento;
    let clienteDoAgendamento: Cliente;

    try {
      const manager = queryRunner.manager;

      // Trava o profissional para dois clientes não reservarem o mesmo horário.
      const profissional = await manager.findOne(Profissional, {
        where: { id: dto.profissionalId },
        lock: { mode: 'pessimistic_write' },
        loadEagerRelations: false,
      });
      if (!profissional) {
        throw new NotFoundException(`Profissional com ID ${dto.profissionalId} não encontrado.`);
      }

      const cliente = await manager.findOne(Cliente, {
        where: { usuarioId },
        loadEagerRelations: false,
      });
      if (!cliente) {
        throw new NotFoundException('Cliente não encontrado.');
      }

      const servico = await manager.findOne(Servico, { where: { id: dto.servicoId } });
      if (!servico) {
        throw new NotFoundException(`Serviço com ID ${dto.servicoId} não encontrado.`);
      }

      if (servico.estabelecimentoId !== profissional.estabelecimentoId) {
        throw new BadRequestException(
          'O serviço e o profissional precisam ser do mesmo estabelecimento.',
        );
      }

      const estabelecimento = await manager.findOneOrFail(Estabelecimento, {
        where: { id: profissional.estabelecimentoId },
      });

      const fim = new Date(inicio.getTime() + servico.duracao * MS_POR_MINUTO);

      const mesmoDia = inicio.toDateString() === fim.toDateString();
      const cabeNoExpediente =
        mesmoDia &&
        minutosDoDia(inicio) >= horarioParaMinutos(estabelecimento.horarioAbertura) &&
        minutosDoDia(fim) <= horarioParaMinutos(estabelecimento.horarioFechamento);
      if (!cabeNoExpediente) {
        throw new BadRequestException(
          'O atendimento precisa caber no horário de funcionamento do estabelecimento.',
        );
      }

      // Confere disponibilidade e bloqueios do profissional.
      const inicioMin = minutosDoDia(inicio);
      const fimMin = minutosDoDia(fim);

      const disponibilidades = await manager.find(DisponibilidadeProfissional, {
        where: { profissionalId: profissional.id, diaSemana: inicio.getDay(), ativo: true },
      });
      const dentroDaDisponibilidade = disponibilidades.some(
        (d) =>
          inicioMin >= horarioParaMinutos(d.horaInicio) && fimMin <= horarioParaMinutos(d.horaFim),
      );
      if (!dentroDaDisponibilidade) {
        throw new BadRequestException(
          'O profissional não atende neste horário. Escolha um horário dentro da agenda dele.',
        );
      }

      const bloqueios = await manager.find(BloqueioAgenda, {
        where: { profissionalId: profissional.id, data: dataLocal(inicio) },
      });
      // Bloqueio sem horário vale o dia todo.
      const bloqueado = bloqueios.some(
        (b) =>
          !b.horaInicio ||
          !b.horaFim ||
          (inicioMin < horarioParaMinutos(b.horaFim) && fimMin > horarioParaMinutos(b.horaInicio)),
      );
      if (bloqueado) {
        throw new BadRequestException('O profissional está com a agenda bloqueada neste horário.');
      }

      // Agendamento cancelado não bloqueia o horário.
      const horarioOcupado = await manager.exists(Agendamento, {
        where: {
          profissionalId: profissional.id,
          status: Not(StatusAgendamento.CANCELADO),
          dataHoraInicio: LessThan(fim),
          dataHoraFim: MoreThan(inicio),
        },
      });
      if (horarioOcupado) {
        throw new ConflictException('O horário selecionado não está mais disponível.');
      }

      const agendamento = manager.create(Agendamento, {
        clienteId: cliente.id,
        profissionalId: profissional.id,
        servicoId: servico.id,
        status: StatusAgendamento.PENDENTE,
        dataHoraInicio: inicio,
        dataHoraFim: fim,
      });
      salvo = await manager.save(agendamento);
      clienteDoAgendamento = cliente;

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // E-mail só depois do commit.
    await this.notificar('criado', salvo, clienteDoAgendamento);
    await this.registrarNotificacao(salvo.id, 'agendamento_criado');
    return salvo;
  }
  async updateStatus(id: string, dto: UpdateAgendamentoStatusDto): Promise<Agendamento> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      const manager = queryRunner.manager;
      const agendamento = await manager.findOne(Agendamento, {
        where: { id },
        relations: { profissional: true, servico: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${id} não encontrado.`);
      }

      const estadoDefinitivo =
        agendamento.status === StatusAgendamento.CONCLUIDO ||
        agendamento.status === StatusAgendamento.CANCELADO;
      if (estadoDefinitivo && dto.status !== agendamento.status) {
        throw new ConflictException(
          'Não é possível alterar o status de um agendamento concluído ou cancelado.',
        );
      }

      const concluindo =
        dto.status === StatusAgendamento.CONCLUIDO &&
        agendamento.status !== StatusAgendamento.CONCLUIDO;

      agendamento.status = dto.status;
      const atualizado = await manager.save(Agendamento, agendamento);

      if (concluindo && agendamento.servico.pontoFidelidade > 0) {
        const estabelecimento = await manager.findOne(Estabelecimento, {
          where: { id: agendamento.profissional.estabelecimentoId },
        });
        if (!estabelecimento) {
          throw new NotFoundException('Estabelecimento do agendamento não encontrado.');
        }
        if (estabelecimento.fidelidade) {
          await this.fidelidadeService.creditarPontosNaTransacao(
            manager,
            agendamento.clienteId,
            agendamento.profissional.estabelecimentoId,
            agendamento.servico.pontoFidelidade,
          );
        }
      }

      await queryRunner.commitTransaction();
      return atualizado;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
