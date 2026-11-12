import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Not } from 'typeorm';
import type { DataSource } from 'typeorm';
import { BloqueioAgenda } from '../agenda/entities/bloqueio-agenda.entity.js';
import { DisponibilidadeProfissional } from '../agenda/entities/disponibilidade-profissional.entity.js';
import { Cliente } from '../clientes/entities/cliente.entity.js';
import { EmailService } from '../email/email.service.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { FidelidadeService } from '../fidelidade/fidelidade.service.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { AgendamentosService } from './agendamentos.service.js';
import { Agendamento, StatusAgendamento } from './entities/agendamento.entity.js';

// Datas sem fuso ("2030-10-21T10:00:00") são lidas no horário local, então o teste
// funciona em qualquer máquina.
const AGORA = new Date('2030-10-20T08:00:00');

const cliente = { id: 'cliente-1', usuarioId: 'usuario-1' };
const profissional = { id: 'prof-1', estabelecimentoId: 'estab-1' };
const servico = { id: 'serv-1', estabelecimentoId: 'estab-1', duracao: 40 };
const estabelecimento = {
  id: 'estab-1',
  horarioAbertura: '09:00:00',
  horarioFechamento: '18:00:00',
};

const usuarioCliente = { email: 'ana@email.com', nome: 'Ana' };
const usuarioProfissional = { nome: 'Carlos' };

const disponibilidadePadrao = { horaInicio: '09:00:00', horaFim: '18:00:00' };

function montarServico(
  opcoes: {
    servico?: unknown;
    horarioOcupado?: boolean;
    disponibilidades?: { horaInicio: string; horaFim: string }[];
    bloqueios?: { horaInicio: string | null; horaFim: string | null }[];
  } = {},
) {
  const manager = {
    find: vi.fn(async (entidade: unknown) => {
      if (entidade === DisponibilidadeProfissional) {
        return opcoes.disponibilidades ?? [disponibilidadePadrao];
      }
      if (entidade === BloqueioAgenda) return opcoes.bloqueios ?? [];
      return [];
    }),
    findOne: vi.fn(async (entidade: unknown) => {
      if (entidade === Cliente) return cliente;
      if (entidade === Profissional) return profissional;
      if (entidade === Servico) return 'servico' in opcoes ? opcoes.servico : servico;
      return null;
    }),
    findOneOrFail: vi.fn(async () => estabelecimento),
    exists: vi.fn(async () => opcoes.horarioOcupado ?? false),
    create: vi.fn((_entidade: unknown, dados: object) => ({ ...dados })),
    save: vi.fn(async (dados: object) => ({ id: 'agend-1', ...dados })),
  };
  const queryRunner = {
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
    manager,
  };
  const managerEmail = montarManagerEmail();
  const dataSource = {
    createQueryRunner: () => queryRunner,
    manager: managerEmail,
  } as unknown as DataSource;
  const enviarAgendamentoCriado = vi.fn(async () => true);
  const emailService = { enviarAgendamentoCriado } as unknown as EmailService;
  const { criarParaAgendamento, notificacoesService } = montarNotificacoes();

  return {
    service: new AgendamentosService(
      dataSource,
      emailService,
      {} as FidelidadeService,
      notificacoesService,
    ),
    manager,
    queryRunner,
    managerEmail,
    enviarAgendamentoCriado,
    criarParaAgendamento,
  };
}

// Manager usado depois do commit para montar os dados do e-mail.
function montarManagerEmail() {
  return {
    findOneOrFail: vi.fn(async (entidade: unknown) => {
      if (entidade === Cliente) return { ...cliente, usuario: usuarioCliente };
      if (entidade === Profissional) return { ...profissional, usuario: usuarioProfissional };
      if (entidade === Servico) return { ...servico, nome: 'Corte masculino' };
      if (entidade === Estabelecimento) return { ...estabelecimento, nome: 'Barbearia Central' };
      throw new Error('entidade inesperada');
    }),
  };
}

function montarNotificacoes() {
  const criarParaAgendamento = vi.fn(async () => undefined);
  return {
    criarParaAgendamento,
    notificacoesService: { criarParaAgendamento } as unknown as NotificacoesService,
  };
}

function dto(dataHoraInicio: string) {
  return { profissionalId: 'prof-1', servicoId: 'serv-1', dataHoraInicio };
}

