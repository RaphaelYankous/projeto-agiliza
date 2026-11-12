import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AgendasService } from './agenda.service.js';
import { DisponibilidadeProfissional } from './entities/disponibilidade-profissional.entity.js';
import { BloqueioAgenda } from './entities/bloqueio-agenda.entity.js';
import { Agendamento, StatusAgendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { alinhadoAoPasso } from './regras-horario.js';
import { repositoryMock } from '../../test/helpers/mocks.js';
import { ID } from '../../test/helpers/fixtures.js';

const data = '2030-10-21';
const OUTRO_GESTOR = '3b8c6a1e-5f4d-4b2a-9c7e-1d2f3a4b5c6d';
function montar() {
  const disponibilidade = repositoryMock(
    Object.assign(new DisponibilidadeProfissional(), {
      id: ID,
      profissionalId: ID,
      diaSemana: 1,
      horaInicio: '09:00',
      horaFim: '11:00',
      ativo: true,
    }),
  );
  const bloqueio = repositoryMock(
    Object.assign(new BloqueioAgenda(), { id: ID, profissionalId: ID, data }),
  );
  bloqueio.find.mockResolvedValue([]);
  const query = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getMany: vi.fn(async (): Promise<Agendamento[]> => []),
  };
  const agendamento = { createQueryBuilder: vi.fn(() => query) };
  const servico = repositoryMock(
    Object.assign(new Servico(), { id: ID, duracao: 40, estabelecimentoId: ID }),
  );
  const estabelecimento = repositoryMock(
    Object.assign(new Estabelecimento(), {
      id: ID,
      gestorId: ID,
      horarioAbertura: '08:00:00',
      horarioFechamento: '19:00:00',
    }),
  );
  const profissional = repositoryMock(
    Object.assign(new Profissional(), { id: ID, estabelecimentoId: ID }),
  );
  const service = new AgendasService(
    disponibilidade as unknown as Repository<DisponibilidadeProfissional>,
    bloqueio as unknown as Repository<BloqueioAgenda>,
    agendamento as unknown as Repository<Agendamento>,
    servico as unknown as Repository<Servico>,
    estabelecimento as unknown as Repository<Estabelecimento>,
    profissional as unknown as Repository<Profissional>,
  );
  return { service, disponibilidade, bloqueio, servico, estabelecimento, profissional, query };
}

