import { PartialType } from '@nestjs/swagger';
import { CreateDisponibilidadeDto } from './create-disponibilidade.dto.js';

export class UpdateDisponibilidadeDto extends PartialType(CreateDisponibilidadeDto) {}