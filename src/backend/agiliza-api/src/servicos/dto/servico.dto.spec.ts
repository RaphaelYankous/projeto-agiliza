import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateServicoDto } from './create-servico.dto.js';
import { UpdateServicoDto } from './update-servico.dto.js';

const dadosValidos: CreateServicoDto = {
  nome: 'Corte',
  preco: 4500,
  descricao: 'Corte com acabamento',
  duracao: 40,
  pontoFidelidade: 0,
};

const camposTexto = ['nome', 'descricao'] as const;
const camposPositivos = ['preco', 'duracao'] as const;

describe('CreateServicoDto', () => {
  it('aceita um cadastro válido com zero pontos de fidelidade', async () => {
    const dto = Object.assign(new CreateServicoDto(), dadosValidos);

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('aceita os menores inteiros positivos de preço e duração', async () => {
    const dto = Object.assign(new CreateServicoDto(), dadosValidos, { preco: 1, duracao: 1 });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it.each(Object.keys(dadosValidos))('exige o campo %s no cadastro', async (campo) => {
    const dados: Record<string, unknown> = { ...dadosValidos };
    delete dados[campo];
    const erros = await validate(Object.assign(new CreateServicoDto(), dados));

    expect(erros.map((erro) => erro.property)).toEqual([campo]);
  });

  describe.each(camposTexto)('%s', (campo) => {
    it.each(['', 123, null])('rejeita o valor %j', async (valor) => {
      const dto = Object.assign(new CreateServicoDto(), dadosValidos, { [campo]: valor });
      const erros = await validate(dto);

      expect(erros.map((erro) => erro.property)).toEqual([campo]);
    });
  });

  describe.each(camposPositivos)('%s', (campo) => {
    it.each([0, -1, 1.5, '40', null])('rejeita o valor %j', async (valor) => {
      const dto = Object.assign(new CreateServicoDto(), dadosValidos, { [campo]: valor });
      const erros = await validate(dto);

      expect(erros.map((erro) => erro.property)).toEqual([campo]);
    });
  });

  it.each([-1, 0.5, '0', null])('rejeita pontoFidelidade igual a %j', async (valor) => {
    const dto = Object.assign(new CreateServicoDto(), dadosValidos, { pontoFidelidade: valor });
    const erros = await validate(dto);

    expect(erros.map((erro) => erro.property)).toEqual(['pontoFidelidade']);
  });
});

describe('UpdateServicoDto', () => {
  it('aceita body vazio por ser uma atualização parcial', async () => {
    await expect(validate(new UpdateServicoDto())).resolves.toEqual([]);
  });

  it.each(Object.entries(dadosValidos))('aceita atualizar somente %s', async (campo, valor) => {
    const dto = Object.assign(new UpdateServicoDto(), { [campo]: valor });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it.each([
    ['nome', ''],
    ['descricao', 123],
    ['preco', 0],
    ['duracao', 1.5],
    ['pontoFidelidade', -1],
  ])('mantém a validação do campo %s quando informado', async (campo, valor) => {
    const dto = Object.assign(new UpdateServicoDto(), { [campo]: valor });
    const erros = await validate(dto);

    expect(erros.map((erro) => erro.property)).toEqual([campo]);
  });

  it('ignora null na validação, conforme o comportamento atual de PartialType', async () => {
    const dto = Object.assign(new UpdateServicoDto(), { nome: null });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
