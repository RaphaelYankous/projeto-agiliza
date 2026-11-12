import { describe, expect, it } from 'vitest'
import { validarHorario } from './horarios'

const funcionamento = { horarioAbertura: '08:00:00', horarioFechamento: '19:00:00' }
const manha = { diaSemana: 1, horaInicio: '08:00:00', horaFim: '12:00:00' }
const horario = (horaInicio: string, horaFim: string, diaSemana = 1) => ({ diaSemana, horaInicio, horaFim })

describe('validarHorario', () => {
  it.each([
    ['10:00', '10:00'],
    ['10:00', '09:30'],
  ])('recusa fim (%s → %s) igual ou anterior ao início', (inicio, fim) => {
    expect(validarHorario(horario(inicio, fim), [], funcionamento)).toBe(
      'O horário final precisa ser posterior ao horário inicial.',
    )
  })

  it.each([
    ['07:30', '10:00'],
    ['18:00', '19:30'],
  ])('recusa %s às %s fora do funcionamento', (inicio, fim) => {
    expect(validarHorario(horario(inicio, fim), [], funcionamento)).toBe(
      'O horário precisa estar dentro do funcionamento do estabelecimento (08:00 às 19:00).',
    )
  })

  it('aceita os limites exatos do funcionamento', () => {
    expect(validarHorario(horario('08:00', '19:00'), [], funcionamento)).toBeUndefined()
  })

  it('não confere o funcionamento quando ele não é informado', () => {
    expect(validarHorario(horario('06:00', '22:00'), [])).toBeUndefined()
  })

  it('recusa sobreposição no mesmo dia e cita o horário em conflito', () => {
    expect(validarHorario(horario('11:00', '14:00'), [manha], funcionamento)).toBe(
      'Este horário se sobrepõe a outro já cadastrado na segunda-feira (08:00 às 12:00).',
    )
  })

  it.each([
    [0, 'no domingo'],
    [6, 'no sábado'],
  ])('usa o artigo certo para o dia %i', (diaSemana, texto) => {
    const existente = horario('08:00', '12:00', diaSemana)
    expect(validarHorario(horario('10:00', '11:00', diaSemana), [existente], funcionamento)).toContain(
      `já cadastrado ${texto} (08:00 às 12:00)`,
    )
  })

  it('aceita horário que só encosta em outro e o mesmo horário em outro dia', () => {
    expect(validarHorario(horario('12:00', '18:00'), [manha], funcionamento)).toBeUndefined()
    expect(validarHorario(horario('08:00', '12:00', 2), [manha], funcionamento)).toBeUndefined()
  })

  it('confere primeiro o fim, depois o funcionamento e por último a sobreposição', () => {
    expect(validarHorario(horario('07:00', '06:00'), [manha], funcionamento)).toContain('posterior')
    expect(validarHorario(horario('07:00', '09:00'), [manha], funcionamento)).toContain('funcionamento')
  })
})
