import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AtualizarPerfilDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sobrenome: string;
}
