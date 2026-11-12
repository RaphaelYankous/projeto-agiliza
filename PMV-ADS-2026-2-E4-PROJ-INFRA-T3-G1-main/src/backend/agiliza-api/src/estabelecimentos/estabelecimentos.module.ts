import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avaliacao, AvaliacaoSchema } from '../avaliacoes/schemas/avaliacao.schema.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { EstabelecimentosController } from './estabelecimentos.controller.js';
import { EstabelecimentosService } from './estabelecimentos.service.js';
import { Estabelecimento } from './entities/estabelecimento.entity.js';
import { EstabelecimentoFoto } from './entities/estabelecimento-foto.entity.js';
import { EstabelecimentoGaleriaController } from './galeria/estabelecimento-galeria.controller.js';
import { EstabelecimentoGaleriaService } from './galeria/estabelecimento-galeria.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estabelecimento, EstabelecimentoFoto, Servico, Profissional]),
    MongooseModule.forFeature([{ name: Avaliacao.name, schema: AvaliacaoSchema }]),
  ],
  controllers: [EstabelecimentosController, EstabelecimentoGaleriaController],
  providers: [EstabelecimentosService, EstabelecimentoGaleriaService],
  exports: [EstabelecimentosService],
})
export class EstabelecimentosModule {}
