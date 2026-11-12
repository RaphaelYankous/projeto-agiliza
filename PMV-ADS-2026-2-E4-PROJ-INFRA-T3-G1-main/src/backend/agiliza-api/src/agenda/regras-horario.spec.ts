import {
  alinhadoAoPasso,
  PASSO_HORARIO_MINUTOS,
  primeiroHorarioAlinhado,
  validarHorario,
} from './regras-horario.js';

describe('regras de horário', () => {
  it('usa passo de 30 minutos', () => {
    expect(PASSO_HORARIO_MINUTOS).toBe(30);
  });

  it.each([
    [0, true],
    [8 * 60, true],
    [8 * 60 + 30, true],
    [8 * 60 + 15, false],
    [8 * 60 + 25, false],
    [23 * 60 + 59, false],
  ])('alinhadoAoPasso(%i) = %s', (minutos, esperado) => {
    expect(alinhadoAoPasso(minutos)).toBe(esperado);
  });

  it.each([
    [8 * 60, 8 * 60],
    [8 * 60 + 1, 8 * 60 + 30],
    [8 * 60 + 15, 8 * 60 + 30],
    [8 * 60 + 30, 8 * 60 + 30],
    [8 * 60 + 31, 9 * 60],
  ])('primeiroHorarioAlinhado(%i) = %i', (minutos, esperado) => {
    expect(primeiroHorarioAlinhado(minutos)).toBe(esperado);
  });
});

describe('validarHorario', () => {
  const funcionamento = { horarioAbertura: '08:00:00', horarioFechamento: '19:00:00' };
  const manha = { diaSemana: 1, horaInicio: '08:00:00', horaFim: '12:00:00' };
  const horario = (horaInicio: string, horaFim: string, diaSemana = 1) => ({
    diaSemana,
    horaInicio,
    horaFim,
  });

  it.each([
    ['10:00', '10:00'],
    ['10:00', '09:30'],
  ])('recusa fim (%s → %s) igual ou anterior ao início', (inicio, fim) => {
    expect(validarHorario(horario(inicio, fim), [], funcionamento)).toBe(
      'O horário final precisa ser posterior ao horário inicial.',
    );
  });

  it.each([
    ['07:30', '10:00'],
    ['18:00', '19:30'],
  ])('recusa %s às %s fora do funcionamento', (inicio, fim) => {
    expect(validarHorario(horario(inicio, fim), [], funcionamento)).toBe(
      'O horário precisa estar dentro do funcionamento do estabelecimento (08:00 às 19:00).',
    );
  });

  it('aceita os limites exatos do funcionamento', () => {
    expect(validarHorario(horario('08:00', '19:00'), [], funcionamento)).toBeNull();
  });

  it('recusa sobreposição no mesmo dia e cita o horário em conflito', () => {
    expect(validarHorario(horario('11:00', '14:00'), [manha], funcionamento)).toBe(
      'Este horário se sobrepõe a outro já cadastrado na segunda-feira (08:00 às 12:00).',
    );
  });

  it.each([
    [0, 'no domingo'],
    [6, 'no sábado'],
  ])('usa o artigo certo para o dia %i', (diaSemana, texto) => {
    const existente = horario('08:00', '12:00', diaSemana);
    expect(
      validarHorario(horario('10:00', '11:00', diaSemana), [existente], funcionamento),
    ).toContain(`já cadastrado ${texto} (08:00 às 12:00)`);
  });

  it('aceita horário que só encosta em outro', () => {
    expect(validarHorario(horario('12:00', '18:00'), [manha], funcionamento)).toBeNull();
  });

  it('aceita o mesmo horário em outro dia', () => {
    expect(validarHorario(horario('08:00', '12:00', 2), [manha], funcionamento)).toBeNull();
  });

  it('confere primeiro o fim, depois o funcionamento e por último a sobreposição', () => {
    expect(validarHorario(horario('07:00', '06:00'), [manha], funcionamento)).toContain(
      'posterior',
    );
    expect(validarHorario(horario('07:00', '09:00'), [manha], funcionamento)).toContain(
      'funcionamento',
    );
  });
});
