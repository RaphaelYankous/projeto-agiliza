import { IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateMeuBloqueioDto {
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFim?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}
