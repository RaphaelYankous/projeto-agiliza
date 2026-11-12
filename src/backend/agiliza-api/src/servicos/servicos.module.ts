import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Servico } from './entities/servico.entity.js';
import { Agendamento } from '../agendamentos/entities/agendamento.entity.js';
import { ServicosService } from './servicos.service.js';
import { ServicosController } from './servicos.controller.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Servico, Estabelecimento, Agendamento])],
  controllers: [ServicosController],
  providers: [ServicosService],
  exports: [ServicosService],
})
export class ServicosModule {}
