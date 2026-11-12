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
import { Profissional } from '../../profissionais/entities/profissional.entity.js';

@Entity('disponibilidades_profissional')
@Index('IDX_disponibilidades_profissional_dia', ['profissionalId', 'diaSemana'])
export class DisponibilidadeProfissional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'profissional_id', type: 'varchar', length: 36 })
  profissionalId: string;

  @ManyToOne(() => Profissional, (x) => x.disponibilidades, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'profissional_id',
    foreignKeyConstraintName: 'FK_disponibilidades_profissional',
  })
  profissional: Relation<Profissional>;

  @Column({
    name: 'dia_semana',
    type: 'tinyint',
    comment: '0=domingo, 1=segunda, ..., 6=sábado',
  })
  diaSemana: number;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fim', type: 'time' })
  horaFim: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}