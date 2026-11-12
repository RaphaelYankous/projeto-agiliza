import { IsDateString, Matches } from 'class-validator';

export class ConsultaMinhaAgendaDto {
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data: string;
}
