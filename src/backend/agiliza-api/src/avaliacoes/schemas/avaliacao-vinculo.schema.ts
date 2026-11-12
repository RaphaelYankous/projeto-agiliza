import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AvaliacaoVinculoDocument = HydratedDocument<AvaliacaoVinculo>;

// Liga um agendamento à sua avaliação. O índice único em agendamentoId é a trava que
// impede avaliar o mesmo atendimento duas vezes, mesmo com dois envios ao mesmo tempo.
// A foto fica aqui para não alterar o schema de Avaliacao.
@Schema({ timestamps: true, collection: 'avaliacoes_vinculos' })
export class AvaliacaoVinculo {
  @Prop({ required: true, unique: true })
  agendamentoId: string;

  @Prop({ required: true })
  clienteId: string;

  @Prop()
  avaliacaoId?: string;

  @Prop({ type: Buffer, select: false })
  foto?: Buffer;
}

export const AvaliacaoVinculoSchema = SchemaFactory.createForClass(AvaliacaoVinculo);
