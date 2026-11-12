import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesService } from './clientes.service.js';
import { ClientesController } from './clientes.controller.js';
import { Cliente } from './entities/cliente.entity.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente, Usuario])],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}