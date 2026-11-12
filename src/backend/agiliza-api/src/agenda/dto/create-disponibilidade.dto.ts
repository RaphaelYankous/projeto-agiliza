import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, Matches, IsBoolean, IsOptional } from 'class-validator';

export class CreateDisponibilidadeDto {
  @ApiProperty({ description: '0=domingo ... 6=sábado', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana: number;

  @ApiProperty({ example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'horaInicio deve estar no formato HH:mm' })
  horaInicio: string;

  @ApiProperty({ example: '18:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'horaFim deve estar no formato HH:mm' })
  horaFim: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}