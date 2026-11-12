import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DisponibilidadeProfissional } from './entities/disponibilidade-profissional.entity.js';
import { BloqueioAgenda } from './entities/bloqueio-agenda.entity.js';
import { Agendamento, StatusAgendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto.js';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto.js';
import { CreateBloqueioDto } from './dto/create-bloqueio.dto.js';
import { type HorarioSemanal, PASSO_HORARIO_MINUTOS, primeiroHorarioAlinhado, validarHorario } from './regras-horario.js';

@Injectable()
export class AgendasService {
  constructor(
    @InjectRepository(DisponibilidadeProfissional)
    private readonly disponibilidadeRepository: Repository<DisponibilidadeProfissional>,
    @InjectRepository(BloqueioAgenda)
    private readonly bloqueioRepository: Repository<BloqueioAgenda>,
    @InjectRepository(Agendamento)
    private readonly agendamentoRepository: Repository<Agendamento>,
    @InjectRepository(Servico)
    private readonly servicoRepository: Repository<Servico>,
    @InjectRepository(Estabelecimento)
    private readonly estabelecimentoRepository: Repository<Estabelecimento>,
    @InjectRepository(Profissional)
    private readonly profissionalRepository: Repository<Profissional>,
  ) {}

  private async garantirProfissionalDoGestor(profissionalId: string, gestorId: string) {
    const profissional = await this.profissionalRepository.findOne({
      where: { id: profissionalId },
      loadEagerRelations: false,
    });
    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado.');
    }
    const estabelecimento = await this.estabelecimentoRepository.findOneBy({
      id: profissional.estabelecimentoId,
    });
    if (!estabelecimento) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    if (estabelecimento.gestorId !== gestorId) {
      throw new ForbiddenException('Este profissional não pertence ao seu estabelecimento.');
    }
    return estabelecimento;
  }

  private async garantirHorarioValido(
    profissionalId: string,
    horario: HorarioSemanal,
    estabelecimento: Estabelecimento,
    ignorarId?: string,
  ) {
    const existentes = await this.disponibilidadeRepository.find({
      where: { profissionalId, diaSemana: horario.diaSemana },
    });
    const erro = validarHorario(
      horario,
      existentes.filter((existente) => existente.id !== ignorarId),
      estabelecimento,
    );
    if (erro) {
      throw new BadRequestException(erro);
    }
  }

  // ---------- Disponibilidades ----------

  async createDisponibilidade(profissionalId: string, dto: CreateDisponibilidadeDto, gestorId: string) {
    const estabelecimento = await this.garantirProfissionalDoGestor(profissionalId, gestorId);
    await this.garantirHorarioValido(profissionalId, dto, estabelecimento);
    const disponibilidade = this.disponibilidadeRepository.create({
      ...dto,
      profissionalId,
    });
    return this.disponibilidadeRepository.save(disponibilidade);
  }

  findDisponibilidadesByProfissional(profissionalId: string) {
    return this.disponibilidadeRepository.find({
      where: { profissionalId },
      order: { diaSemana: 'ASC', horaInicio: 'ASC' },
    });
  }

  async updateDisponibilidade(id: string, dto: UpdateDisponibilidadeDto, gestorId: string) {
    const disponibilidade = await this.disponibilidadeRepository.findOneBy({ id });
    if (!disponibilidade) {
      throw new NotFoundException('Disponibilidade não encontrada');
    }
    const estabelecimento = await this.garantirProfissionalDoGestor(
      disponibilidade.profissionalId,
      gestorId,
    );
    if (dto.diaSemana !== undefined || dto.horaInicio !== undefined || dto.horaFim !== undefined) {
      await this.garantirHorarioValido(
        disponibilidade.profissionalId,
        { ...disponibilidade, ...dto },
        estabelecimento,
        disponibilidade.id,
      );
    }
    Object.assign(disponibilidade, dto);
    return this.disponibilidadeRepository.save(disponibilidade);
  }

  async removeDisponibilidade(id: string, gestorId: string) {
    const disponibilidade = await this.disponibilidadeRepository.findOneBy({ id });
    if (!disponibilidade) {
      throw new NotFoundException('Disponibilidade não encontrada');
    }
    await this.garantirProfissionalDoGestor(disponibilidade.profissionalId, gestorId);
    await this.disponibilidadeRepository.delete(id);
  }

  // ---------- Bloqueios ----------

  async createBloqueio(profissionalId: string, dto: CreateBloqueioDto, gestorId: string) {
    await this.garantirProfissionalDoGestor(profissionalId, gestorId);
    const bloqueio = this.bloqueioRepository.create({
      ...dto,
      profissionalId,
    });
    return this.bloqueioRepository.save(bloqueio);
  }

  async findBloqueiosByProfissional(profissionalId: string, gestorId: string) {
    await this.garantirProfissionalDoGestor(profissionalId, gestorId);
    return this.bloqueioRepository.find({
      where: { profissionalId },
      order: { data: 'ASC' },
    });
  }

  async removeBloqueio(id: string, gestorId: string) {
    const bloqueio = await this.bloqueioRepository.findOneBy({ id });
    if (!bloqueio) {
      throw new NotFoundException('Bloqueio não encontrado');
    }
    await this.garantirProfissionalDoGestor(bloqueio.profissionalId, gestorId);
    await this.bloqueioRepository.delete(id);
  }

  // ---------- Horários disponíveis ----------
    async getHorariosDisponiveis(profissionalId: string, data: string, servicoId: string) {
    const servico = await this.servicoRepository.findOneBy({ id: servicoId });
    if (!servico) {
        throw new NotFoundException('Serviço não encontrado');
    }
    const estabelecimento = await this.estabelecimentoRepository.findOneBy({
        id: servico.estabelecimentoId,
    });
    if (!estabelecimento) {
        throw new NotFoundException('Estabelecimento não encontrado');
    }
    const duracaoMinutos = servico.duracao;

    const [ano, mes, dia] = data.split('-').map(Number);
    const diaSemana = new Date(ano, mes - 1, dia).getDay();

    const disponibilidades = await this.disponibilidadeRepository.find({
        where: { profissionalId, diaSemana, ativo: true },
    });

    if (disponibilidades.length === 0) {
        return [];
    }

    const bloqueios = await this.bloqueioRepository.find({
        where: { profissionalId, data },
    });

    const inicioDia = new Date(`${data}T00:00:00`);
    const fimDia = new Date(`${data}T23:59:59`);
    const agendamentos = await this.agendamentoRepository
        .createQueryBuilder('a')
        .where('a.profissionalId = :profissionalId', { profissionalId })
        .andWhere('a.status != :cancelado', { cancelado: StatusAgendamento.CANCELADO })
        .andWhere('a.dataHoraInicio BETWEEN :inicio AND :fim', { inicio: inicioDia, fim: fimDia })
        .getMany();

    const abertura = this.paraMinutos(estabelecimento.horarioAbertura);
    const fechamento = this.paraMinutos(estabelecimento.horarioFechamento);
    const agora = Date.now();
    const slots: string[] = [];

    for (const disp of disponibilidades) {
        const inicioJanela = Math.max(this.paraMinutos(disp.horaInicio), abertura);
        const fimJanela = Math.min(this.paraMinutos(disp.horaFim), fechamento);

        for (
        let minuto = primeiroHorarioAlinhado(inicioJanela);
        minuto + duracaoMinutos <= fimJanela;
        minuto += PASSO_HORARIO_MINUTOS
        ) {
        const horario = this.formatarMinutos(minuto);
        const cursor = this.combinarDataHora(data, horario);
        const slotFim = new Date(cursor.getTime() + duracaoMinutos * 60000);

        if (cursor.getTime() <= agora) continue;

        const bloqueado = bloqueios.some((b) => {
            if (!b.horaInicio || !b.horaFim) return true;
            const bInicio = this.combinarDataHora(data, b.horaInicio);
            const bFim = this.combinarDataHora(data, b.horaFim);
            return cursor < bFim && slotFim > bInicio;
        });

        const ocupado = agendamentos.some(
            (a) => cursor < a.dataHoraFim && slotFim > a.dataHoraInicio,
        );

        if (!bloqueado && !ocupado) {
            slots.push(horario);
        }
        }
    }

    return slots.sort();
    }

    private paraMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
    }

    private formatarMinutos(minutos: number): string {
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
    }

    private combinarDataHora(data: string, hora: string): Date {
    const horaFormatada = hora.length === 5 ? `${hora}:00` : hora;
    return new Date(`${data}T${horaFormatada}`);
    }
}