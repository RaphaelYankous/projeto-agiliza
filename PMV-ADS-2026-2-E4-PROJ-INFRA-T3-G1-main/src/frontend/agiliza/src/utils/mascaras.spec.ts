import { describe, expect, it } from 'vitest'
import {
  mascararCnpj,
  mascararCpf,
  mascararInteiro,
  mascararMoeda,
  mascararTelefone,
  somenteDigitos,
} from './mascaras'

describe('somenteDigitos', () => {
  it('remove tudo que não é número', () => {
    expect(somenteDigitos('(31) 9.8888-1001')).toBe('31988881001')
  })
})

describe('mascararCpf', () => {
  it('formata o CPF enquanto o usuário digita', () => {
    expect(mascararCpf('123')).toBe('123')
    expect(mascararCpf('1234')).toBe('123.4')
    expect(mascararCpf('1234567')).toBe('123.456.7')
    expect(mascararCpf('12345678901')).toBe('123.456.789-01')
  })

  it('ignora dígitos além do 11º', () => {
    expect(mascararCpf('123456789012345')).toBe('123.456.789-01')
  })
})

describe('mascararTelefone', () => {
  it('formata fixo com 10 dígitos e celular com 11', () => {
    expect(mascararTelefone('3133334444')).toBe('(31) 3333-4444')
    expect(mascararTelefone('31988881001')).toBe('(31) 98888-1001')
  })

  it('formata números incompletos', () => {
    expect(mascararTelefone('')).toBe('')
    expect(mascararTelefone('3')).toBe('(3')
    expect(mascararTelefone('319')).toBe('(31) 9')
  })
})

describe('mascararMoeda', () => {
  it('trata os dígitos como centavos', () => {
    expect(mascararMoeda('5')).toBe('0,05')
    expect(mascararMoeda('4500')).toBe('45,00')
    expect(mascararMoeda('123456')).toBe('1.234,56')
  })

  it('devolve vazio sem dígitos', () => {
    expect(mascararMoeda('abc')).toBe('')
  })
})

describe('mascararInteiro', () => {
  it('mantém só dígitos até o tamanho máximo', () => {
    expect(mascararInteiro('12a34567')).toBe('123456')
    expect(mascararInteiro('12345', 3)).toBe('123')
  })
})

describe('mascararCnpj', () => {
  it('formata o CNPJ completo', () => {
    expect(mascararCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })
})