describe('AgendasService — disponibilidades e bloqueios', () => {
  const dto = { diaSemana: 2, horaInicio: '09:00', horaFim: '11:00' };

  it('vincula a disponibilidade ao profissional informado', async () => {
    const { service, disponibilidade } = montar();
    await expect(service.createDisponibilidade(ID, dto, ID)).resolves.toMatchObject({
      ...dto,
      profissionalId: ID,
    });
    expect(disponibilidade.create).toHaveBeenCalledWith({ ...dto, profissionalId: ID });
  });

  it('ordena as disponibilidades por dia e início', async () => {
    const { service, disponibilidade } = montar();
    await service.findDisponibilidadesByProfissional(ID);
    expect(disponibilidade.find).toHaveBeenCalledWith({
      where: { profissionalId: ID },
      order: { diaSemana: 'ASC', horaInicio: 'ASC' },
    });
  });

  it('desativa uma disponibilidade preservando os horários', async () => {
    const { service } = montar();
    await expect(service.updateDisponibilidade(ID, { ativo: false }, ID)).resolves.toMatchObject({
      ativo: false,
      horaInicio: '09:00',
      horaFim: '11:00',
    });
  });

  it('não salva disponibilidade inexistente', async () => {
    const { service, disponibilidade } = montar();
    disponibilidade.findOneBy.mockResolvedValueOnce(null);
    await expect(service.updateDisponibilidade(ID, { ativo: false }, ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(disponibilidade.save).not.toHaveBeenCalled();
  });

  it('remove disponibilidade existente', async () => {
    const { service, disponibilidade } = montar();
    await expect(service.removeDisponibilidade(ID, ID)).resolves.toBeUndefined();
    expect(disponibilidade.delete).toHaveBeenCalledWith(ID);
  });

  it('retorna 404 ao remover disponibilidade inexistente', async () => {
    const { service, disponibilidade } = montar();
    disponibilidade.findOneBy.mockResolvedValueOnce(null);
    await expect(service.removeDisponibilidade(ID, ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(disponibilidade.delete).not.toHaveBeenCalled();
  });

  it('cadastra bloqueio de dia inteiro sem horários', async () => {
    const { service, bloqueio } = montar();
    await expect(service.createBloqueio(ID, { data }, ID)).resolves.toMatchObject({
      data,
      profissionalId: ID,
    });
    expect(bloqueio.create).toHaveBeenCalledWith({ data, profissionalId: ID });
  });

  it('lista bloqueios por data', async () => {
    const { service, bloqueio } = montar();
    await expect(service.findBloqueiosByProfissional(ID, ID)).resolves.toEqual([]);
    expect(bloqueio.find).toHaveBeenCalledWith({
      where: { profissionalId: ID },
      order: { data: 'ASC' },
    });
  });

  it('remove bloqueio existente', async () => {
    const { service, bloqueio } = montar();
    await expect(service.removeBloqueio(ID, ID)).resolves.toBeUndefined();
    expect(bloqueio.delete).toHaveBeenCalledWith(ID);
  });

  it('retorna 404 ao remover bloqueio inexistente', async () => {
    const { service, bloqueio } = montar();
    bloqueio.findOneBy.mockResolvedValueOnce(null);
    await expect(service.removeBloqueio(ID, ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(bloqueio.delete).not.toHaveBeenCalled();
  });
});

describe('AgendasService — só o gestor dono gerencia a agenda do profissional', () => {
  const dto = { diaSemana: 1, horaInicio: '09:00', horaFim: '11:00' };
  type Montado = ReturnType<typeof montar>;
  const operacoes: [
    string,
    (montado: Montado, gestorId: string) => Promise<unknown>,
    (montado: Montado) => unknown,
  ][] = [
    [
      'criar disponibilidade',
      ({ service }, g) => service.createDisponibilidade(ID, dto, g),
      (m) => m.disponibilidade.save,
    ],
    [
      'alterar disponibilidade',
      ({ service }, g) => service.updateDisponibilidade(ID, { ativo: false }, g),
      (m) => m.disponibilidade.save,
    ],
    [
      'remover disponibilidade',
      ({ service }, g) => service.removeDisponibilidade(ID, g),
      (m) => m.disponibilidade.delete,
    ],
    [
      'criar bloqueio',
      ({ service }, g) => service.createBloqueio(ID, { data }, g),
      (m) => m.bloqueio.save,
    ],
    [
      'listar bloqueios',
      ({ service }, g) => service.findBloqueiosByProfissional(ID, g),
      (m) => m.bloqueio.find,
    ],
    [
      'remover bloqueio',
      ({ service }, g) => service.removeBloqueio(ID, g),
      (m) => m.bloqueio.delete,
    ],
  ];

  it.each(operacoes)(
    'recusa %s para gestor de outro estabelecimento',
    async (_nome, executar, acaoNoBanco) => {
      const montado = montar();
      await expect(executar(montado, OUTRO_GESTOR)).rejects.toThrow(
        new ForbiddenException('Este profissional não pertence ao seu estabelecimento.'),
      );
      expect(acaoNoBanco(montado)).not.toHaveBeenCalled();
    },
  );

  it.each(operacoes)(
    'responde 404 ao %s de profissional inexistente',
    async (_nome, executar, acaoNoBanco) => {
      const montado = montar();
      montado.profissional.findOne.mockResolvedValueOnce(null);
      await expect(executar(montado, ID)).rejects.toThrow(
        new NotFoundException('Profissional não encontrado.'),
      );
      expect(acaoNoBanco(montado)).not.toHaveBeenCalled();
    },
  );

  it('confere o dono pelo profissional do registro ao alterar ou remover', async () => {
    const montado = montar();
    montado.disponibilidade.findOneBy.mockResolvedValueOnce(
      Object.assign(new DisponibilidadeProfissional(), {
        id: ID,
        profissionalId: 'outro-profissional',
      }),
    );
    await montado.service.removeDisponibilidade(ID, ID);
    expect(montado.profissional.findOne).toHaveBeenCalledWith({
      where: { id: 'outro-profissional' },
      loadEagerRelations: false,
    });
    expect(montado.estabelecimento.findOneBy).toHaveBeenCalledWith({ id: ID });
  });

  it('responde 404 quando o estabelecimento do profissional não existe', async () => {
    const montado = montar();
    montado.estabelecimento.findOneBy.mockResolvedValueOnce(null);
    await expect(montado.service.createDisponibilidade(ID, dto, ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(montado.disponibilidade.save).not.toHaveBeenCalled();
  });
});

describe('AgendasService — regras dos horários do profissional', () => {
  const salvo = (horaInicio: string, horaFim: string, id = 'outro') =>
    Object.assign(new DisponibilidadeProfissional(), {
      id,
      profissionalId: ID,
      diaSemana: 1,
      horaInicio,
      horaFim,
      ativo: true,
    });

  it.each([
    [
      { horaInicio: '10:00', horaFim: '09:00' },
      'O horário final precisa ser posterior ao horário inicial.',
    ],
    [
      { horaInicio: '07:00', horaFim: '09:00' },
      'O horário precisa estar dentro do funcionamento do estabelecimento (08:00 às 19:00).',
    ],
    [
      { horaInicio: '10:00', horaFim: '12:00' },
      'Este horário se sobrepõe a outro já cadastrado na segunda-feira (09:00 às 11:00).',
    ],
  ])('recusa criar %o com 400', async (horas, mensagem) => {
    const { service, disponibilidade } = montar();
    await expect(service.createDisponibilidade(ID, { diaSemana: 1, ...horas }, ID)).rejects.toThrow(
      new BadRequestException(mensagem),
    );
    expect(disponibilidade.save).not.toHaveBeenCalled();
  });

  it('compara só com os horários do profissional no mesmo dia', async () => {
    const { service, disponibilidade } = montar();
    disponibilidade.find.mockResolvedValueOnce([]);
    await service.createDisponibilidade(
      ID,
      { diaSemana: 3, horaInicio: '09:00', horaFim: '11:00' },
      ID,
    );
    expect(disponibilidade.find).toHaveBeenCalledWith({
      where: { profissionalId: ID, diaSemana: 3 },
    });
  });

  it('recusa alterar o horário para cima de outro do mesmo dia', async () => {
    const { service, disponibilidade } = montar();
    disponibilidade.find.mockResolvedValueOnce([
      salvo('09:00', '11:00', ID),
      salvo('12:00', '14:00'),
    ]);
    await expect(service.updateDisponibilidade(ID, { horaFim: '13:00' }, ID)).rejects.toThrow(
      new BadRequestException(
        'Este horário se sobrepõe a outro já cadastrado na segunda-feira (12:00 às 14:00).',
      ),
    );
    expect(disponibilidade.save).not.toHaveBeenCalled();
  });

  it('não conta o próprio horário ao alterar', async () => {
    const { service, disponibilidade } = montar();
    disponibilidade.find.mockResolvedValueOnce([salvo('09:00', '11:00', ID)]);
    await expect(
      service.updateDisponibilidade(ID, { horaFim: '12:00' }, ID),
    ).resolves.toMatchObject({
      horaFim: '12:00',
    });
  });

  it('desativa um horário antigo fora do funcionamento sem conferir as regras', async () => {
    const { service, disponibilidade } = montar();
    disponibilidade.findOneBy.mockResolvedValueOnce(salvo('06:00', '21:00', ID));
    await expect(service.updateDisponibilidade(ID, { ativo: false }, ID)).resolves.toMatchObject({
      ativo: false,
      horaInicio: '06:00',
    });
    expect(disponibilidade.find).not.toHaveBeenCalled();
  });
});

function janela(horaInicio: string, horaFim: string) {
  return Object.assign(new DisponibilidadeProfissional(), { horaInicio, horaFim });
}

function agendamentoMarcado(inicio: string, fim: string) {
  return Object.assign(new Agendamento(), {
    dataHoraInicio: new Date(`${data}T${inicio}:00`),
    dataHoraFim: new Date(`${data}T${fim}:00`),
  });
}

function comDuracao(servico: ReturnType<typeof montar>['servico'], duracao: number) {
  servico.findOneBy.mockResolvedValueOnce(
    Object.assign(new Servico(), { duracao, estabelecimentoId: ID }),
  );
}

function cenarioDosPrints(montado: ReturnType<typeof montar>, duracao: number) {
  montado.disponibilidade.find.mockResolvedValueOnce([
    janela('08:00', '13:00'),
    janela('14:00', '18:00'),
  ]);
  montado.query.getMany.mockResolvedValueOnce([agendamentoMarcado('12:00', '12:15')]);
  comDuracao(montado.servico, duracao);
}

describe('AgendasService — horários disponíveis', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('oferece horários de 30 em 30 minutos, seja qual for a duração do serviço', async () => {
    const { service, disponibilidade, query } = montar();
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual([
      '09:00',
      '09:30',
      '10:00',
    ]);
    expect(disponibilidade.find).toHaveBeenCalledWith({
      where: { profissionalId: ID, diaSemana: 1, ativo: true },
    });
    expect(query.andWhere).toHaveBeenCalledWith('a.status != :cancelado', {
      cancelado: StatusAgendamento.CANCELADO,
    });
  });

  it('inclui atendimento que termina exatamente no fim da janela', async () => {
    const { service, servico } = montar();
    comDuracao(servico, 60);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual([
      '09:00',
      '09:30',
      '10:00',
    ]);
  });

  it.each([
    {
      duracao: 25,
      horarios: [
        '08:00',
        '08:30',
        '09:00',
        '09:30',
        '10:00',
        '10:30',
        '11:00',
        '11:30',
        '12:30',
        '14:00',
        '14:30',
        '15:00',
        '15:30',
        '16:00',
        '16:30',
        '17:00',
        '17:30',
      ],
    },
    {
      duracao: 60,
      horarios: [
        '08:00',
        '08:30',
        '09:00',
        '09:30',
        '10:00',
        '10:30',
        '11:00',
        '14:00',
        '14:30',
        '15:00',
        '15:30',
        '16:00',
        '16:30',
        '17:00',
      ],
    },
    {
      duracao: 120,
      horarios: [
        '08:00',
        '08:30',
        '09:00',
        '09:30',
        '10:00',
        '14:00',
        '14:30',
        '15:00',
        '15:30',
        '16:00',
      ],
    },
  ])(
    'no cenário com agendamento às 12:00, serviço de $duracao min oferece horários alinhados ao relógio',
    async ({ duracao, horarios }) => {
      const montado = montar();
      cenarioDosPrints(montado, duracao);
      await expect(montado.service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual(horarios);
    },
  );

  it('todo horário oferecido está alinhado e cabe no expediente, no funcionamento e numa janela', async () => {
    const montado = montar();
    cenarioDosPrints(montado, 60);
    const horarios = await montado.service.getHorariosDisponiveis(ID, data, ID);
    const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
    const janelas = [
      [8 * 60, 13 * 60],
      [14 * 60, 18 * 60],
    ];
    expect(horarios.length).toBeGreaterThan(0);
    for (const horario of horarios) {
      const inicio = minutos(horario);
      expect(alinhadoAoPasso(inicio)).toBe(true);
      expect(inicio >= 8 * 60 && inicio + 60 <= 19 * 60).toBe(true);
      expect(janelas.some(([de, ate]) => inicio >= de && inicio + 60 <= ate)).toBe(true);
      expect(inicio + 60 <= 12 * 60 || inicio >= 12 * 60 + 15).toBe(true);
    }
  });

  it('começa no primeiro horário alinhado quando a janela não começa em hora cheia ou meia hora', async () => {
    const { service, disponibilidade } = montar();
    disponibilidade.find.mockResolvedValueOnce([janela('08:15', '10:00')]);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual(['08:30', '09:00']);
  });

  it('não oferece horário em que o serviço passaria do fim da janela do profissional', async () => {
    const { service, disponibilidade, servico } = montar();
    disponibilidade.find.mockResolvedValueOnce([janela('09:00', '10:45')]);
    comDuracao(servico, 60);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual(['09:00', '09:30']);
  });

  it('recorta a janela do profissional pelo horário de funcionamento do estabelecimento', async () => {
    const { service, disponibilidade, servico, estabelecimento } = montar();
    disponibilidade.find.mockResolvedValueOnce([janela('07:00', '20:00')]);
    estabelecimento.findOneBy.mockResolvedValueOnce(
      Object.assign(new Estabelecimento(), {
        horarioAbertura: '17:00:00',
        horarioFechamento: '19:00:00',
      }),
    );
    comDuracao(servico, 60);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual([
      '17:00',
      '17:30',
      '18:00',
    ]);
    expect(estabelecimento.findOneBy).toHaveBeenCalledWith({ id: ID });
  });

  it('não oferece horários que já passaram no dia de hoje', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${data}T12:07:00`));
    const montado = montar();
    cenarioDosPrints(montado, 60);
    await expect(montado.service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual([
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
    ]);
  });

  it('não descarta horários de outro dia por causa do horário atual', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2030-10-20T12:07:00'));
    const { service } = montar();
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual([
      '09:00',
      '09:30',
      '10:00',
    ]);
  });

  it('retorna [] sem disponibilidade e não consulta agendamentos', async () => {
    const { service, disponibilidade, query } = montar();
    disponibilidade.find.mockResolvedValueOnce([]);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual([]);
    expect(query.getMany).not.toHaveBeenCalled();
  });

  it('retorna 404 para serviço inexistente', async () => {
    const { service, servico } = montar();
    servico.findOneBy.mockResolvedValueOnce(null);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('retorna 404 quando o estabelecimento do serviço não existe', async () => {
    const { service, estabelecimento } = montar();
    estabelecimento.findOneBy.mockResolvedValueOnce(null);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    { duracao: 90, horarios: ['09:00', '09:30'] },
    { duracao: 121, horarios: [] },
  ])('descarta sobra insuficiente com duração $duracao', async ({ duracao, horarios }) => {
    const { service, servico } = montar();
    comDuracao(servico, duracao);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual(horarios);
  });

  it('aceita horários com segundos e devolve várias janelas em ordem', async () => {
    const { service, disponibilidade } = montar();
    disponibilidade.find.mockResolvedValueOnce([
      janela('14:00', '14:40'),
      janela('09:00:00', '09:40:00'),
    ]);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual(['09:00', '14:00']);
  });

  it('bloqueio de dia inteiro remove todos os horários', async () => {
    const { service, bloqueio } = montar();
    bloqueio.find.mockResolvedValueOnce([
      Object.assign(new BloqueioAgenda(), { horaInicio: null, horaFim: null }),
    ]);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual([]);
  });

  it('bloqueio parcial remove sobreposições, mas preserva horários adjacentes', async () => {
    const { service, bloqueio } = montar();
    bloqueio.find.mockResolvedValueOnce([
      Object.assign(new BloqueioAgenda(), { horaInicio: '09:40', horaFim: '10:00' }),
    ]);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual(['09:00', '10:00']);
  });

  it('remove horários ocupados por um atendimento que atravessa vários horários', async () => {
    const { service, query } = montar();
    query.getMany.mockResolvedValueOnce([agendamentoMarcado('09:10', '09:50')]);
    await expect(service.getHorariosDisponiveis(ID, data, ID)).resolves.toEqual(['10:00']);
  });
});
