import { Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

@Entity('gestores')
export class Gestor {
  @PrimaryColumn({ name: 'usuario_id', type: 'varchar', length: 36 })
  usuarioId: string;

  @OneToOne(() => Usuario, (usuario) => usuario.gestor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id', foreignKeyConstraintName: 'FK_gestores_usuario' })
  usuario: Relation<Usuario>;
}