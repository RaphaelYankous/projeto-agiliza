import { isAxiosError } from 'axios'
import { api } from './api'

export class LoginError extends Error {}
export class RecuperarSenhaError extends Error {}
export class RedefinirSenhaError extends Error {}

export async function entrar(email: string, senha: string): Promise<string> {
  try {
    const resposta = await api.post<{ access_token: string }>('/auth/login', {
      email: email.trim(),
      senha,
    })
    return resposta.data.access_token
  } catch (erro) {
    throw new LoginError(mensagemDeErroLogin(erro))
  }
}

export async function solicitarRecuperacaoSenha(email: string): Promise<void> {
  try {
    await api.post('/auth/recuperar-senha', {
      email: email.trim(),
    })
  } catch (erro) {
    throw new RecuperarSenhaError(mensagemDeErroRecuperar(erro))
  }
}

export async function redefinirSenha(token: string, novaSenha: string): Promise<void> {
  try {
    await api.post('/auth/redefinir-senha', {
      token: token.trim(),
      novaSenha,
    })
  } catch (erro) {
    throw new RedefinirSenhaError(mensagemDeErroRedefinir(erro))
  }
}

function mensagemDeErroLogin(erro: unknown): string {
  if (!isAxiosError(erro) || !erro.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }
  if (erro.response.status === 401) return 'E-mail ou senha inválidos.'
  return 'Não foi possível entrar agora. Tente novamente em instantes.'
}

function mensagemDeErroRecuperar(erro: unknown): string {
  if (!isAxiosError(erro) || !erro.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }
  return 'Não foi possível processar a solicitação no momento. Tente novamente em instantes.'
}

function mensagemDeErroRedefinir(erro: unknown): string {
  if (!isAxiosError(erro) || !erro.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }
  if (erro.response.status === 400) {
    const data = erro.response.data as { message?: string | string[] }
    if (Array.isArray(data?.message)) return data.message[0]
    return data?.message || 'Link inválido ou expirado. Solicite uma nova recuperação.'
  }
  return 'Não foi possível redefinir sua senha agora. Tente novamente.'
}