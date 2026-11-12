import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const COMENTARIO_MAXIMO = 500;

export class CriarAvaliacaoClienteDto {
  // Em multipart/form-data todo campo chega como texto; o @Type converte "4" em 4.
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  nota: number;

  @ApiProperty({ example: 'Excelente atendimento!', required: false, maxLength: COMENTARIO_MAXIMO })
  @IsOptional()
  @IsString()
  @MaxLength(COMENTARIO_MAXIMO)
  comentario?: string;
}
