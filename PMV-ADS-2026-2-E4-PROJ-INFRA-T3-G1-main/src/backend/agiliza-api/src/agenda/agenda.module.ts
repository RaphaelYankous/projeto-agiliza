import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DisponibilidadeProfissional } from './entities/disponibilidade-profissional.entity.js';
import { BloqueioAgenda } from './entities/bloqueio-agenda.entity.js';
import { Agendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { AgendasService } from './agenda.service.js';
import { AgendasController } from './agenda.controller.js';
import { MinhaAgendaController } from './minha-agenda.controller.js';
import { MinhaAgendaService } from './minha-agenda.service.js';
import { GestorAgendaController } from './gestor-agenda.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DisponibilidadeProfissional,
      BloqueioAgenda,
      Agendamento,
      Servico,
      Estabelecimento,
      Profissional,
    ]),
  ],
  controllers: [AgendasController, MinhaAgendaController, GestorAgendaController],
  providers: [AgendasService, MinhaAgendaService],
  exports: [AgendasService],
})
export class AgendasModule {}
