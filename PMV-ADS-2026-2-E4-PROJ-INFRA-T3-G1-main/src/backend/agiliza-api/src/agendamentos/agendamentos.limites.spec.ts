import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { EmailService } from '../email/email.service.js';
import type { FidelidadeService } from '../fidelidade/fidelidade.service.js';
import type { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { Cliente } from '../clientes/entities/cliente.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { AgendamentosService } from './agendamentos.service.js';
import { agendamentosMock, AGORA, dadosAgendamento } from '../../test/helpers/agendamentos.js';
import { ID } from '../../test/helpers/fixtures.js';

function montar() {
  const mocks = agendamentosMock();
  return {
    ...mocks,
    service: new AgendamentosService(
      mocks.dataSource as unknown as DataSource,
      mocks.email as unknown as EmailService,
      {} as FidelidadeService,
      { criarParaAgendamento: vi.fn(async () => undefined) } as unknown as NotificacoesService,
    ),
  };
}

describe('AgendamentosService — limites e falhas adicionais', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('rejeita início exatamente no instante atual sem abrir transação', async () => {
    const { service, dataSource } = montar();
    await expect(
      service.create(ID, { ...dadosAgendamento, dataHoraInicio: AGORA.toISOString() }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it.each([Cliente, Profissional])('rejeita %s ausente e libera a transação', async (entidade) => {
    const { service, registros, runner } = montar();
    registros.set(entidade, null);
    await expect(service.create(ID, dadosAgendamento)).rejects.toBeInstanceOf(NotFoundException);
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it('aceita começar exatamente na abertura', async () => {
    const { service } = montar();
    await expect(
      service.create(ID, { ...dadosAgendamento, dataHoraInicio: '2030-10-21T09:00:00' }),
    ).resolves.toMatchObject({ status: 0 });
  });

  it('rejeita atendimento que atravessa a meia-noite', async () => {
    const { service } = montar();
    await expect(
      service.create(ID, { ...dadosAgendamento, dataHoraInicio: '2030-10-21T23:30:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['create', 'cancel'] as const)(
    '%s desfaz a transação em falha ao salvar e não envia email',
    async (metodo) => {
      const { service, manager, runner, email } = montar();
      const erro = new Error('Falha ao salvar');
      manager.save.mockRejectedValueOnce(erro);
      const resultado =
        metodo === 'create' ? service.create(ID, dadosAgendamento) : service.cancel(ID, ID);
      await expect(resultado).rejects.toBe(erro);
      expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(runner.release).toHaveBeenCalledTimes(1);
      expect(runner.commitTransaction).not.toHaveBeenCalled();
      expect(email.enviarAgendamentoCriado).not.toHaveBeenCalled();
      expect(email.enviarAgendamentoCancelado).not.toHaveBeenCalled();
    },
  );
});
