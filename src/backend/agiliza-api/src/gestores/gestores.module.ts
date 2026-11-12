import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import { GestoresController } from './gestores.controller.js';
import { GestoresService } from './gestores.service.js';
import { Gestor } from './entities/gestor.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Gestor, Usuario])],
  controllers: [GestoresController],
  providers: [GestoresService],
})
export class GestoresModule {}