import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('notificacoes')
@Index('IDX_notificacoes_usuario_criada', ['usuarioId', 'createdAt'])
export class Notificacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'varchar', length: 36 })
  usuarioId: string;

  @Column({ type: 'varchar', length: 60 })
  tipo: string;

  @Column({ type: 'varchar', length: 160 })
  titulo: string;

  @Column({ type: 'text' })
  mensagem: string;

  @Column({ type: 'boolean', default: false })
  lida: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