describe('AgendamentosService.cancel', () => {
  function montarCancelamento(
    opcoes: { agendamento?: object | null; cliente?: object | null } = {},
  ) {
    const agendamento =
      'agendamento' in opcoes
        ? opcoes.agendamento
        : {
            id: 'agend-1',
            clienteId: 'cliente-1',
            profissionalId: 'prof-1',
            servicoId: 'serv-1',
            dataHoraInicio: new Date('2030-10-21T10:00:00'),
            status: StatusAgendamento.PENDENTE,
          };
    const manager = {
      findOne: vi.fn(async (entidade: unknown) => {
        if (entidade === Agendamento) return agendamento;
        if (entidade === Cliente) return 'cliente' in opcoes ? opcoes.cliente : cliente;
        return null;
      }),
      save: vi.fn(async (dados: object) => dados),
    };
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager,
    };
    const managerEmail = montarManagerEmail();
    const dataSource = {
      createQueryRunner: () => queryRunner,
      manager: managerEmail,
    } as unknown as DataSource;
    const enviarAgendamentoCancelado = vi.fn(async () => true);
    const emailService = { enviarAgendamentoCancelado } as unknown as EmailService;
    const { criarParaAgendamento, notificacoesService } = montarNotificacoes();

    return {
      service: new AgendamentosService(
        dataSource,
        emailService,
        {} as FidelidadeService,
        notificacoesService,
      ),
      manager,
      queryRunner,
      managerEmail,
      enviarAgendamentoCancelado,
      criarParaAgendamento,
    };
  }

  function agendamentoCom(clienteId: string, status: StatusAgendamento) {
    return { id: 'agend-1', clienteId, status };
  }

  it('marca o agendamento como cancelado sem apagá-lo', async () => {
    const { service, manager, queryRunner } = montarCancelamento();

    await service.cancel('usuario-1', 'agend-1');

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'agend-1', status: StatusAgendamento.CANCELADO }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('cancela também um agendamento confirmado', async () => {
    const { service, manager } = montarCancelamento({
      agendamento: agendamentoCom('cliente-1', StatusAgendamento.CONFIRMADO),
    });

    await service.cancel('usuario-1', 'agend-1');

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: StatusAgendamento.CANCELADO }),
    );
  });

  it('usa READ COMMITTED e trava o agendamento antes de qualquer outra leitura', async () => {
    const { service, manager, queryRunner } = montarCancelamento();

    await service.cancel('usuario-1', 'agend-1');

    expect(queryRunner.startTransaction).toHaveBeenCalledWith('READ COMMITTED');
    const [primeiraEntidade, primeiroFiltro] = manager.findOne.mock.calls[0] as unknown as [
      unknown,
      { lock: { mode: string } },
    ];
    expect(primeiraEntidade).toBe(Agendamento);
    expect(primeiroFiltro.lock.mode).toBe('pessimistic_write');
  });

  it('envia o e-mail de cancelamento ao cliente depois do commit', async () => {
    const { service, queryRunner, enviarAgendamentoCancelado } = montarCancelamento();

    await service.cancel('usuario-1', 'agend-1');

    expect(enviarAgendamentoCancelado).toHaveBeenCalledWith({
      destinatarioEmail: 'ana@email.com',
      destinatarioNome: 'Ana',
      servicoNome: 'Corte masculino',
      profissionalNome: 'Carlos',
      estabelecimentoNome: 'Barbearia Central',
      dataHoraInicio: new Date('2030-10-21T10:00:00'),
    });
    expect(queryRunner.commitTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      enviarAgendamentoCancelado.mock.invocationCallOrder[0],
    );
  });

  it('conclui o cancelamento mesmo se montar o e-mail falhar', async () => {
    const { service, managerEmail, queryRunner, enviarAgendamentoCancelado } = montarCancelamento();
    managerEmail.findOneOrFail.mockRejectedValue(new Error('banco fora do ar'));

    await expect(service.cancel('usuario-1', 'agend-1')).resolves.toBeUndefined();

    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(enviarAgendamentoCancelado).not.toHaveBeenCalled();
  });

  it('conclui o cancelamento mesmo se registrar a notificação falhar', async () => {
    const { service, queryRunner, criarParaAgendamento } = montarCancelamento();
    criarParaAgendamento.mockRejectedValue(new Error('banco fora do ar'));

    await expect(service.cancel('usuario-1', 'agend-1')).resolves.toBeUndefined();

    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(criarParaAgendamento).toHaveBeenCalledWith('agend-1', 'agendamento_cancelado');
  });

  it('não envia e-mail quando o cancelamento é recusado', async () => {
    const { service, enviarAgendamentoCancelado } = montarCancelamento({
      agendamento: agendamentoCom('cliente-1', StatusAgendamento.CANCELADO),
    });

    await expect(service.cancel('usuario-1', 'agend-1')).rejects.toBeInstanceOf(ConflictException);
    expect(enviarAgendamentoCancelado).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o agendamento não existe', async () => {
    const { service, queryRunner } = montarCancelamento({ agendamento: null });

    await expect(service.cancel('usuario-1', 'nao-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('retorna 404 quando o usuário logado não tem cadastro de cliente', async () => {
    const { service, manager } = montarCancelamento({ cliente: null });

    await expect(service.cancel('usuario-1', 'agend-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('retorna 403 quando o agendamento é de outro cliente', async () => {
    const { service, manager } = montarCancelamento({
      agendamento: agendamentoCom('outro-cliente', StatusAgendamento.PENDENTE),
    });

    await expect(service.cancel('usuario-1', 'agend-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('retorna 409 quando o agendamento já está cancelado', async () => {
    const { service, manager } = montarCancelamento({
      agendamento: agendamentoCom('cliente-1', StatusAgendamento.CANCELADO),
    });

    await expect(service.cancel('usuario-1', 'agend-1')).rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('retorna 409 quando o agendamento já foi concluído', async () => {
    const { service, manager } = montarCancelamento({
      agendamento: agendamentoCom('cliente-1', StatusAgendamento.CONCLUIDO),
    });

    await expect(service.cancel('usuario-1', 'agend-1')).rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });
});

describe('AgendamentosService.create', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cria o agendamento pendente e calcula o fim pela duração do serviço', async () => {
    const { service, manager, queryRunner } = montarServico();

    const resultado = await service.create('usuario-1', dto('2030-10-21T10:00:00'));

    expect(manager.create).toHaveBeenCalledWith(Agendamento, {
      clienteId: 'cliente-1',
      profissionalId: 'prof-1',
      servicoId: 'serv-1',
      status: StatusAgendamento.PENDENTE,
      dataHoraInicio: new Date('2030-10-21T10:00:00'),
      dataHoraFim: new Date('2030-10-21T10:40:00'),
    });
    expect(resultado.id).toBe('agend-1');
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('envia o e-mail de agendamento criado ao cliente depois do commit', async () => {
    const { service, queryRunner, enviarAgendamentoCriado } = montarServico();

    await service.create('usuario-1', dto('2030-10-21T10:00:00'));

    expect(enviarAgendamentoCriado).toHaveBeenCalledWith({
      destinatarioEmail: 'ana@email.com',
      destinatarioNome: 'Ana',
      servicoNome: 'Corte masculino',
      profissionalNome: 'Carlos',
      estabelecimentoNome: 'Barbearia Central',
      dataHoraInicio: new Date('2030-10-21T10:00:00'),
    });
    expect(queryRunner.commitTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      enviarAgendamentoCriado.mock.invocationCallOrder[0],
    );
  });

  it('devolve o agendamento mesmo se montar o e-mail falhar', async () => {
    const { service, managerEmail, enviarAgendamentoCriado } = montarServico();
    managerEmail.findOneOrFail.mockRejectedValue(new Error('banco fora do ar'));

    const resultado = await service.create('usuario-1', dto('2030-10-21T10:00:00'));

    expect(resultado.id).toBe('agend-1');
    expect(enviarAgendamentoCriado).not.toHaveBeenCalled();
  });

  it('não envia e-mail quando o horário está ocupado', async () => {
    const { service, enviarAgendamentoCriado } = montarServico({ horarioOcupado: true });

    await expect(service.create('usuario-1', dto('2030-10-21T10:00:00'))).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(enviarAgendamentoCriado).not.toHaveBeenCalled();
  });

  it('usa READ COMMITTED e trava o profissional antes de qualquer outra leitura', async () => {
    const { service, manager, queryRunner } = montarServico();

    await service.create('usuario-1', dto('2030-10-21T10:00:00'));

    expect(queryRunner.startTransaction).toHaveBeenCalledWith('READ COMMITTED');
    const [primeiraEntidade, primeiroFiltro] = manager.findOne.mock.calls[0] as unknown as [
      unknown,
      { lock: { mode: string } },
    ];
    expect(primeiraEntidade).toBe(Profissional);
    expect(primeiroFiltro.lock.mode).toBe('pessimistic_write');
  });

  it('retorna 409 quando o horário já está ocupado e desfaz a transação', async () => {
    const { service, manager, queryRunner } = montarServico({ horarioOcupado: true });

    await expect(service.create('usuario-1', dto('2030-10-21T10:00:00'))).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('ignora agendamentos cancelados ao procurar conflito', async () => {
    const { service, manager } = montarServico();

    await service.create('usuario-1', dto('2030-10-21T10:00:00'));

    const [, opcoes] = manager.exists.mock.calls[0] as unknown as [unknown, { where: object }];
    expect(opcoes.where).toMatchObject({
      profissionalId: 'prof-1',
      status: Not(StatusAgendamento.CANCELADO),
    });
  });

  it('retorna 400 quando começa antes da abertura', async () => {
    const { service } = montarServico();

    await expect(service.create('usuario-1', dto('2030-10-21T08:30:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('retorna 400 quando a duração não cabe antes do fechamento', async () => {
    const { service } = montarServico();

    // 17:30 + 40 min = 18:10, depois do fechamento às 18:00
    await expect(service.create('usuario-1', dto('2030-10-21T17:30:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('aceita terminar exatamente no fechamento', async () => {
    const { service } = montarServico({ servico: { ...servico, duracao: 30 } });

    await expect(service.create('usuario-1', dto('2030-10-21T17:30:00'))).resolves.toBeDefined();
  });

  it.each(['2030-10-21T10:15:00', '2030-10-21T10:00:30'])(
    'recusa início %s fora de hora cheia ou meia hora sem abrir transação',
    async (inicio) => {
      const { service, queryRunner, manager } = montarServico();

      await expect(service.create('usuario-1', dto(inicio))).rejects.toThrow(
        'O horário precisa começar em hora cheia ou meia hora.',
      );
      expect(queryRunner.connect).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    },
  );

  it('registra a notificação de agendamento criado depois do commit', async () => {
    const { service, queryRunner, criarParaAgendamento } = montarServico();

    await service.create('usuario-1', dto('2030-10-21T10:00:00'));

    expect(criarParaAgendamento).toHaveBeenCalledWith('agend-1', 'agendamento_criado');
    expect(queryRunner.commitTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      criarParaAgendamento.mock.invocationCallOrder[0],
    );
  });

  it('devolve o agendamento mesmo se registrar a notificação falhar', async () => {
    const { service, queryRunner, criarParaAgendamento } = montarServico();
    criarParaAgendamento.mockRejectedValue(new Error('banco fora do ar'));

    const resultado = await service.create('usuario-1', dto('2030-10-21T10:00:00'));

    expect(resultado.id).toBe('agend-1');
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('consulta a disponibilidade do dia da semana e os bloqueios do dia', async () => {
    const { service, manager } = montarServico();

    await service.create('usuario-1', dto('2030-10-21T10:00:00'));

    const [, filtroDisp] = manager.find.mock.calls[0] as unknown as [unknown, { where: object }];
    // 2030-10-21 cai numa segunda-feira (1)
    expect(filtroDisp.where).toEqual({ profissionalId: 'prof-1', diaSemana: 1, ativo: true });
    const [, filtroBloq] = manager.find.mock.calls[1] as unknown as [unknown, { where: object }];
    expect(filtroBloq.where).toEqual({ profissionalId: 'prof-1', data: '2030-10-21' });
  });

  it('retorna 400 quando o profissional não tem disponibilidade no dia', async () => {
    const { service, manager } = montarServico({ disponibilidades: [] });

    await expect(service.create('usuario-1', dto('2030-10-21T10:00:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('retorna 400 quando o atendimento sai da janela de disponibilidade', async () => {
    const { service } = montarServico({
      disponibilidades: [{ horaInicio: '09:00:00', horaFim: '12:00:00' }],
    });

    // 11:30 + 40 min = 12:10, depois do fim da janela às 12:00
    await expect(service.create('usuario-1', dto('2030-10-21T11:30:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('aceita quando cabe numa das janelas de disponibilidade do dia', async () => {
    const { service } = montarServico({
      disponibilidades: [
        { horaInicio: '09:00:00', horaFim: '12:00:00' },
        { horaInicio: '14:00:00', horaFim: '18:00:00' },
      ],
    });

    await expect(service.create('usuario-1', dto('2030-10-21T14:00:00'))).resolves.toBeDefined();
  });

  it('retorna 400 quando o horário cai dentro de um bloqueio', async () => {
    const { service, manager } = montarServico({
      bloqueios: [{ horaInicio: '10:30:00', horaFim: '11:30:00' }],
    });

    // 10:00 + 40 min = 10:40, invade o bloqueio que começa às 10:30
    await expect(service.create('usuario-1', dto('2030-10-21T10:00:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('aceita terminar exatamente quando o bloqueio começa', async () => {
    const { service } = montarServico({
      bloqueios: [{ horaInicio: '10:40:00', horaFim: '11:30:00' }],
    });

    await expect(service.create('usuario-1', dto('2030-10-21T10:00:00'))).resolves.toBeDefined();
  });

  it('retorna 400 quando o bloqueio vale o dia inteiro (sem horário)', async () => {
    const { service } = montarServico({ bloqueios: [{ horaInicio: null, horaFim: null }] });

    await expect(service.create('usuario-1', dto('2030-10-21T10:00:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('retorna 400 quando a data está no passado', async () => {
    const { service, queryRunner } = montarServico();

    await expect(service.create('usuario-1', dto('2030-10-19T10:00:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o serviço não existe', async () => {
    const { service, queryRunner } = montarServico({ servico: null });

    await expect(service.create('usuario-1', dto('2030-10-21T10:00:00'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('retorna 400 quando serviço e profissional são de estabelecimentos diferentes', async () => {
    const { service } = montarServico({
      servico: { ...servico, estabelecimentoId: 'outro-estab' },
    });

    await expect(service.create('usuario-1', dto('2030-10-21T10:00:00'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('AgendamentosService.updateStatus', () => {
  function montarConclusao(pontos = 10, status = StatusAgendamento.CONFIRMADO, ativo = true) {
    const agendamento = {
      id: 'agend-1',
      clienteId: 'cliente-1',
      status,
      profissional: { estabelecimentoId: 'estab-1' },
      servico: { pontoFidelidade: pontos },
    } as Agendamento;
    const manager = {
      findOne: vi.fn(async (entidade: unknown): Promise<unknown> =>
        entidade === Agendamento ? agendamento : { id: 'estab-1', fidelidade: ativo },
      ),
      save: vi.fn(async (_entidade: unknown, dados: object) => dados),
    };
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager,
    };
    const fidelidadeService = {
      creditarPontosNaTransacao: vi.fn(),
    };
    const dataSource = {
      createQueryRunner: () => queryRunner,
    } as unknown as DataSource;

    return {
      fidelidadeService,
      manager,
      queryRunner,
      agendamento,
      service: new AgendamentosService(
        dataSource,
        {} as EmailService,
        fidelidadeService as unknown as FidelidadeService,
        montarNotificacoes().notificacoesService,
      ),
    };
  }

  it('credita os pontos ao concluir o agendamento', async () => {
    const { service, fidelidadeService, queryRunner } = montarConclusao();

    await service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO });

    expect(fidelidadeService.creditarPontosNaTransacao).toHaveBeenCalledWith(
      queryRunner.manager,
      'cliente-1',
      'estab-1',
      10,
    );
  });

  it('não credita novamente um agendamento já concluído', async () => {
    const { service, fidelidadeService } = montarConclusao(10, StatusAgendamento.CONCLUIDO);

    await service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO });

    expect(fidelidadeService.creditarPontosNaTransacao).not.toHaveBeenCalled();
  });

  it('não credita quando o serviço não oferece pontos', async () => {
    const { service, fidelidadeService } = montarConclusao(0);

    await service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO });

    expect(fidelidadeService.creditarPontosNaTransacao).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o agendamento não existe', async () => {
    const contexto = montarConclusao();
    contexto.manager.findOne.mockResolvedValue(null);

    await expect(
      contexto.service.updateStatus('inexistente', {
        status: StatusAgendamento.CONCLUIDO,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(contexto.queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('conclui sem crédito quando o programa do estabelecimento está desativado', async () => {
    const { service, fidelidadeService, queryRunner } = montarConclusao(
      10,
      StatusAgendamento.CONFIRMADO,
      false,
    );
    await expect(
      service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO }),
    ).resolves.toMatchObject({ status: StatusAgendamento.CONCLUIDO });
    expect(fidelidadeService.creditarPontosNaTransacao).not.toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it.each([StatusAgendamento.PENDENTE, StatusAgendamento.CONFIRMADO])(
    'credita ao concluir a partir do status %s',
    async (status) => {
      const { service, fidelidadeService } = montarConclusao(10, status);
      await service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO });
      expect(fidelidadeService.creditarPontosNaTransacao).toHaveBeenCalledTimes(1);
    },
  );

  it.each([StatusAgendamento.CONCLUIDO, StatusAgendamento.CANCELADO])(
    'não permite sair do estado definitivo %s',
    async (estado) => {
      for (const destino of Object.values(StatusAgendamento).filter(
        (valor): valor is StatusAgendamento => typeof valor === 'number' && valor !== estado,
      )) {
        const { service, manager, fidelidadeService, queryRunner, agendamento } = montarConclusao(
          10,
          estado,
        );
        await expect(service.updateStatus('agend-1', { status: destino })).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(agendamento.status).toBe(estado);
        expect(manager.save).not.toHaveBeenCalled();
        expect(fidelidadeService.creditarPontosNaTransacao).not.toHaveBeenCalled();
        expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(queryRunner.release).toHaveBeenCalledTimes(1);
      }
    },
  );

  it('aceita repetir cancelamento por status sem creditar pontos', async () => {
    const { service, fidelidadeService } = montarConclusao(10, StatusAgendamento.CANCELADO);
    await expect(
      service.updateStatus('agend-1', { status: StatusAgendamento.CANCELADO }),
    ).resolves.toMatchObject({ status: StatusAgendamento.CANCELADO });
    expect(fidelidadeService.creditarPontosNaTransacao).not.toHaveBeenCalled();
  });

  it.each([StatusAgendamento.PENDENTE, StatusAgendamento.CONFIRMADO, StatusAgendamento.CANCELADO])(
    'não credita ao alterar para status %s',
    async (status) => {
      const { service, fidelidadeService } = montarConclusao(10, StatusAgendamento.PENDENTE);
      await service.updateStatus('agend-1', { status });
      expect(fidelidadeService.creditarPontosNaTransacao).not.toHaveBeenCalled();
    },
  );

  it('solicita lock e usa o mesmo manager para gravar status e pontos antes do commit', async () => {
    const { service, manager, fidelidadeService, queryRunner } = montarConclusao();
    await service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO });
    expect(queryRunner.startTransaction).toHaveBeenCalledWith('READ COMMITTED');
    expect(manager.findOne).toHaveBeenCalledWith(Agendamento, {
      where: { id: 'agend-1' },
      relations: { profissional: true, servico: true },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.save.mock.invocationCallOrder[0]).toBeLessThan(
      fidelidadeService.creditarPontosNaTransacao.mock.invocationCallOrder[0],
    );
    expect(fidelidadeService.creditarPontosNaTransacao.mock.invocationCallOrder[0]).toBeLessThan(
      queryRunner.commitTransaction.mock.invocationCallOrder[0],
    );
  });

  it('desfaz a transação e libera recursos quando o crédito falha', async () => {
    const { service, fidelidadeService, queryRunner } = montarConclusao();
    const erro = new Error('Falha ao creditar');
    fidelidadeService.creditarPontosNaTransacao.mockRejectedValueOnce(erro);
    await expect(
      service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO }),
    ).rejects.toBe(erro);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('não solicita crédito se a gravação do status falhar', async () => {
    const { service, manager, fidelidadeService, queryRunner } = montarConclusao();
    const erro = new Error('Falha ao salvar agendamento');
    manager.save.mockRejectedValueOnce(erro);
    await expect(
      service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO }),
    ).rejects.toBe(erro);
    expect(fidelidadeService.creditarPontosNaTransacao).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('propaga falha no commit e tenta rollback antes de liberar', async () => {
    const { service, queryRunner } = montarConclusao();
    const erro = new Error('Falha no commit');
    queryRunner.commitTransaction.mockRejectedValueOnce(erro);
    await expect(
      service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO }),
    ).rejects.toBe(erro);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('retorna 404 se o estabelecimento vinculado não existe, sem crédito', async () => {
    const { service, manager, fidelidadeService, queryRunner, agendamento } = montarConclusao();
    manager.findOne.mockResolvedValueOnce(agendamento).mockResolvedValueOnce(null);
    await expect(
      service.updateStatus('agend-1', { status: StatusAgendamento.CONCLUIDO }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(fidelidadeService.creditarPontosNaTransacao).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
  });
});
