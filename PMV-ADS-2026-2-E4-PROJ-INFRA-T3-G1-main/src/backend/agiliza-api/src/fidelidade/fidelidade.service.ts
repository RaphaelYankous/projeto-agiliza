import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ClienteEstabelecimento } from './entities/cliente-estabelecimento.entity.js';

@Injectable()
export class FidelidadeService {
  constructor(
    @InjectRepository(ClienteEstabelecimento)
    private readonly clienteEstabelecimentoRepository: Repository<ClienteEstabelecimento>,
    private readonly dataSource: DataSource,
  ) {}

  async creditarPontos(
    clienteId: string,
    estabelecimentoId: string,
    pontos: number,
  ): Promise<ClienteEstabelecimento> {
    return this.dataSource.transaction((manager) =>
      this.creditarPontosNaTransacao(
        manager,
        clienteId,
        estabelecimentoId,
        pontos,
      ),
    );
  }

  async creditarPontosNaTransacao(
    manager: EntityManager,
    clienteId: string,
    estabelecimentoId: string,
    pontos: number,
  ): Promise<ClienteEstabelecimento> {
    if (!Number.isInteger(pontos) || pontos <= 0) {
      throw new BadRequestException('A quantidade de pontos deve ser positiva.');
    }

    const relation = await manager.findOne(ClienteEstabelecimento, {
      where: { clienteId, estabelecimentoId },
    });

    if (relation) {
      relation.pontos += pontos;
      return manager.save(ClienteEstabelecimento, relation);
    }

    return manager.save(
      ClienteEstabelecimento,
      manager.create(ClienteEstabelecimento, {
        clienteId,
        estabelecimentoId,
        pontos,
      }),
    );
  }

  findSaldo(
    clienteId: string,
    estabelecimentoId: string,
  ): Promise<ClienteEstabelecimento | null> {
    return this.clienteEstabelecimentoRepository.findOne({
      where: { clienteId, estabelecimentoId },
    });
  }

  // Soma os pontos do cliente em todos os estabelecimentos.
  async totalDePontos(clienteId: string): Promise<number> {
    const total = await this.clienteEstabelecimentoRepository.sum('pontos', { clienteId });
    return total ?? 0;
  }
}