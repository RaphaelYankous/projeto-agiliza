import { PartialType } from '@nestjs/swagger';
import { GestorCreateDto } from './gestor-create.dto.js';

export class GestorUpdateDto extends PartialType(GestorCreateDto) {}