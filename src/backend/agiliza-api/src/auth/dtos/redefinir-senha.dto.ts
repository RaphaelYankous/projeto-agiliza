import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RedefinirSenhaDto {
  @IsString({ message: 'Token inválido.' })
  @IsNotEmpty({ message: 'O token é obrigatório.' })
  token: string;

  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(6, { message: 'A senha deve conter no mínimo 6 caracteres.' })
  novaSenha: string;
}