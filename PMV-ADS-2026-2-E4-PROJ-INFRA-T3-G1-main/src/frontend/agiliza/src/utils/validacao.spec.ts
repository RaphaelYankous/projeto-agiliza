import { describe, expect, it } from 'vitest'
import {
  MENSAGEM_TAMANHO_FOTO,
  MENSAGEM_TIPO_FOTO,
  cpfValido,
  validarArquivoFoto,
  validarConfirmacaoSenha,
  validarCpf,
  validarEmail,
  validarObrigatorio,
  validarSenha,
  validarTelefone,
} from './validacao'

describe('validarObrigatorio', () => {
  it('recusa texto vazio ou só com espaços', () => {
    expect(validarObrigatorio('   ')).toBe('Campo obrigatório.')
    expect(validarObrigatorio('Ana')).toBeUndefined()
  })
})

describe('validarEmail', () => {
  it('exige um e-mail no formato nome@dominio.tld', () => {
    expect(validarEmail('')).toBe('Campo obrigatório.')
    expect(validarEmail('ana@email')).toBe('Informe um e-mail válido.')
    expect(validarEmail(' ana@email.com ')).toBeUndefined()
  })
})

describe('cpfValido e validarCpf', () => {
  it('aceita CPF com dígitos verificadores corretos, com ou sem máscara', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('52998224725')).toBe(true)
  })

  it('recusa dígito verificador errado, tamanho errado e dígitos repetidos', () => {
    expect(cpfValido('529.982.247-24')).toBe(false)
    expect(cpfValido('5299822472')).toBe(false)
    expect(cpfValido('111.111.111-11')).toBe(false)
  })

  it('mostra a mensagem certa para vazio e inválido', () => {
    expect(validarCpf('')).toBe('Campo obrigatório.')
    expect(validarCpf('123.456.789-00')).toBe('Informe um CPF válido.')
    expect(validarCpf('529.982.247-25')).toBeUndefined()
  })
})

describe('validarTelefone', () => {
  it('aceita 10 ou 11 dígitos com DDD', () => {
    expect(validarTelefone('(31) 3333-4444')).toBeUndefined()
    expect(validarTelefone('(31) 98888-1001')).toBeUndefined()
  })

  it('recusa vazio e número incompleto', () => {
    expect(validarTelefone('')).toBe('Campo obrigatório.')
    expect(validarTelefone('(31) 9888')).toBe('Informe um telefone completo com DDD.')
  })
})

describe('validarSenha e validarConfirmacaoSenha', () => {
  it('exige ao menos 6 caracteres', () => {
    expect(validarSenha('')).toBe('Campo obrigatório.')
    expect(validarSenha('12345')).toBe('A senha deve ter pelo menos 6 caracteres.')
    expect(validarSenha('123456')).toBeUndefined()
  })

  it('exige que a confirmação seja igual à senha', () => {
    expect(validarConfirmacaoSenha('123456', '')).toBe('Campo obrigatório.')
    expect(validarConfirmacaoSenha('123456', '654321')).toBe('As senhas não coincidem.')
    expect(validarConfirmacaoSenha('123456', '123456')).toBeUndefined()
  })
})

describe('validarArquivoFoto', () => {
  const arquivo = (tipo: string, tamanho: number) =>
    new File([new Uint8Array(tamanho)], 'foto', { type: tipo })

  it('aceita JPG, PNG e WebP de até 2 MB', () => {
    expect(validarArquivoFoto(arquivo('image/jpeg', 10))).toBeUndefined()
    expect(validarArquivoFoto(arquivo('image/png', 2 * 1024 * 1024))).toBeUndefined()
    expect(validarArquivoFoto(arquivo('image/webp', 10))).toBeUndefined()
  })

  it('recusa outros tipos e arquivos acima de 2 MB', () => {
    expect(validarArquivoFoto(arquivo('image/gif', 10))).toBe(MENSAGEM_TIPO_FOTO)
    expect(validarArquivoFoto(arquivo('image/png', 2 * 1024 * 1024 + 1))).toBe(MENSAGEM_TAMANHO_FOTO)
  })
})
