import { Module } from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service.js';
import { AvaliacoesController } from './avaliacoes.controller.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Avaliacao, AvaliacaoSchema } from './schemas/avaliacao.schema.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Cliente } from '../clientes/entities/cliente.entity.js';
import { AvaliacoesClienteController } from './avaliacoes-cliente.controller.js';
import { AvaliacoesClienteService } from './avaliacoes-cliente.service.js';
import { AvaliacaoVinculo, AvaliacaoVinculoSchema } from './schemas/avaliacao-vinculo.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Avaliacao.name, schema: AvaliacaoSchema },
      { name: AvaliacaoVinculo.name, schema: AvaliacaoVinculoSchema },
    ]),
    TypeOrmModule.forFeature([Agendamento, Cliente]),
  ],
  controllers: [AvaliacoesController, AvaliacoesClienteController],
  providers: [AvaliacoesService, AvaliacoesClienteService],
  exports: [AvaliacoesService], // <-- Exportar o serviço
})
export class AvaliacoesModule {}