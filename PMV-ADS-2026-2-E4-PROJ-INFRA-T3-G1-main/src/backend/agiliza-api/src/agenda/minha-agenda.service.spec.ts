import { DataSource } from 'typeorm';
import { MinhaAgendaService } from './minha-agenda.service.js';
import { Agendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { BloqueioAgenda } from './entities/bloqueio-agenda.entity.js';
import { DisponibilidadeProfissional } from './entities/disponibilidade-profissional.entity.js';

describe('MinhaAgendaService', () => {
  const manager = { findOne: vi.fn(), find: vi.fn(), delete: vi.fn(), create: vi.fn(), save: vi.fn() };
  const runner = {
    connect: vi.fn(), startTransaction: vi.fn(), commitTransaction: vi.fn(), rollbackTransaction: vi.fn(), release: vi.fn(),
    manager: { findOneOrFail: vi.fn(), find: vi.fn(), save: vi.fn(), create: vi.fn() },
  };
  const service = new MinhaAgendaService({ manager, createQueryRunner: () => runner } as unknown as DataSource);
  const usuarioId = 'usuario-1';
  const profissionalId = 'profissional-1';

  beforeEach(() => {
    vi.clearAllMocks();
    manager.findOne.mockImplementation(async (entidade) =>
      entidade === Estabelecimento
        ? { id: 'estabelecimento-1', horarioAbertura: '08:00:00', horarioFechamento: '19:00:00' }
        : { id: profissionalId, estabelecimentoId: 'estabelecimento-1' });
    manager.find.mockResolvedValue([]);
    manager.create.mockImplementation((_entidade, dados) => dados);
    manager.save.mockImplementation(async (dados) => ({ ...dados, id: 'disponibilidade-1' }));
    runner.manager.findOneOrFail.mockResolvedValue({ id: profissionalId });
    runner.manager.find.mockResolvedValue([]);
    runner.manager.create.mockImplementation((_entidade, dados) => dados);
    runner.manager.save.mockImplementation((_entidade, dados) => ({ ...dados, id: 'bloqueio-1' }));
  });

  it('consulta somente os dados da agenda do titular sem expor dados pessoais do cliente', async () => {
    manager.find.mockImplementation((entidade) => {
      if (entidade === DisponibilidadeProfissional) return [{ horaInicio: '09:00:00', horaFim: '12:00:00' }];
      if (entidade === BloqueioAgenda) return [];
      if (entidade === Agendamento) return [{
        id: 'agendamento-1', dataHoraInicio: new Date('2030-10-21T09:00:00'),
        dataHoraFim: new Date('2030-10-21T09:30:00'), status: 1,
        cliente: { usuario: { nome: 'Ana', email: 'privado@example.com', senha: 'segredo' } },
        servico: { nome: 'Corte', preco: 5000 },
      }];
      return [];
    });
    const resposta = await service.consultar(usuarioId, '2030-10-21');
    expect(manager.findOne).toHaveBeenCalledWith(Profissional, { where: { usuarioId }, loadEagerRelations: false });
    expect(manager.find).toHaveBeenCalledWith(Agendamento, expect.objectContaining({
      where: expect.objectContaining({ profissionalId }),
    }));
    expect(resposta.agendamentos).toEqual([expect.objectContaining({ cliente: 'Ana', servico: 'Corte' })]);
    expect(JSON.stringify(resposta)).not.toMatch(/senha|email|preco|segredo/);
  });

  it('não retorna a agenda de outro profissional se não existe vínculo com o token', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(service.consultar(usuarioId, '2030-10-21')).rejects.toMatchObject({ status: 404 });
    expect(manager.find).not.toHaveBeenCalled();
  });

  it('impede bloqueio de horário já agendado e desfaz a transação', async () => {
    runner.manager.find.mockImplementation((entidade) => {
      if (entidade === DisponibilidadeProfissional) return [{ horaInicio: '09:00', horaFim: '12:00' }];
      if (entidade === Agendamento) return [{ dataHoraInicio: new Date('2030-10-21T09:00:00'), dataHoraFim: new Date('2030-10-21T09:30:00') }];
      return [];
    });
    await expect(service.criarBloqueio(usuarioId, {
      data: '2030-10-21', horaInicio: '09:00', horaFim: '09:30',
    })).rejects.toMatchObject({ status: 409 });
    expect(runner.manager.save).not.toHaveBeenCalled();
    expect(runner.rollbackTransaction).toHaveBeenCalledOnce();
    expect(runner.release).toHaveBeenCalledOnce();
  });

  it('cria bloqueio somente no próprio expediente, com transação confirmada', async () => {
    runner.manager.find.mockImplementation((entidade) => {
      if (entidade === DisponibilidadeProfissional) return [{ horaInicio: '09:00', horaFim: '12:00' }];
      return [];
    });
    const resultado = await service.criarBloqueio(usuarioId, {
      data: '2030-10-21', horaInicio: '09:30', horaFim: '10:00', motivo: 'Pausa',
    });
    expect(runner.manager.findOneOrFail).toHaveBeenCalledWith(Profissional, expect.objectContaining({
      where: { id: profissionalId }, lock: { mode: 'pessimistic_write' },
    }));
    expect(runner.manager.create).toHaveBeenCalledWith(BloqueioAgenda, expect.objectContaining({ profissionalId }));
    expect(resultado).toMatchObject({ id: 'bloqueio-1', motivo: 'Pausa' });
    expect(runner.commitTransaction).toHaveBeenCalledOnce();
    expect(runner.release).toHaveBeenCalledOnce();
  });

  it('permite registrar um bloqueio antes da configuração das disponibilidades', async () => {
    runner.manager.find.mockResolvedValue([]);
    const salvo = await service.criarBloqueio(usuarioId, {
      data: '2030-10-21', horaInicio: '09:00', horaFim: '09:30',
    });
    expect(salvo).toMatchObject({ id: 'bloqueio-1', data: '2030-10-21' });
    expect(runner.manager.save).toHaveBeenCalledOnce();
  });

  it('permite bloquear o dia inteiro, sem horários, com motivo', async () => {
    runner.manager.find.mockResolvedValue([]);
    const salvo = await service.criarBloqueio(usuarioId, { data: '2030-10-21', motivo: 'Folga' });
    expect(runner.manager.create).toHaveBeenCalledWith(BloqueioAgenda, expect.objectContaining({
      profissionalId, horaInicio: null, horaFim: null, motivo: 'Folga',
    }));
    expect(salvo).toMatchObject({ horaInicio: null, horaFim: null, motivo: 'Folga' });
  });

  it('rejeita bloqueio de dia inteiro quando já existe agendamento', async () => {
    runner.manager.find.mockImplementation((entidade) => entidade === Agendamento
      ? [{ dataHoraInicio: new Date('2030-10-21T09:00:00'), dataHoraFim: new Date('2030-10-21T09:30:00') }]
      : []);
    await expect(service.criarBloqueio(usuarioId, { data: '2030-10-21' })).rejects.toMatchObject({ status: 409 });
    expect(runner.manager.save).not.toHaveBeenCalled();
  });

  it('exige os dois horários quando o bloqueio não é para o dia inteiro', async () => {
    await expect(service.criarBloqueio(usuarioId, { data: '2030-10-21', horaInicio: '09:00' }))
      .rejects.toMatchObject({ status: 400 });
    expect(runner.connect).not.toHaveBeenCalled();
  });

  it('lista apenas bloqueios do profissional autenticado', async () => {
    manager.find.mockResolvedValue([{ id: 'b1', data: '2030-10-21', horaInicio: null, horaFim: null, motivo: 'Folga', profissionalId }]);
    const lista = await service.listarBloqueios(usuarioId);
    expect(manager.find).toHaveBeenCalledWith(BloqueioAgenda, {
      where: { profissionalId }, order: { data: 'DESC', horaInicio: 'ASC' },
    });
    expect(lista).toEqual([{ id: 'b1', data: '2030-10-21', horaInicio: null, horaFim: null, motivo: 'Folga' }]);
  });

  it('lista só a disponibilidade semanal do profissional do token, por dia e início', async () => {
    manager.find.mockResolvedValue([{ id: 'd1', diaSemana: 1, horaInicio: '09:00:00', horaFim: '12:00:00', ativo: true }]);
    const lista = await service.listarDisponibilidades(usuarioId);
    expect(manager.findOne).toHaveBeenCalledWith(Profissional, { where: { usuarioId }, loadEagerRelations: false });
    expect(manager.find).toHaveBeenCalledWith(DisponibilidadeProfissional, {
      where: { profissionalId }, order: { diaSemana: 'ASC', horaInicio: 'ASC' },
    });
    expect(lista).toHaveLength(1);
  });

  it('cria a disponibilidade vinculada ao profissional do token', async () => {
    const dto = { diaSemana: 2, horaInicio: '13:00', horaFim: '18:00' };
    const criada = await service.criarDisponibilidade(usuarioId, dto);
    expect(manager.create).toHaveBeenCalledWith(DisponibilidadeProfissional, { ...dto, profissionalId });
    expect(criada).toEqual({ ...dto, profissionalId, id: 'disponibilidade-1' });
  });

  it('confere a disponibilidade nova com o funcionamento e os horários do mesmo dia', async () => {
    await service.criarDisponibilidade(usuarioId, { diaSemana: 2, horaInicio: '13:00', horaFim: '18:00' });
    expect(manager.findOne).toHaveBeenCalledWith(Estabelecimento, {
      where: { id: 'estabelecimento-1' }, select: { id: true, horarioAbertura: true, horarioFechamento: true },
    });
    expect(manager.find).toHaveBeenCalledWith(DisponibilidadeProfissional, { where: { profissionalId, diaSemana: 2 } });
  });

  it.each([
    [{ horaInicio: '18:00', horaFim: '13:00' }, 'O horário final precisa ser posterior ao horário inicial.'],
    [{ horaInicio: '13:00', horaFim: '20:00' }, 'O horário precisa estar dentro do funcionamento do estabelecimento (08:00 às 19:00).'],
    [{ horaInicio: '11:00', horaFim: '14:00' }, 'Este horário se sobrepõe a outro já cadastrado na terça-feira (08:00 às 12:00).'],
  ])('recusa %o com 400 e não grava', async (horas, mensagem) => {
    manager.find.mockResolvedValue([{ id: 'd1', diaSemana: 2, horaInicio: '08:00:00', horaFim: '12:00:00' }]);
    await expect(service.criarDisponibilidade(usuarioId, { diaSemana: 2, ...horas })).rejects.toMatchObject({
      status: 400, message: mensagem,
    });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('remove só a disponibilidade do profissional do token', async () => {
    manager.delete.mockResolvedValue({ affected: 1 });
    await expect(service.removerDisponibilidade(usuarioId, 'd1')).resolves.toBeUndefined();
    expect(manager.delete).toHaveBeenCalledWith(DisponibilidadeProfissional, { id: 'd1', profissionalId });
  });

  it('não remove disponibilidade de outro profissional', async () => {
    manager.delete.mockResolvedValue({ affected: 0 });
    await expect(service.removerDisponibilidade(usuarioId, 'outro-id')).rejects.toMatchObject({ status: 404 });
  });

  it.each(['listarDisponibilidades', 'criarDisponibilidade', 'removerDisponibilidade'] as const)(
    '%s responde 404 quando o token não é de um profissional',
    async (metodo) => {
      manager.findOne.mockResolvedValue(null);
      const chamada = metodo === 'listarDisponibilidades'
        ? service.listarDisponibilidades(usuarioId)
        : metodo === 'criarDisponibilidade'
          ? service.criarDisponibilidade(usuarioId, { diaSemana: 1, horaInicio: '09:00', horaFim: '10:00' })
          : service.removerDisponibilidade(usuarioId, 'd1');
      await expect(chamada).rejects.toMatchObject({ status: 404 });
      expect(manager.find).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
      expect(manager.delete).not.toHaveBeenCalled();
    },
  );

  it('não remove bloqueio de outro profissional', async () => {
    manager.delete.mockResolvedValue({ affected: 0 });
    await expect(service.removerBloqueio(usuarioId, 'outro-id')).rejects.toMatchObject({ status: 404 });
    expect(manager.delete).toHaveBeenCalledWith(BloqueioAgenda, { id: 'outro-id', profissionalId });
  });
});
