import 'reflect-metadata';
import { validate } from 'class-validator';
import { UpdateAgendamentoStatusDto } from './update-agendamento-status.dto.js';

describe('UpdateAgendamentoStatusDto', () => {
  it.each([0, 1, 2, 3])('aceita o status numérico %s', async (status) => {
    await expect(
      validate(Object.assign(new UpdateAgendamentoStatusDto(), { status })),
    ).resolves.toEqual([]);
  });

  it.each([undefined, null, -1, 4, 1.5, true, '2', 'CONCLUIDO', 'CANCELADO'])(
    'rejeita status %j',
    async (status) => {
      const erros = await validate(Object.assign(new UpdateAgendamentoStatusDto(), { status }));
      expect(erros.map((erro) => erro.property)).toEqual(['status']);
    },
  );
});
