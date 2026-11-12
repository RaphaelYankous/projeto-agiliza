import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, LessThan, MoreThan, Not } from 'typeorm';
import { Agendamento, StatusAgendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { BloqueioAgenda } from './entities/bloqueio-agenda.entity.js';
import { DisponibilidadeProfissional } from './entities/disponibilidade-profissional.entity.js';
import { CreateMeuBloqueioDto } from './dto/create-meu-bloqueio.dto.js';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto.js';
import { validarHorario } from './regras-horario.js';

function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// DATETIME no banco não guarda fuso; manter o horário de parede da disponibilidade.
function dataHoraLocal(data: Date): string {
  const dia = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  return `${dia}T${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}:00`;
}

function limitesDia(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const inicio = new Date(ano, mes - 1, dia);
  if (`${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}` !== data) {
    throw new BadRequestException('Data inválida.');
  }
  return { inicio, fim: new Date(ano, mes - 1, dia + 1) };
}

@Injectable()
export class MinhaAgendaService {
  constructor(private readonly dataSource: DataSource) {}

  private async profissional(usuarioId: string) {
    const profissional = await this.dataSource.manager.findOne(Profissional, {
      where: { usuarioId },
      loadEagerRelations: false,
    });
    if (!profissional) throw new NotFoundException('Perfil profissional não encontrado.');
    return profissional;
  }

  async consultar(usuarioId: string, data: string) {
    const { inicio, fim } = limitesDia(data);
    const profissional = await this.profissional(usuarioId);
    return this.consultarProfissional(profissional.id, data, inicio, fim);
  }

  async consultarDoGestor(gestorId: string, profissionalId: string, data: string) {
    const { inicio, fim } = limitesDia(data);
    const profissional = await this.dataSource.manager.findOne(Profissional, {
      where: { id: profissionalId },
      loadEagerRelations: false,
    });
    if (!profissional) throw new NotFoundException('Profissional não encontrado.');

    const estabelecimento = await this.dataSource.manager.findOneBy(Estabelecimento, {
      id: profissional.estabelecimentoId,
      gestorId,
    });
    if (!estabelecimento) throw new NotFoundException('Profissional não pertence à sua barbearia.');

    return this.consultarProfissional(profissional.id, data, inicio, fim);
  }

  private async consultarProfissional(profissionalId: string, data: string, inicio: Date, fim: Date) {
    const manager = this.dataSource.manager;
    const [disponibilidades, bloqueios, agendamentos] = await Promise.all([
      manager.find(DisponibilidadeProfissional, {
        where: { profissionalId, diaSemana: inicio.getDay(), ativo: true },
        order: { horaInicio: 'ASC' },
      }),
      manager.find(BloqueioAgenda, { where: { profissionalId, data }, order: { horaInicio: 'ASC' } }),
      manager.find(Agendamento, {
        where: {
          profissionalId,
          status: Not(StatusAgendamento.CANCELADO),
          dataHoraInicio: LessThan(fim),
          dataHoraFim: MoreThan(inicio),
        },
        relations: { cliente: { usuario: true }, servico: true },
        order: { dataHoraInicio: 'ASC' },
      }),
    ]);

    // Retornar apenas os dados necessários à grade, nunca o usuário inteiro (senha, CPF etc.).
    return {
      data,
      disponibilidades: disponibilidades.map((d) => ({ horaInicio: d.horaInicio, horaFim: d.horaFim })),
      bloqueios: bloqueios.map((b) => ({ id: b.id, horaInicio: b.horaInicio, horaFim: b.horaFim, motivo: b.motivo ?? null })),
      agendamentos: agendamentos.map((a) => ({
        id: a.id,
        horaInicio: dataHoraLocal(a.dataHoraInicio),
        horaFim: dataHoraLocal(a.dataHoraFim),
        cliente: a.cliente.usuario.nome,
        servico: a.servico.nome,
        status: a.status,
      })),
    };
  }

  async listarBloqueios(usuarioId: string) {
    const profissional = await this.profissional(usuarioId);
    const bloqueios = await this.dataSource.manager.find(BloqueioAgenda, {
      where: { profissionalId: profissional.id }, order: { data: 'DESC', horaInicio: 'ASC' },
    });
    return bloqueios.map((b) => ({
      id: b.id, data: b.data, horaInicio: b.horaInicio, horaFim: b.horaFim, motivo: b.motivo ?? null,
    }));
  }

  async listarDisponibilidades(usuarioId: string) {
    const profissional = await this.profissional(usuarioId);
    return this.dataSource.manager.find(DisponibilidadeProfissional, {
      where: { profissionalId: profissional.id },
      order: { diaSemana: 'ASC', horaInicio: 'ASC' },
    });
  }

  async criarDisponibilidade(usuarioId: string, dto: CreateDisponibilidadeDto) {
    const profissional = await this.profissional(usuarioId);
    const [estabelecimento, existentes] = await Promise.all([
      this.dataSource.manager.findOne(Estabelecimento, {
        where: { id: profissional.estabelecimentoId },
        select: { id: true, horarioAbertura: true, horarioFechamento: true },
      }),
      this.dataSource.manager.find(DisponibilidadeProfissional, {
        where: { profissionalId: profissional.id, diaSemana: dto.diaSemana },
      }),
    ]);
    if (!estabelecimento) throw new NotFoundException('Estabelecimento não encontrado.');
    const erro = validarHorario(dto, existentes, estabelecimento);
    if (erro) throw new BadRequestException(erro);
    const disponibilidade = this.dataSource.manager.create(DisponibilidadeProfissional, {
      ...dto,
      profissionalId: profissional.id,
    });
    return this.dataSource.manager.save(disponibilidade);
  }

  async removerDisponibilidade(usuarioId: string, id: string): Promise<void> {
    const profissional = await this.profissional(usuarioId);
    const resultado = await this.dataSource.manager.delete(DisponibilidadeProfissional, {
      id,
      profissionalId: profissional.id,
    });
    if (!resultado.affected) throw new NotFoundException('Disponibilidade não encontrada.');
  }

  async criarBloqueio(usuarioId: string, dto: CreateMeuBloqueioDto) {
    const { inicio, fim } = limitesDia(dto.data);
    const diaInteiro = !dto.horaInicio && !dto.horaFim;
    if (!diaInteiro && (!dto.horaInicio || !dto.horaFim || minutos(dto.horaInicio) >= minutos(dto.horaFim))) {
      throw new BadRequestException('Informe o início e o fim de um intervalo válido ou deixe ambos em branco para o dia inteiro.');
    }
    const profissional = await this.profissional(usuarioId);
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction('READ COMMITTED');
    try {
      // A criação de agendamentos também trava o profissional; evita uma reserva concorrente.
      await runner.manager.findOneOrFail(Profissional, {
        where: { id: profissional.id }, lock: { mode: 'pessimistic_write' }, loadEagerRelations: false,
      });
      const bloqueios = await runner.manager.find(BloqueioAgenda, { where: { profissionalId: profissional.id, data: dto.data } });
      const agendamentos = await runner.manager.find(Agendamento, {
          where: { profissionalId: profissional.id, status: Not(StatusAgendamento.CANCELADO), dataHoraInicio: LessThan(fim), dataHoraFim: MoreThan(inicio) },
        });
      const ocupado = bloqueios.some((b) =>
        diaInteiro || !b.horaInicio || !b.horaFim || (minutos(dto.horaInicio!) < minutos(b.horaFim) && minutos(dto.horaFim!) > minutos(b.horaInicio)));
      const agendado = agendamentos.some((a) => {
        const comeco = diaInteiro ? inicio.getTime() : new Date(`${dto.data}T${dto.horaInicio}:00`).getTime();
        const termino = diaInteiro ? fim.getTime() : new Date(`${dto.data}T${dto.horaFim}:00`).getTime();
        return comeco < a.dataHoraFim.getTime() && termino > a.dataHoraInicio.getTime();
      });
      if (ocupado || agendado) throw new ConflictException('Este horário já está ocupado ou bloqueado.');

      const bloqueio = await runner.manager.save(BloqueioAgenda, runner.manager.create(BloqueioAgenda, {
        profissionalId: profissional.id, data: dto.data,
        horaInicio: dto.horaInicio ?? null, horaFim: dto.horaFim ?? null, motivo: dto.motivo?.trim() || undefined,
      }));
      await runner.commitTransaction();
      return { id: bloqueio.id, data: bloqueio.data, horaInicio: bloqueio.horaInicio, horaFim: bloqueio.horaFim, motivo: bloqueio.motivo ?? null };
    } catch (erro) {
      await runner.rollbackTransaction();
      throw erro;
    } finally {
      await runner.release();
    }
  }

  async removerBloqueio(usuarioId: string, id: string): Promise<void> {
    const profissional = await this.profissional(usuarioId);
    const resultado = await this.dataSource.manager.delete(BloqueioAgenda, { id, profissionalId: profissional.id });
    if (!resultado.affected) throw new NotFoundException('Bloqueio não encontrado.');
  }
}
