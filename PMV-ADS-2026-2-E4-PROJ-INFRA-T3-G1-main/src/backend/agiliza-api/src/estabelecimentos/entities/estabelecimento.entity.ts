import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ValueTransformer,
  Index,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { ClienteEstabelecimento } from '../../fidelidade/entities/cliente-estabelecimento.entity.js';

// Transformer para garantir que latitude e longitude voltem como number
const decimalTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string) => (value !== null && value !== undefined ? parseFloat(value) : value),
};

@Entity('estabelecimentos')
export class Estabelecimento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nome: string;

  @Column({ type: 'varchar', length: 150, name: 'razao_social' })
  razaoSocial: string; 

  @Index('IDX_estabelecimentos_cnpj', { unique: true })
  @Column({ type: 'varchar', length: 14 })
  cnpj: string;

  @Index('IDX_estabelecimentos_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'text' })
  endereco: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    transformer: decimalTransformer,
  })
  latitude: number;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    transformer: decimalTransformer,
  })
  longitude: number;

  @Column({ type: 'varchar', length: 20 })
  telefone: string;

  @Column({ type: 'text', nullable: true })
  descricao?: string;

  // mediumblob suporta até 16MB (blob comum estoura com mais de 64KB)
  @Column({ type: 'mediumblob', nullable: true, name: 'foto_perfil', select: false })
  fotoPerfil?: Buffer | null;

  @Column({ type: 'datetime', nullable: true, name: 'foto_atualizada_em' })
  fotoAtualizadaEm?: Date | null;

  @Column({ type: 'boolean', default: false })
  fidelidade: boolean;

  @Column({ type: 'json', nullable: true, name: 'rede_social' })
  redeSocial?: string[];

  @Column({ type: 'time', name: 'horario_abertura' })
  horarioAbertura: string;

  @Column({ type: 'time', name: 'horario_fechamento' })
  horarioFechamento: string;

  @Column({ type: 'json', nullable: true, name: 'dias_funcionamento' })
  diasFuncionamento?: string[];

  @Column({ name: 'gestor_id', type: 'varchar', length: 36 })
  gestorId: string;

  @OneToMany(
    () => ClienteEstabelecimento,
    (fidelidade) => fidelidade.estabelecimento,
  )
  fidelidades: Relation<ClienteEstabelecimento[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}