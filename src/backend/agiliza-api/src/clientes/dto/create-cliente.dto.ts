import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateClienteDto {
  @ApiProperty({ example: 'João' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  @IsNotEmpty()
  sobrenome: string;

  @ApiProperty({ example: 'joao.silva@exemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SenhaForte123@' })
  @IsString()
  @MinLength(6)
  senha: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: '(31) 98765-4321' })
  @IsString()
  @IsNotEmpty()
  telefone: string;
}
