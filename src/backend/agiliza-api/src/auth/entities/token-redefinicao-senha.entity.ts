import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

@Entity('tokens_redefinicao_senha')
export class TokenRedefinicaoSenha {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'varchar', length: 36 })
  usuarioId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'FK_tokens_redefinicao_senha_usuario',
  })
  usuario: Usuario;

  @Index('IDX_tokens_redefinicao_senha_hash')
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ name: 'expira_em', type: 'datetime' })
  expiraEm: Date;

  @Column({ name: 'utilizado_em', type: 'datetime', nullable: true })
  utilizadoEm: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}