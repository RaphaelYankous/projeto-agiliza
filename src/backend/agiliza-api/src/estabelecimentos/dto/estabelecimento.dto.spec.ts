import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateEstabelecimentoDto } from './create-estabelecimento.dto.js';
import { UpdateEstabelecimentoDto } from './update-estabelecimento.dto.js';
import { dadosEstabelecimento } from '../../../test/helpers/fixtures.js';
import { testarDto } from '../../../test/helpers/validation.js';

testarDto({
  nome: 'DTOs de Estabelecimento',
  criar: CreateEstabelecimentoDto,
  atualizar: UpdateEstabelecimentoDto,
  dados: dadosEstabelecimento,
  obrigatorios: Object.keys(dadosEstabelecimento).filter((campo) => campo !== 'gestorId'),
  invalidos: [
    ['nome', ''],
    ['razaoSocial', 123],
    ['cnpj', ''],
    ['email', 'invalido'],
    ['endereco', ''],
    ['telefone', 123],
    ['gestorId', ''],
    ['horarioAbertura', ''],
    ['horarioFechamento', 123],
    ['latitude', -90.1],
    ['latitude', 90.1],
    ['longitude', -180.1],
    ['longitude', 180.1],
    ['latitude', '-19.9'],
    ['descricao', 123],
    ['fidelidade', 'true'],
    ['redeSocial', 'link'],
    ['redeSocial', [123]],
    ['redeSocial', ['1', '2', '3', '4', '5', '6']],
  ],
});

it.each([
  [-90, -180],
  [90, 180],
  [0, 0],
])('aceita coordenadas nos limites (%s, %s)', async (latitude, longitude) => {
  const dto = Object.assign(new CreateEstabelecimentoDto(), dadosEstabelecimento, {
    latitude,
    longitude,
  });
  await expect(validate(dto)).resolves.toEqual([]);
});

it('aceita cinco redes sociais e fidelidade false', async () => {
  const dto = Object.assign(new CreateEstabelecimentoDto(), dadosEstabelecimento, {
    redeSocial: ['1', '2', '3', '4', '5'],
    fidelidade: false,
  });
  await expect(validate(dto)).resolves.toEqual([]);
});
