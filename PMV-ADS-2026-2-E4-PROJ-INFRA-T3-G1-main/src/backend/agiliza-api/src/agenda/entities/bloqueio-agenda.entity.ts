import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Profissional } from '../../profissionais/entities/profissional.entity.js';

@Entity('bloqueios_agenda')
@Index('IDX_bloqueios_agenda_profissional_data', ['profissionalId', 'data'])
export class BloqueioAgenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'profissional_id', type: 'varchar', length: 36 })
  profissionalId: string;

  @ManyToOne(() => Profissional, (x) => x.bloqueios, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'profissional_id',
    foreignKeyConstraintName: 'FK_bloqueios_agenda_profissional',
  })
  profissional: Relation<Profissional>;

  @Column({ type: 'date' })
  data: string;

  @Column({ name: 'hora_inicio', type: 'time', nullable: true })
  horaInicio: string | null;

  @Column({ name: 'hora_fim', type: 'time', nullable: true })
  horaFim: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}