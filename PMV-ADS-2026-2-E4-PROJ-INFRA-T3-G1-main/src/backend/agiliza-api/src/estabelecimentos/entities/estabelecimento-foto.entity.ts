import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Estabelecimento } from './estabelecimento.entity.js';

@Entity('estabelecimento_fotos')
@Index('IDX_estabelecimento_fotos_estabelecimento_created', ['estabelecimentoId', 'createdAt'])
export class EstabelecimentoFoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'estabelecimento_id', type: 'varchar', length: 36 })
  estabelecimentoId: string;

  @ManyToOne(() => Estabelecimento, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'estabelecimento_id',
    foreignKeyConstraintName: 'FK_estabelecimento_fotos_estabelecimento',
  })
  estabelecimento?: Estabelecimento;

  @Column({ type: 'mediumblob', select: false })
  conteudo?: Buffer;

  @CreateDateColumn({ name: 'created_at', precision: 6 })
  createdAt: Date;
}
