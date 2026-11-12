import { describe, expect, it } from 'vitest'
import { formatarDataHora, formatarDistancia, formatarNota, formatarPreco } from './formatacao'

const semEspacoRigido = (texto: string) => texto.replace(/\u00a0/g, ' ')

describe('formatarPreco', () => {
  it('converte centavos em reais', () => {
    expect(semEspacoRigido(formatarPreco(4500))).toBe('R$ 45,00')
    expect(semEspacoRigido(formatarPreco(123456))).toBe('R$ 1.234,56')
  })

  it('mostra zero como R$ 0,00', () => {
    expect(semEspacoRigido(formatarPreco(0))).toBe('R$ 0,00')
  })
})

describe('formatarDistancia', () => {
  it('usa metros abaixo de 1 km, com no mínimo 1 m', () => {
    expect(formatarDistancia(0.35)).toBe('350 m')
    expect(formatarDistancia(0)).toBe('1 m')
  })

  it('usa quilômetros com uma casa decimal a partir de 1 km', () => {
    expect(formatarDistancia(1)).toBe('1 km')
    expect(formatarDistancia(2.46)).toBe('2,5 km')
  })
})

describe('formatarNota', () => {
  it('sempre mostra uma casa decimal', () => {
    expect(formatarNota(4)).toBe('4,0')
    expect(formatarNota(4.56)).toBe('4,6')
  })
})

describe('formatarDataHora', () => {
  const agora = new Date(2026, 10, 7, 9, 0)

  it('mostra "Hoje" para o dia atual', () => {
    expect(formatarDataHora(new Date(2026, 10, 7, 10, 30).toISOString(), agora)).toBe('Hoje, 10:30')
  })

  it('mostra dia e mês para outro dia do mesmo ano', () => {
    expect(formatarDataHora(new Date(2026, 8, 5, 15, 0).toISOString(), agora)).toBe('05/09, 15:00')
  })

  it('inclui o ano quando a data é de outro ano', () => {
    expect(formatarDataHora(new Date(2027, 0, 2, 8, 5).toISOString(), agora)).toBe('02/01/2027, 08:05')
  })
})
