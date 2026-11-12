import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../clientes/entities/cliente.entity.js';
import { FidelidadeModule } from '../fidelidade/fidelidade.module.js';
import { PerfilClienteController } from './perfil-cliente.controller.js';
import { PerfilClienteService } from './perfil-cliente.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente]), FidelidadeModule],
  controllers: [PerfilClienteController],
  providers: [PerfilClienteService],
})
export class PerfilClienteModule {}