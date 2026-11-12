import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Avaliacao, AvaliacaoSchema } from '../avaliacoes/schemas/avaliacao.schema.js';
import { PerfilProfissionalController } from './perfil-profissional.controller.js';
import { PerfilProfissionalService } from './perfil-profissional.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Avaliacao.name, schema: AvaliacaoSchema }])],
  controllers: [PerfilProfissionalController],
  providers: [PerfilProfissionalService],
})
export class PerfilProfissionalModule {}
