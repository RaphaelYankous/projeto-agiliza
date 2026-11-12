import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClienteEstabelecimento } from './entities/cliente-estabelecimento.entity.js';
import { FidelidadeService } from './fidelidade.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ClienteEstabelecimento])],
  providers: [FidelidadeService],
  exports: [FidelidadeService],
})
export class FidelidadeModule {}