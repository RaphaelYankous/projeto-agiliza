import { PartialType } from '@nestjs/swagger';
import { CreateAvaliacoeDto } from './create-avaliacoes.dto.js';

export class UpdateAvaliacoeDto extends PartialType(CreateAvaliacoeDto) {}
