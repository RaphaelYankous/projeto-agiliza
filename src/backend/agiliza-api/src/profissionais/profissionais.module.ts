import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from './entities/profissional.entity.js';
import { ProfissionaisService } from './profissionais.service.js';
import { ProfissionaisController } from './profissionais.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profissional, Estabelecimento]),
  ],
  controllers: [
    ProfissionaisController,
  ],
  providers: [
    ProfissionaisService,
  ],
  exports: [
    ProfissionaisService,
  ],
})
export class ProfissionaisModule {}
