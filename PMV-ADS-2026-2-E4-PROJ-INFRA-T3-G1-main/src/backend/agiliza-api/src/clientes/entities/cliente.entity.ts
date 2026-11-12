import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Agendamento } from '../../agendamentos/entities/agendamento.entity.js';
import { ClienteEstabelecimento } from '../../fidelidade/entities/cliente-estabelecimento.entity.js';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';
import  { Exclude } from 'class-transformer';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'usuario_id' })
  usuarioId: string;

  @OneToOne(() => Usuario, (usuario) => usuario.cliente, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id', foreignKeyConstraintName: 'FK_edcf87e2f9017c3bd010d54b2d1' })
  usuario: Relation<Usuario>;

  @OneToMany(() => Agendamento, (agendamento) => agendamento.cliente)
  agendamentos: Relation<Agendamento[]>;

  @OneToMany(
    () => ClienteEstabelecimento,
    (fidelidade) => fidelidade.cliente,
  )
  fidelidades: Relation<ClienteEstabelecimento[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}