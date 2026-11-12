import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches, IsString } from 'class-validator';

export class CreateBloqueioDto {
  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  data: string;

  @ApiProperty({ required: false, example: '13:00', description: 'Omitir = dia inteiro bloqueado' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'horaInicio deve estar no formato HH:mm' })
  horaInicio?: string;

  @ApiProperty({ required: false, example: '14:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'horaFim deve estar no formato HH:mm' })
  horaFim?: string;

  @ApiProperty({ required: false, example: 'Consulta médica' })
  @IsOptional()
  @IsString()
  motivo?: string;
}