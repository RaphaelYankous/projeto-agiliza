import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity.js';
import { Profissional } from '../../profissionais/entities/profissional.entity.js';
import { Servico } from '../../servicos/entities/servico.entity.js';

export enum StatusAgendamento {
  PENDENTE = 0,
  CONFIRMADO = 1,
  CONCLUIDO = 2,
  CANCELADO = 3,
}

@Entity('agendamentos')
@Index('IDX_agendamentos_profissional_data_hora', ['profissionalId', 'dataHoraInicio'])
export class Agendamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cliente_id', type: 'varchar', length: 36 })
  clienteId: string;
 
  @ManyToOne(() => Cliente, (x) => x.agendamentos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cliente_id', foreignKeyConstraintName: 'FK_agendamentos_cliente' })
  cliente: Relation<Cliente>;

  @Column({ name: 'profissional_id', type: 'varchar', length: 36 })
  profissionalId: string;

  @ManyToOne(() => Profissional, (x) => x.agendamentos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'profissional_id', foreignKeyConstraintName: 'FK_agendamentos_profissional' })
  profissional: Relation<Profissional>;

  @Column({ name: 'servico_id', type: 'varchar', length: 36 })
  servicoId: string;

  @ManyToOne(() => Servico, (x) => x.agendamentos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'servico_id', foreignKeyConstraintName: 'FK_agendamentos_servico' })
  servico: Relation<Servico>;

  @Column({
    type: 'int',
    default: StatusAgendamento.PENDENTE,
    comment: '0=pendente, 1=confirmado, 2=concluido, 3=cancelado',
  })
  status: StatusAgendamento;

  @Column({ name: 'data_hora_inicio', type: 'datetime' })
  dataHoraInicio: Date;

  @Column({ name: 'data_hora_fim', type: 'datetime' })
  dataHoraFim: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
