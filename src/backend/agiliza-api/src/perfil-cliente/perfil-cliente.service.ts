import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '../clientes/entities/cliente.entity.js';
import { META_RESGATE_PONTOS } from '../fidelidade/fidelidade.constants.js';
import { FidelidadeService } from '../fidelidade/fidelidade.service.js';

export type PerfilClienteResposta = {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
};

export type FidelidadeClienteResposta = {
  pontos: number;
  meta: number;
};

@Injectable()
export class PerfilClienteService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    private readonly fidelidadeService: FidelidadeService,
  ) {}

  async consultar(usuarioId: string): Promise<PerfilClienteResposta> {
    const cliente = await this.buscarCliente(usuarioId);
    const { nome, sobrenome, email } = cliente.usuario;
    return { id: cliente.id, nome, sobrenome, email };
  }

  async consultarFidelidade(usuarioId: string): Promise<FidelidadeClienteResposta> {
    const cliente = await this.buscarCliente(usuarioId);
    const pontos = await this.fidelidadeService.totalDePontos(cliente.id);
    return { pontos, meta: META_RESGATE_PONTOS };
  }

  private async buscarCliente(usuarioId: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({ where: { usuarioId } });
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return cliente;
  }
}