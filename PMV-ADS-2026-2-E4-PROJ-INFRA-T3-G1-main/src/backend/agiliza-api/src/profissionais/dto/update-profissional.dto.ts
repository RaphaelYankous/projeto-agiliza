import { PartialType, PickType } from '@nestjs/swagger';
import { CreateProfissionalDto } from './create-profissional.dto.js';

export class UpdateProfissionalDto extends PartialType(
  PickType(CreateProfissionalDto, ['nome', 'sobrenome', 'email', 'telefone', 'servicoIds'] as const),
) {}
