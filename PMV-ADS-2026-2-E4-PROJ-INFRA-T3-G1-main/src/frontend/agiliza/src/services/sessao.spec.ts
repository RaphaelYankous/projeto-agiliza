import { describe, expect, it } from 'vitest'
import { criarToken } from '../test/token'
import { decodificarToken, lerToken, removerToken, salvarToken, tokenExpirado } from './sessao'

describe('decodificarToken', () => {
  it('lê e-mail, perfil e expiração do token', () => {
    const dados = decodificarToken(criarToken({ email: 'joão@email.com', perfil: 'gestor' }))
    expect(dados).toMatchObject({ email: 'joão@email.com', perfil: 'gestor' })
    expect(dados!.expiraEm).toBeGreaterThan(Date.now())
  })

  it('devolve null para token malformado ou com perfil desconhecido', () => {
    expect(decodificarToken('abc')).toBeNull()
    expect(decodificarToken('a.b.c')).toBeNull()
    expect(decodificarToken(criarToken({ perfil: 'admin' }))).toBeNull()
  })
})

describe('tokenExpirado', () => {
  it('é falso para token válido e verdadeiro para token vencido ou inválido', () => {
    expect(tokenExpirado(criarToken())).toBe(false)
    expect(tokenExpirado(criarToken({ expiraEmSegundos: -10 }))).toBe(true)
    expect(tokenExpirado('invalido')).toBe(true)
  })
})

describe('salvarToken, lerToken e removerToken', () => {
  it('guarda e apaga o token no navegador', () => {
    expect(lerToken()).toBeNull()
    salvarToken('meu-token')
    expect(lerToken()).toBe('meu-token')
    removerToken()
    expect(lerToken()).toBeNull()
  })
})
