import { vi } from 'vitest';
import { Cliente } from '../../src/clientes/entities/cliente.entity.js';
import { Profissional } from '../../src/profissionais/entities/profissional.entity.js';
import { Estabelecimento } from '../../src/estabelecimentos/entities/estabelecimento.entity.js';
import { Servico } from '../../src/servicos/entities/servico.entity.js';
import {
  Agendamento,
  StatusAgendamento,
} from '../../src/agendamentos/entities/agendamento.entity.js';
import { DisponibilidadeProfissional } from '../../src/agenda/entities/disponibilidade-profissional.entity.js';
import { BloqueioAgenda } from '../../src/agenda/entities/bloqueio-agenda.entity.js';
import { ClienteEstabelecimento } from '../../src/fidelidade/entities/cliente-estabelecimento.entity.js';
import { cliente, profissional, estabelecimento, ID, ESTABELECIMENTO_ID } from './fixtures.js';

export const INICIO = '2030-10-21T10:00:00';
export const AGORA = new Date('2030-10-20T08:00:00');
export const dadosAgendamento = { profissionalId: ID, servicoId: ID, dataHoraInicio: INICIO };

export function agendamentosMock() {
  const registros = new Map<Function, object | null>([
    [Cliente, cliente()],
    [Profissional, profissional()],
    [Estabelecimento, estabelecimento()],
    [
      Servico,
      Object.assign(new Servico(), {
        id: ID,
        nome: 'Corte',
        estabelecimentoId: ESTABELECIMENTO_ID,
        duracao: 40,
        pontoFidelidade: 10,
      }),
    ],
    [
      Agendamento,
      Object.assign(new Agendamento(), {
        id: ID,
        clienteId: ID,
        profissionalId: ID,
        servicoId: ID,
        status: StatusAgendamento.PENDENTE,
        dataHoraInicio: new Date(INICIO),
        dataHoraFim: new Date('2030-10-21T10:40:00'),
      }),
    ],
  ]);
  const agendamento = registros.get(Agendamento) as Agendamento;
  agendamento.profissional = registros.get(Profissional) as Profissional;
  agendamento.servico = registros.get(Servico) as Servico;
  const saldos = new Map<string, ClienteEstabelecimento>();
  const chaveSaldo = (clienteId: string, estabelecimentoId: string) =>
    `${clienteId}:${estabelecimentoId}`;
  const disponibilidades = [
    Object.assign(new DisponibilidadeProfissional(), { horaInicio: '09:00', horaFim: '18:00' }),
  ];
  const bloqueios: BloqueioAgenda[] = [];
  const manager = {
    findOne: vi.fn(async (entidade: Function, opcoes: object) => {
      if (entidade === ClienteEstabelecimento) {
        const { where } = opcoes as { where: { clienteId: string; estabelecimentoId: string } };
        return saldos.get(chaveSaldo(where.clienteId, where.estabelecimentoId)) ?? null;
      }
      return registros.get(entidade) ?? null;
    }),
    findOneOrFail: vi.fn(async (entidade: Function, _opcoes: object) => {
      const registro = registros.get(entidade);
      if (!registro) throw new Error('Registro vinculado ausente');
      return registro;
    }),
    find: vi.fn(async (entidade: Function, _opcoes: object) => {
      if (entidade === DisponibilidadeProfissional) return disponibilidades;
      if (entidade === BloqueioAgenda) return bloqueios;
      return [];
    }),
    exists: vi.fn(async (_entidade: Function, _opcoes: object) => false),
    create: vi.fn((entidade: Function, dados: object) =>
      Object.assign(Object.create(entidade.prototype), dados),
    ),
    save: vi.fn(async (alvo: object | Function, dados?: object): Promise<object> => {
      const registro = dados ?? alvo;
      if (registro instanceof ClienteEstabelecimento) {
        saldos.set(chaveSaldo(registro.clienteId, registro.estabelecimentoId), registro);
        return registro;
      }
      return Object.assign(registro, { id: ID });
    }),
  };
  const runner = {
    manager,
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
  };
  const dataSource = { createQueryRunner: vi.fn(() => runner), manager };
  const email = {
    enviarAgendamentoCriado: vi.fn(async () => true),
    enviarAgendamentoCancelado: vi.fn(async () => true),
  };
  const fidelidadeRepository = {
    findOne: vi.fn(async (opcoes: object) => manager.findOne(ClienteEstabelecimento, opcoes)),
  };
  return {
    registros,
    disponibilidades,
    bloqueios,
    manager,
    runner,
    dataSource,
    email,
    saldos,
    fidelidadeRepository,
    chaveSaldo,
  };
}
