import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FidelidadeModule } from '../fidelidade/fidelidade.module.js';
import { Agendamento } from './entities/agendamento.entity.js';
import { EmailModule } from '../email/email.module.js';
import { Cliente } from '../clientes/entities/cliente.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { AgendamentosController } from './agendamentos.controller.js';
import { AgendamentosService } from './agendamentos.service.js';
import { NotificacoesModule } from '../notificacoes/notificacoes.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agendamento, Cliente, Profissional, Servico, Estabelecimento]),
    EmailModule,
  FidelidadeModule,
  NotificacoesModule,
  ],
  controllers: [AgendamentosController],
  providers: [AgendamentosService],
})
export class AgendamentosModule {}
