import { ApiProperty, OmitType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { UsuarioDto } from '../../usuarios/dtos/usuario.dto.js';

export class CreateProfissionalDto extends OmitType(UsuarioDto, ['perfil', 'senha'] as const) {
  @ApiProperty({ example: 'SenhaForte123', minLength: 6 })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  @IsString({ message: 'validation.IS_STRING' })
  @MinLength(6)
  senha: string;

  @ApiProperty({
    example: ['c1d2e3f4-0000-4000-8000-000000000000'],
    description: 'Serviços do estabelecimento que o profissional realiza (ao menos um)',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  servicoIds: string[];
}
