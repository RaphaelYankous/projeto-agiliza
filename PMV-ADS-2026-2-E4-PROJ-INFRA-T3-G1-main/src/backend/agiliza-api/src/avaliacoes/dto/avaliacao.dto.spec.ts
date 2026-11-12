import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateAvaliacoeDto } from './create-avaliacoes.dto.js';
import { UpdateAvaliacoeDto } from './update-avaliacoes.dto.js';
import { dadosAvaliacao } from '../../../test/helpers/fixtures.js';
import { testarDto } from '../../../test/helpers/validation.js';

testarDto({
  nome: 'DTOs de Avaliação',
  criar: CreateAvaliacoeDto,
  atualizar: UpdateAvaliacoeDto,
  dados: dadosAvaliacao,
  obrigatorios: ['clienteId', 'profissionalId', 'agendamentoId', 'nota'],
  invalidos: [
    ['clienteId', ''],
    ['profissionalId', 123],
    ['agendamentoId', ''],
    ['nota', 0],
    ['nota', 6],
    ['nota', '5'],
    ['comentario', 123],
  ],
});

it.each([1, 5])('aceita nota no limite %s e comentário omitido', async (nota) => {
  const { comentario: _comentario, ...dados } = dadosAvaliacao;
  await expect(validate(Object.assign(new CreateAvaliacoeDto(), dados, { nota }))).resolves.toEqual(
    [],
  );
});
