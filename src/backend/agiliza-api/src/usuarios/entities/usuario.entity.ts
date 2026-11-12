import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import type { Relation } from 'typeorm';
import { Gestor } from '../../gestores/entities/gestor.entity.js';
import { Cliente } from '../../clientes/entities/cliente.entity.js';

export enum Role {
  GESTOR = 'gestor',
  PROFISSIONAL = 'profissional',
  CLIENTE = 'cliente',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Role })
  perfil: Role;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  nome: string;

  @Column({ type: 'varchar' })
  sobrenome: string;

  @Column({ type: 'varchar', unique: true })
  cpf: string;

  @Column({ type: 'varchar', length: 20 })
  telefone: string;

  @Column({ type: 'varchar' })
  @Exclude()
  senha: string;

  @Column({ type: 'longblob', nullable: true, name: 'foto_perfil', select: false })
  @Exclude()
  fotoPerfil?: Buffer | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Gestor, (gestor) => gestor.usuario)
  gestor?: Relation<Gestor>;

  // @OneToOne(() => Profissional, (profissional) => profissional.usuario )
  // profissional?: Relation<Profissional>;

  @OneToOne(() => Cliente, (cliente) => cliente.usuario )
  cliente?: Relation<Cliente>;
}
