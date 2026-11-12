import 'reflect-metadata';
import { Like } from 'typeorm';
import type { Model } from 'mongoose';
import type { Repository } from 'typeorm';
import { EstabelecimentosService } from './estabelecimentos.service.js';
import { Estabelecimento } from './entities/estabelecimento.entity.js';
import type { Avaliacao, AvaliacaoDocument } from '../avaliacoes/schemas/avaliacao.schema.js';
import type { Profissional } from '../profissionais/entities/profissional.entity.js';
import type { Servico } from '../servicos/entities/servico.entity.js';
import { dadosEstabelecimento } from '../../test/helpers/fixtures.js';
import { repositoryMock } from '../../test/helpers/mocks.js';

const ORIGEM = { lat: '-19.9', lng: '-43.9' };

function criarEstabelecimento(
  id: string,
  nome: string,
  latitude: number,
  longitude: number,
) {
  return Object.assign(new Estabelecimento(), {
    ...dadosEstabelecimento,
    id,
    nome,
    latitude,
    longitude,
  });
}

function criarProfissional(id: string, estabelecimentoId: string) {
  return { id, estabelecimentoId } as Profissional;
}

function criarServico(estabelecimentoId: string, preco: number) {
  return { id: `${estabelecimentoId}-${preco}`, estabelecimentoId, preco } as Servico;
}

function criarAvaliacao(profissionalId: string, nota: number) {
  return { profissionalId, nota } as Avaliacao;
}

function montar(servicos: Servico[], profissionais: Profissional[], avaliacoes: Avaliacao[]) {
  const repository = repositoryMock(criarEstabelecimento('a', 'Alpha', -19.9, -43.9));
  const servicoRepository = { find: async () => servicos } as unknown as Repository<Servico>;
  const profissionalRepository = {
    find: async () => profissionais,
  } as unknown as Repository<Profissional>;
  const avaliacaoModel = {
    find: () => ({ exec: async () => avaliacoes }),
  } as unknown as Model<AvaliacaoDocument>;

  const service = new EstabelecimentosService(
    repository as unknown as Repository<Estabelecimento>,
    servicoRepository,
    profissionalRepository,
    avaliacaoModel,
  );

  return { service, repository };
}

describe('EstabelecimentosService.buscar', () => {
  it('calcula preço mínimo, média de avaliações e distância de cada estabelecimento', async () => {
    const alpha = criarEstabelecimento('a', 'Alpha', -19.9, -43.9);
    const beta = criarEstabelecimento('b', 'Beta', -19.95, -43.9);
    const { service, repository } = montar(
      [criarServico('a', 5000), criarServico('a', 3000), criarServico('b', 2000)],
      [criarProfissional('p1', 'a'), criarProfissional('p2', 'b')],
      [
        criarAvaliacao('p1', 5),
        criarAvaliacao('p1', 3),
        criarAvaliacao('p2', 2),
      ],
    );
    repository.find.mockResolvedValueOnce([alpha, beta]);

    const resultado = await service.buscar({ ...ORIGEM });

    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toMatchObject({
      id: 'a',
      precoMinimo: 3000,
      avaliacaoMedia: 4,
      totalAvaliacoes: 2,
      distanciaKm: 0,
    });
    expect(resultado[1]).toMatchObject({
      id: 'b',
      precoMinimo: 2000,
      avaliacaoMedia: 2,
      totalAvaliacoes: 1,
    });
    expect(resultado[1].distanciaKm).toBeGreaterThan(5);
  });

  it('devolve a data da foto principal, ou null quando não há foto', async () => {
    const comFoto = Object.assign(criarEstabelecimento('a', 'Alpha', -19.9, -43.9), {
      fotoAtualizadaEm: new Date('2030-10-01T12:00:00'),
    });
    const semFoto = criarEstabelecimento('b', 'Beta', -19.95, -43.9);
    const { service, repository } = montar([], [], []);
    repository.find.mockResolvedValueOnce([comFoto, semFoto]);

    const resultado = await service.buscar();

    expect(resultado.map((item) => item.fotoAtualizadaEm)).toEqual([
      new Date('2030-10-01T12:00:00'),
      null,
    ]);
  });

  it('filtra pelo nome sem diferenciar maiúsculas de minúsculas', async () => {
    const { service, repository } = montar([], [], []);
    repository.find.mockResolvedValueOnce([]);

    await expect(service.buscar({ nome: ' Alpha ' })).resolves.toEqual([]);
    expect(repository.find).toHaveBeenCalledWith({ where: { nome: Like('%Alpha%') } });
  });

  it('ordena por preço crescente e mantém sem preço no final', async () => {
    const alpha = criarEstabelecimento('a', 'Alpha', -19.9, -43.9);
    const beta = criarEstabelecimento('b', 'Beta', -19.95, -43.9);
    const gama = criarEstabelecimento('g', 'Gama', -19.92, -43.9);
    const { service, repository } = montar(
      [criarServico('a', 5000), criarServico('g', 2000)],
      [],
      [],
    );
    repository.find.mockResolvedValueOnce([alpha, beta, gama]);

    const resultado = await service.buscar({ ordenarPor: 'preco' });

    expect(resultado.map((item) => item.id)).toEqual(['g', 'a', 'b']);
    expect(resultado[0].distanciaKm).toBeNull();
  });

  it('aplica o raio apenas quando a localização é informada', async () => {
    const alpha = criarEstabelecimento('a', 'Alpha', -19.9, -43.9);
    const beta = criarEstabelecimento('b', 'Beta', -19.95, -43.9);
    const { service, repository } = montar([], [], []);
    repository.find.mockResolvedValue([alpha, beta]);

    const semRaio = await service.buscar({ ...ORIGEM });
    const comRaio = await service.buscar({ ...ORIGEM, raio: '1' });
    const semLocalizacao = await service.buscar({ raio: '1' });

    expect(semRaio).toHaveLength(2);
    expect(comRaio.map((item) => item.id)).toEqual(['a']);
    expect(semLocalizacao).toHaveLength(2);
    expect(semLocalizacao[0].distanciaKm).toBeNull();
  });
});
