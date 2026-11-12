import 'reflect-metadata';
import { getMetadataArgsStorage, type ValueTransformer } from 'typeorm';
import { Estabelecimento } from './estabelecimento.entity.js';

describe('Estabelecimento — transformação de coordenadas', () => {
  it.each(['latitude', 'longitude'])('converte %s retornada pelo banco em número', (campo) => {
    const coluna = getMetadataArgsStorage().columns.find(
      (coluna) => coluna.target === Estabelecimento && coluna.propertyName === campo,
    );
    const transformer = coluna!.options.transformer as ValueTransformer;
    expect(transformer.from('-19.92038200')).toBe(-19.920382);
    expect(transformer.from('0.00000000')).toBe(0);
    expect(transformer.to(-19.920382)).toBe(-19.920382);
    expect(transformer.from(null)).toBeNull();
    expect(transformer.from(undefined)).toBeUndefined();
  });
});
