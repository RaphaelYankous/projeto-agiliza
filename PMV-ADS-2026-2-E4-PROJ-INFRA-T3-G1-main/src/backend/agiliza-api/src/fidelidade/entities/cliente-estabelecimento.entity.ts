import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity.js';
import { Estabelecimento } from '../../estabelecimentos/entities/estabelecimento.entity.js';

@Entity('cliente_estabelecimentos')
@Index('UQ_cliente_estabelecimento', ['clienteId', 'estabelecimentoId'], {
  unique: true,
})
export class ClienteEstabelecimento {
  @PrimaryColumn({ name: 'cliente_id', type: 'varchar', length: 36 })
  clienteId: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.fidelidades, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'cliente_id',
    foreignKeyConstraintName: 'FK_cliente_estabelecimentos_cliente',
  })
  cliente: Relation<Cliente>;

  @PrimaryColumn({ name: 'estabelecimento_id', type: 'varchar', length: 36 })
  estabelecimentoId: string;

  @ManyToOne(
    () => Estabelecimento,
    (estabelecimento) => estabelecimento.fidelidades,
    { onDelete: 'RESTRICT' },
  )
  @JoinColumn({
    name: 'estabelecimento_id',
    foreignKeyConstraintName: 'FK_cliente_estabelecimentos_estabelecimento',
  })
  estabelecimento: Relation<Estabelecimento>;

  @Column({ type: 'int', default: 0 })
  pontos: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}