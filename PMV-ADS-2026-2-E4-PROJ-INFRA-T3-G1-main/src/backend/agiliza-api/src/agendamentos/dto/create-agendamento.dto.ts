import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateAgendamentoDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  @IsString()
  @IsNotEmpty()
  profissionalId: string;

  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  servicoId: string;

  @ApiProperty({
    example: '2026-10-20T14:00:00-03:00',
    description: 'Início do atendimento. O fim é calculado pela duração do serviço.',
  })
  @IsDateString()
  dataHoraInicio: string;
}
