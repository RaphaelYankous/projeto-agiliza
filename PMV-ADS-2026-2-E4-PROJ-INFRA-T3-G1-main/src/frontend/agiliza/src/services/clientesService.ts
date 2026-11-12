import { isAxiosError } from 'axios'
import { api } from './api'
import { somenteDigitos } from '../utils/mascaras'

export type ClienteDetalhe = {
  id: string
  usuarioId: string
  usuario: {
    id: string
    nome: string
    sobrenome: string
    email: string
    cpf: string
    telefone: string
  }
}

export type DadosEdicaoCliente = {
  nome: string
  sobrenome: string
  email: string
  telefone: string
  cpf: string
  foto?: File
}

export class ClienteError extends Error {
  readonly campo?: 'email' | 'cpf'

  constructor(message: string, campo?: 'email' | 'cpf') {
    super(message)
    this.campo = campo
  }
}

export async function buscarCliente(id: string): Promise<ClienteDetalhe> {
  try {
    const { data } = await api.get<ClienteDetalhe>(`/clientes/${encodeURIComponent(id)}`)
    return data
  } catch (erro) {
    throw tratarErroCliente(erro, 'carregar')
  }
}

export async function atualizarCliente(id: string, dados: DadosEdicaoCliente): Promise<void> {
  try {
    const formulario = new FormData()
    formulario.append('nome', dados.nome.trim())
    formulario.append('sobrenome', dados.sobrenome.trim())
    formulario.append('email', dados.email.trim())
    formulario.append('telefone', somenteDigitos(dados.telefone))

    if (dados.foto) {
      formulario.append('foto', dados.foto)
    }

    await api.patch(`/clientes/${encodeURIComponent(id)}`, formulario, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  } catch (erro) {
    throw tratarErroCliente(erro, 'salvar')
  }
}

function tratarErroCliente(erro: unknown, acao: 'carregar' | 'salvar'): ClienteError {
  if (!isAxiosError(erro) || !erro.response) {
    return new ClienteError(
      `Não foi possível ${acao} seus dados. Verifique sua conexão e tente novamente.`,
    )
  }

  const { status, data } = erro.response
  const mensagem = typeof data?.message === 'string' ? data.message : ''

  if (status === 409 && mensagem.includes('Email')) {
    return new ClienteError('Este e-mail já está em uso por outro usuário.', 'email')
  }
  if (status === 409 && mensagem.includes('CPF')) {
    return new ClienteError('Este CPF já está em uso por outro usuário.', 'cpf')
  }
  if (status === 403) {
    return new ClienteError('Você só pode acessar e alterar os seus próprios dados.')
  }
  if (status === 404) {
    return new ClienteError('Cadastro de cliente não encontrado.')
  }
  return new ClienteError(
    mensagem || `Não foi possível ${acao} os dados agora. Tente novamente em instantes.`,
  )
}