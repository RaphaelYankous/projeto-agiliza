import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Agendamento } from '../../agendamentos/entities/agendamento.entity.js';
import { DisponibilidadeProfissional } from '../../agenda/entities/disponibilidade-profissional.entity.js';
import { BloqueioAgenda } from '../../agenda/entities/bloqueio-agenda.entity.js';


import { Usuario } from '../../usuarios/entities/usuario.entity.js';
import { Servico } from '../../servicos/entities/servico.entity.js';

@Entity('profissionais')
export class Profissional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'usuario_id' })
  usuarioId: string;

  @OneToOne(() => Usuario, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Relation<Usuario>;

  @Column({
    type: 'varchar',
    length: 36,
    name: 'estabelecimento_id',
  })
  estabelecimentoId: string;

  @OneToMany(() => Agendamento, (agendamento) => agendamento.profissional)
  agendamentos: Relation<Agendamento[]>;

  @OneToMany(() => DisponibilidadeProfissional, (d) => d.profissional)
  disponibilidades: Relation<DisponibilidadeProfissional[]>;

  @OneToMany(() => BloqueioAgenda, (b) => b.profissional)
  bloqueios: Relation<BloqueioAgenda[]>;

  @ManyToMany(() => Servico)
  @JoinTable({
    name: 'profissional_servicos',
    joinColumn: { name: 'profissional_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'servico_id', referencedColumnName: 'id' },
  })
  servicos: Relation<Servico[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
