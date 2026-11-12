import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAvaliacoeDto {
  @ApiProperty({ description: 'ID do cliente que fez o serviço' })
  @IsString()
  @IsNotEmpty()
  clienteId: string;

  @ApiProperty({ description: 'ID do profissional avaliado' })
  @IsString()
  @IsNotEmpty()
  profissionalId: string;

  @ApiProperty({ description: 'ID do serviço/agendamento concluído' })
  @IsString()
  @IsNotEmpty()
  agendamentoId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  nota: number;

  @ApiProperty({ example: 'Excelente atendimento!', required: false })
  @IsOptional()
  @IsString()
  comentario?: string;
}