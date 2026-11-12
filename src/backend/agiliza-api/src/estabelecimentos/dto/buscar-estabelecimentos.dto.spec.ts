import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BuscarEstabelecimentosDto } from './buscar-estabelecimentos.dto.js';

function validar(query: Record<string, unknown>) {
  return validate(plainToInstance(BuscarEstabelecimentosDto, query));
}

async function camposInvalidos(query: Record<string, unknown>) {
  const erros = await validar(query);
  return erros.map((erro) => erro.property);
}

it('aceita a busca sem nenhum filtro', async () => {
  await expect(validar({})).resolves.toEqual([]);
});

it('aceita nome, ordenação, coordenadas e raio válidos', async () => {
  await expect(
    validar({
      nome: 'Alpha',
      ordenarPor: 'preco',
      ordem: 'desc',
      lat: '-19.9',
      lng: '-43.9',
      raio: '10.5',
    }),
  ).resolves.toEqual([]);
});

it.each([
  ['lat', 'abc'],
  ['lat', '91'],
  ['lng', 'xyz'],
  ['lng', '-181'],
])('rejeita %s=%s', async (campo, valor) => {
  await expect(camposInvalidos({ [campo]: valor })).resolves.toEqual([campo]);
});

it.each(['abc', '-5', '0'])('rejeita raio=%s', async (valor) => {
  await expect(camposInvalidos({ raio: valor })).resolves.toEqual(['raio']);
});

it('aceita coordenadas sem raio e raio sem coordenadas', async () => {
  await expect(camposInvalidos({ lat: '-19.9', lng: '-43.9' })).resolves.toEqual([]);
  await expect(camposInvalidos({ raio: '10' })).resolves.toEqual([]);
});

it('rejeita ordenação fora do contrato', async () => {
  await expect(camposInvalidos({ ordenarPor: 'endereco' })).resolves.toEqual(['ordenarPor']);
  await expect(camposInvalidos({ ordem: 'crescente' })).resolves.toEqual(['ordem']);
});
