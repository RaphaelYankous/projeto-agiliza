import { IsEnum, IsInt } from 'class-validator';
import { StatusAgendamento } from '../entities/agendamento.entity.js';

export class UpdateAgendamentoStatusDto {
  @IsEnum(StatusAgendamento)
  @IsInt()
  status: StatusAgendamento;
}
