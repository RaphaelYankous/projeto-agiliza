import { isAxiosError } from 'axios'
import { api } from './api'
import { somenteDigitos } from '../utils/mascaras'
import { MENSAGEM_TAMANHO_FOTO, MENSAGEM_TIPO_FOTO } from '../utils/validacao'

export type PerfilCadastro = 'cliente' | 'gestor'

export type DadosCadastro = {
  nome: string
  sobrenome: string
  email: string
  cpf: string
  telefone: string
  senha: string
  foto?: File
}

const ENDPOINT_POR_PERFIL: Record<PerfilCadastro, string> = {
  cliente: '/clientes',
  gestor: '/gestores',
}

export class CadastroError extends Error {
  readonly campo?: 'foto'

  constructor(message: string, campo?: 'foto') {
    super(message)
    this.campo = campo
  }
}

const MENSAGENS_FOTO = [MENSAGEM_TIPO_FOTO, MENSAGEM_TAMANHO_FOTO]

export async function cadastrarUsuario(perfil: PerfilCadastro, dados: DadosCadastro): Promise<void> {
  const formulario = new FormData()
  formulario.append('nome', dados.nome.trim())
  formulario.append('sobrenome', dados.sobrenome.trim())
  formulario.append('email', dados.email.trim())
  formulario.append('cpf', somenteDigitos(dados.cpf))
  formulario.append('telefone', somenteDigitos(dados.telefone))
  formulario.append('senha', dados.senha)
  if (dados.foto) formulario.append('foto', dados.foto)

  try {
    await api.post(ENDPOINT_POR_PERFIL[perfil], formulario, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  } catch (erro) {
    const mensagemFoto = isAxiosError(erro) ? erro.response?.data?.message : undefined
    if (MENSAGENS_FOTO.includes(mensagemFoto)) {
      throw new CadastroError(mensagemFoto, 'foto')
    }
    throw new CadastroError(mensagemDeErro(erro))
  }
}

function mensagemDeErro(erro: unknown): string {
  if (!isAxiosError(erro) || !erro.response) {
    return 'Não foi possível concluir o cadastro. Verifique sua conexão e tente novamente.'
  }

  const { status, data } = erro.response
  const mensagens: string[] = Array.isArray(data?.message)
    ? data.message
    : typeof data?.message === 'string'
      ? [data.message]
      : []

  if (status === 409 && mensagens.length > 0) return mensagens.join(' ')
  const duplicado = mensagens.find((mensagem) => mensagem.includes('já está em uso'))
  if (duplicado) {
    return duplicado.startsWith('email') ? 'Este e-mail já está cadastrado.' : 'Este CPF já está cadastrado.'
  }

  if (status === 400 && mensagens.length > 0) return mensagens.join(' ')
  if (status === 400) return 'Alguns dados foram recusados pelo servidor. Revise os campos e tente novamente.'
  return 'Não foi possível concluir o cadastro agora. Tente novamente em instantes.'
}
