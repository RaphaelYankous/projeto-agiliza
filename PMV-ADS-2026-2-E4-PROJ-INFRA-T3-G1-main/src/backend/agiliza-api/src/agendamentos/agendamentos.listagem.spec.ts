import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import type { DataSource } from 'typeorm';
import type { EmailService } from '../email/email.service.js';
import type { FidelidadeService } from '../fidelidade/fidelidade.service.js';
import type { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { Cliente } from '../clientes/entities/cliente.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { AgendamentosService } from './agendamentos.service.js';
import { Agendamento, StatusAgendamento } from './entities/agendamento.entity.js';
import { agendamentosMock, INICIO } from '../../test/helpers/agendamentos.js';
import { ESTABELECIMENTO_ID, ID } from '../../test/helpers/fixtures.js';

const OUTRO_ESTABELECIMENTO_ID = '2c1f4e0a-7a52-4f0b-9b1e-0d2a7b5c9e11';

function agendamentoDoCliente(dados: Partial<Agendamento> & { estabelecimentoId?: string } = {}) {
  const { estabelecimentoId = ESTABELECIMENTO_ID, ...resto } = dados;
  return Object.assign(new Agendamento(), {
    id: ID,
    status: StatusAgendamento.CONFIRMADO,
    clienteId: ID,
    dataHoraInicio: new Date(INICIO),
    dataHoraFim: new Date('2030-10-21T10:40:00'),
    servico: { id: 'serv-1', nome: 'Corte' },
    profissional: {
      id: 'prof-1',
      estabelecimentoId,
      usuario: { nome: 'Carlos', sobrenome: 'Souza' },
    },
    ...resto,
  });
}

const FOTO_ATUALIZADA_EM = new Date('2030-10-01T12:00:00');

function estabelecimentoNomeado(id: string, nome: string, fotoAtualizadaEm: Date | null = null) {
  return Object.assign(new Estabelecimento(), { id, nome, fotoAtualizadaEm });
}

function montar(agendamentos: Agendamento[], estabelecimentos: Estabelecimento[] = []) {
  const mocks = agendamentosMock();
  mocks.manager.find.mockImplementation(async (entidade: Function) => {
    if (entidade === Agendamento) return agendamentos;
    if (entidade === Estabelecimento) return estabelecimentos;
    return [];
  });
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

describe('AgendamentosService — listagem do cliente logado', () => {
  it('busca o cliente pelo usuário do token e lista só os agendamentos dele, inclusive de profissional excluído', async () => {
    const { service, manager } = montar(
      [agendamentoDoCliente()],
      [estabelecimentoNomeado(ESTABELECIMENTO_ID, 'Barbearia Central')],
    );

    await service.listarDoCliente('usuario-do-token');

    expect(manager.findOne).toHaveBeenCalledWith(Cliente, {
      where: { usuarioId: 'usuario-do-token' },
      loadEagerRelations: false,
    });
    expect(manager.find).toHaveBeenCalledWith(
      Agendamento,
      expect.objectContaining({
        where: { clienteId: ID },
        withDeleted: true,
        order: { dataHoraInicio: 'DESC' },
      }),
    );
  });

  it('devolve serviço, profissional e estabelecimento no formato que a tela consome', async () => {
    const { service } = montar(
      [agendamentoDoCliente()],
      [estabelecimentoNomeado(ESTABELECIMENTO_ID, 'Barbearia Central', FOTO_ATUALIZADA_EM)],
    );

    const lista = await service.listarDoCliente(ID);

    expect(lista).toEqual([
      {
        id: ID,
        status: StatusAgendamento.CONFIRMADO,
        dataHoraInicio: new Date(INICIO),
        dataHoraFim: new Date('2030-10-21T10:40:00'),
        clienteId: ID,
        servico: { id: 'serv-1', nome: 'Corte' },
        profissional: { id: 'prof-1', nome: 'Carlos', sobrenome: 'Souza' },
        estabelecimento: {
          id: ESTABELECIMENTO_ID,
          nome: 'Barbearia Central',
          fotoAtualizadaEm: FOTO_ATUALIZADA_EM,
        },
      },
    ]);
  });

  it('busca só id, nome e data da foto do estabelecimento, sem o arquivo da foto', async () => {
    const { service, manager } = montar(
      [agendamentoDoCliente()],
      [estabelecimentoNomeado(ESTABELECIMENTO_ID, 'Barbearia Central')],
    );

    const [item] = await service.listarDoCliente(ID);

    expect(manager.find).toHaveBeenCalledWith(
      Estabelecimento,
      expect.objectContaining({ select: { id: true, nome: true, fotoAtualizadaEm: true } }),
    );
    expect(item.estabelecimento.fotoAtualizadaEm).toBeNull();
  });

  it('não expõe dados que a tela não usa (senha, foto, CPF)', async () => {
    const { service } = montar(
      [agendamentoDoCliente()],
      [estabelecimentoNomeado(ESTABELECIMENTO_ID, 'Barbearia Central')],
    );

    const [item] = await service.listarDoCliente(ID);

    expect(Object.keys(item).sort()).toEqual([
      'clienteId',
      'dataHoraFim',
      'dataHoraInicio',
      'estabelecimento',
      'id',
      'profissional',
      'servico',
      'status',
    ]);
    expect(Object.keys(item.profissional).sort()).toEqual(['id', 'nome', 'sobrenome']);
    expect(Object.keys(item.estabelecimento).sort()).toEqual(['fotoAtualizadaEm', 'id', 'nome']);
  });

  it('consulta os estabelecimentos uma única vez, sem IDs repetidos', async () => {
    const { service, manager } = montar(
      [
        agendamentoDoCliente({ id: 'a1' }),
        agendamentoDoCliente({ id: 'a2' }),
        agendamentoDoCliente({ id: 'a3', estabelecimentoId: OUTRO_ESTABELECIMENTO_ID }),
      ],
      [
        estabelecimentoNomeado(ESTABELECIMENTO_ID, 'Barbearia Central'),
        estabelecimentoNomeado(OUTRO_ESTABELECIMENTO_ID, 'Studio Sônia'),
      ],
    );

    const lista = await service.listarDoCliente(ID);

    const consultasDeEstabelecimento = manager.find.mock.calls.filter(
      ([entidade]) => entidade === Estabelecimento,
    );
    expect(consultasDeEstabelecimento).toHaveLength(1);
    expect(consultasDeEstabelecimento[0][1]).toMatchObject({
      where: { id: In([ESTABELECIMENTO_ID, OUTRO_ESTABELECIMENTO_ID]) },
    });
    expect(lista.map((item) => item.estabelecimento.nome)).toEqual([
      'Barbearia Central',
      'Barbearia Central',
      'Studio Sônia',
    ]);
  });

  it('devolve lista vazia sem consultar estabelecimentos quando não há agendamentos', async () => {
    const { service, manager } = montar([]);

    await expect(service.listarDoCliente(ID)).resolves.toEqual([]);

    expect(manager.find).toHaveBeenCalledTimes(1);
  });

  it('usa um nome padrão se o estabelecimento do profissional não for encontrado', async () => {
    const { service } = montar([agendamentoDoCliente()], []);

    const [item] = await service.listarDoCliente(ID);

    expect(item.estabelecimento).toEqual({
      id: ESTABELECIMENTO_ID,
      nome: 'Estabelecimento indisponível',
      fotoAtualizadaEm: null,
    });
  });

  it('lança 404 e não consulta agendamentos quando o usuário não é um cliente', async () => {
    const { service, manager, registros } = montar([agendamentoDoCliente()]);
    registros.set(Cliente, null);

    await expect(service.listarDoCliente(ID)).rejects.toBeInstanceOf(NotFoundException);

    expect(manager.find).not.toHaveBeenCalled();
  });
});
