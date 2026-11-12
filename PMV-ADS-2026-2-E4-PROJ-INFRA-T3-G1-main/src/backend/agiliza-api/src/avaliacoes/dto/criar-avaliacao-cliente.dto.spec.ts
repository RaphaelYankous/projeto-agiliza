import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { COMENTARIO_MAXIMO, CriarAvaliacaoClienteDto } from './criar-avaliacao-cliente.dto.js';

const erros = async (dados: object) =>
  (await validate(plainToInstance(CriarAvaliacaoClienteDto, dados))).map((erro) => erro.property);

describe('CriarAvaliacaoClienteDto', () => {
  it.each([1, 2, 3, 4, 5, '1', '5'])('aceita nota %j', async (nota) => {
    await expect(erros({ nota })).resolves.toEqual([]);
  });

  it.each([0, 6, -1, 2.5, '2.5', 'abc', '', null, undefined, '0', '6'])(
    'rejeita nota %j',
    async (nota) => {
      await expect(erros({ nota })).resolves.toEqual(['nota']);
    },
  );

  it('aceita comentário omitido, vazio e no limite', async () => {
    await expect(erros({ nota: 5 })).resolves.toEqual([]);
    await expect(erros({ nota: 5, comentario: '' })).resolves.toEqual([]);
    await expect(erros({ nota: 5, comentario: 'a'.repeat(COMENTARIO_MAXIMO) })).resolves.toEqual([]);
  });

  it.each([['a'.repeat(COMENTARIO_MAXIMO + 1)], [123], [{}]])(
    'rejeita comentário %j',
    async (comentario) => {
      await expect(erros({ nota: 5, comentario })).resolves.toEqual(['comentario']);
    },
  );
});
