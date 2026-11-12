import 'reflect-metadata';
import { Mongoose } from 'mongoose';
import { AvaliacaoSchema } from './avaliacao.schema.js';
import { dadosAvaliacao } from '../../../test/helpers/fixtures.js';

const Model = new Mongoose().model('AvaliacaoTeste', AvaliacaoSchema);

describe('AvaliacaoSchema', () => {
  it.each([1, 5])('aceita nota %s sem acessar MongoDB', async (nota) => {
    await expect(new Model({ ...dadosAvaliacao, nota }).validate()).resolves.toBeUndefined();
  });

  it.each([0, 6])('rejeita nota %s no schema', async (nota) => {
    await expect(new Model({ ...dadosAvaliacao, nota }).validate()).rejects.toHaveProperty(
      'errors.nota',
    );
  });

  it.each(['clienteId', 'profissionalId', 'agendamentoId', 'nota'])(
    'exige %s na persistência',
    async (campo) => {
      const dados: Record<string, unknown> = { ...dadosAvaliacao };
      delete dados[campo];
      await expect(new Model(dados).validate()).rejects.toHaveProperty(`errors.${campo}`);
    },
  );
});
