import { BadRequestException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { FidelidadeService } from './fidelidade.service.js';
import { ClienteEstabelecimento } from './entities/cliente-estabelecimento.entity.js';

function createService(existing?: ClienteEstabelecimento) {
  const repository = {
    findOne: vi.fn(),
    sum: vi.fn(),
  };
  const manager = {
    findOne: vi.fn().mockResolvedValue(existing),
    create: vi.fn((_, data) => data),
    save: vi.fn((_, data) => Promise.resolve(data)),
  };
  const dataSource = {
    transaction: vi.fn((operation) => operation(manager)),
  };

  return {
    service: new FidelidadeService(repository as never, dataSource as never),
    manager,
    repository,
    dataSource,
  };
}

describe('FidelidadeService', () => {
  it('cria o saldo ao creditar pontos pela primeira vez', async () => {
    const { service, manager } = createService();

    const result = await service.creditarPontos('cliente-1', 'salao-1', 10);

    expect(manager.create).toHaveBeenCalledWith(ClienteEstabelecimento, {
      clienteId: 'cliente-1',
      estabelecimentoId: 'salao-1',
      pontos: 10,
    });
    expect(result.pontos).toBe(10);
  });

  it('acumula pontos no saldo existente', async () => {
    const existing = {
      clienteId: 'cliente-1',
      estabelecimentoId: 'salao-1',
      pontos: 10,
    } as ClienteEstabelecimento;
    const { service } = createService(existing);

    const result = await service.creditarPontos('cliente-1', 'salao-1', 5);

    expect(result.pontos).toBe(15);
  });

  it('rejeita uma quantidade inválida de pontos', async () => {
    const { service } = createService();

    await expect(service.creditarPontos('cliente-1', 'salao-1', 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('aceita o menor crédito positivo e filtra o par cliente/estabelecimento', async () => {
    const { service, manager } = createService();
    await expect(service.creditarPontos('cliente-1', 'salao-1', 1)).resolves.toMatchObject({
      pontos: 1,
    });
    expect(manager.findOne).toHaveBeenCalledWith(ClienteEstabelecimento, {
      where: { clienteId: 'cliente-1', estabelecimentoId: 'salao-1' },
    });
    expect(manager.save).toHaveBeenCalledWith(ClienteEstabelecimento, {
      clienteId: 'cliente-1',
      estabelecimentoId: 'salao-1',
      pontos: 1,
    });
  });

  it.each([-1, 1.5, NaN, Infinity, '10', null, undefined])(
    'rejeita %j sem consultar ou gravar saldo',
    async (pontos) => {
      const { service, manager } = createService();
      await expect(
        service.creditarPontos('cliente-1', 'salao-1', pontos as number),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.findOne).not.toHaveBeenCalled();
      expect(manager.create).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    },
  );

  it('incrementa o vínculo existente preservando seus identificadores', async () => {
    const existente = {
      clienteId: 'cliente-1',
      estabelecimentoId: 'salao-1',
      pontos: 12,
    } as ClienteEstabelecimento;
    const { service, manager } = createService(existente);
    await expect(service.creditarPontos('cliente-1', 'salao-1', 3)).resolves.toMatchObject({
      ...existente,
      pontos: 15,
    });
    expect(manager.create).not.toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledWith(ClienteEstabelecimento, existente);
  });

  it('usa o manager recebido sem abrir outra transação', async () => {
    const { service, manager, dataSource } = createService();
    await service.creditarPontosNaTransacao(
      manager as unknown as EntityManager,
      'cliente-1',
      'salao-1',
      10,
    );
    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('abre transação quando chamado pelo método externo', async () => {
    const { service, dataSource } = createService();
    await service.creditarPontos('cliente-1', 'salao-1', 10);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('retorna o saldo do par solicitado', async () => {
    const saldo = { clienteId: 'cliente-1', estabelecimentoId: 'salao-1', pontos: 15 };
    const { service, repository } = createService();
    repository.findOne.mockResolvedValueOnce(saldo);
    await expect(service.findSaldo('cliente-1', 'salao-1')).resolves.toBe(saldo);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { clienteId: 'cliente-1', estabelecimentoId: 'salao-1' },
    });
  });

  it('retorna null quando o vínculo ainda não existe', async () => {
    const { service, repository } = createService();
    repository.findOne.mockResolvedValueOnce(null);
    await expect(service.findSaldo('cliente-1', 'salao-1')).resolves.toBeNull();
  });

  it('propaga erro ao consultar saldo', async () => {
    const { service, repository } = createService();
    const erro = new Error('Falha na consulta');
    repository.findOne.mockRejectedValueOnce(erro);
    await expect(service.findSaldo('cliente-1', 'salao-1')).rejects.toBe(erro);
  });

  it('propaga falha de gravação para permitir rollback da transação externa', async () => {
    const { service, manager } = createService();
    const erro = new Error('Falha ao salvar saldo');
    manager.save.mockRejectedValueOnce(erro);
    await expect(
      service.creditarPontosNaTransacao(
        manager as unknown as EntityManager,
        'cliente-1',
        'salao-1',
        10,
      ),
    ).rejects.toBe(erro);
  });

  it('soma os pontos do cliente em todos os estabelecimentos', async () => {
    const { service, repository, dataSource } = createService();
    repository.sum.mockResolvedValueOnce(320);

    await expect(service.totalDePontos('cliente-1')).resolves.toBe(320);
    expect(repository.sum).toHaveBeenCalledWith('pontos', { clienteId: 'cliente-1' });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('retorna zero quando o cliente não tem saldo em nenhum estabelecimento', async () => {
    const { service, repository } = createService();
    repository.sum.mockResolvedValueOnce(null);

    await expect(service.totalDePontos('cliente-1')).resolves.toBe(0);
  });

  it('propaga erro ao somar os pontos', async () => {
    const { service, repository } = createService();
    const erro = new Error('Falha na soma');
    repository.sum.mockRejectedValueOnce(erro);

    await expect(service.totalDePontos('cliente-1')).rejects.toBe(erro);
  });
});