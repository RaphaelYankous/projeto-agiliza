import { NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { Agendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Notificacao } from './entities/notificacao.entity.js';
import { NotificacoesService } from './notificacoes.service.js';

const agendamento = {
  id: 'agend-1',
  dataHoraInicio: new Date('2030-10-21T10:00:00'),
  cliente: { usuarioId: 'usuario-cliente' },
  profissional: { usuarioId: 'usuario-profissional', estabelecimentoId: 'estab-1' },
  servico: { nome: 'Corte' },
};
const estabelecimento = { id: 'estab-1', nome: 'Barbearia', gestorId: 'usuario-gestor' };

function montar() {
  const manager = {
    find: vi.fn(async () => [] as Notificacao[]),
    findOne: vi.fn(async (entidade: unknown) => {
      if (entidade === Agendamento) return agendamento;
      if (entidade === Estabelecimento) return estabelecimento;
      return null;
    }),
    update: vi.fn(async () => ({ affected: 1 })),
    create: vi.fn((_entidade: unknown, dados: object) => dados),
    save: vi.fn(async (dados: object) => dados),
  };
  const service = new NotificacoesService({ manager } as unknown as DataSource);
  return { service, manager };
}

describe('NotificacoesService.listar', () => {
  it('lista as 50 notificações mais recentes do usuário, sem o id do usuário', async () => {
    const { service, manager } = montar();
    const criadaEm = new Date('2030-10-20T08:00:00');
    manager.find.mockResolvedValueOnce([
      Object.assign(new Notificacao(), {
        id: 'n1',
        usuarioId: 'usuario-cliente',
        tipo: 'agendamento_criado',
        titulo: 'Novo agendamento',
        mensagem: 'Corte foi criado.',
        lida: false,
        createdAt: criadaEm,
      }),
    ]);

    const lista = await service.listar('usuario-cliente');

    expect(manager.find).toHaveBeenCalledWith(Notificacao, {
      where: { usuarioId: 'usuario-cliente' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    expect(lista).toEqual([
      {
        id: 'n1',
        tipo: 'agendamento_criado',
        titulo: 'Novo agendamento',
        mensagem: 'Corte foi criado.',
        lida: false,
        criadaEm,
      },
    ]);
  });
});

describe('NotificacoesService.marcarComoLida', () => {
  it('marca como lida só a notificação do próprio usuário', async () => {
    const { service, manager } = montar();

    await expect(service.marcarComoLida('usuario-cliente', 'n1')).resolves.toBeUndefined();

    expect(manager.update).toHaveBeenCalledWith(
      Notificacao,
      { id: 'n1', usuarioId: 'usuario-cliente' },
      { lida: true },
    );
  });

  it('responde 404 para notificação inexistente ou de outro usuário', async () => {
    const { service, manager } = montar();
    manager.update.mockResolvedValueOnce({ affected: 0 });

    await expect(service.marcarComoLida('usuario-cliente', 'de-outro')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('NotificacoesService.criarParaAgendamento', () => {
  it.each([
    ['agendamento_criado', 'Novo agendamento', 'foi criado.'],
    ['agendamento_cancelado', 'Agendamento cancelado', 'foi cancelado.'],
  ] as const)('%s avisa o cliente, o profissional e o gestor', async (tipo, titulo, fim) => {
    const { service, manager } = montar();

    await service.criarParaAgendamento('agend-1', tipo);

    expect(manager.save).toHaveBeenCalledTimes(1);
    const criadas = manager.save.mock.calls[0][0] as unknown as {
      usuarioId: string;
      tipo: string;
      titulo: string;
      mensagem: string;
    }[];
    expect(criadas.map((item) => item.usuarioId)).toEqual([
      'usuario-cliente',
      'usuario-profissional',
      'usuario-gestor',
    ]);
    for (const item of criadas) {
      expect(item).toMatchObject({ tipo, titulo });
      expect(item.mensagem).toMatch(new RegExp(`^Corte em .+ ${fim}$`));
    }
  });

  it('não cria notificação quando o agendamento não existe', async () => {
    const { service, manager } = montar();
    manager.findOne.mockResolvedValueOnce(null);

    await service.criarParaAgendamento('inexistente', 'agendamento_criado');

    expect(manager.save).not.toHaveBeenCalled();
  });

  it('não cria notificação quando o estabelecimento não existe', async () => {
    const { service, manager } = montar();
    manager.findOne.mockResolvedValueOnce(agendamento).mockResolvedValueOnce(null);

    await service.criarParaAgendamento('agend-1', 'agendamento_criado');

    expect(manager.save).not.toHaveBeenCalled();
  });
});
