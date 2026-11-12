import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AvaliacaoDocument = HydratedDocument<Avaliacao>;

@Schema({ timestamps: true, collection: 'avaliacoes' })
export class Avaliacao {
  @Prop({ required: true })
  clienteId: string;

  @Prop({ required: true, index: true })
  profissionalId: string;

  @Prop({ required: true })
  agendamentoId: string;

  @Prop({ required: true, min: 1, max: 5 })
  nota: number;

  @Prop()
  comentario?: string;
}

export const AvaliacaoSchema = SchemaFactory.createForClass(Avaliacao);