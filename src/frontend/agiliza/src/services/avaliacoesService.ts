import { isAxiosError } from 'axios'
import { api } from './api'

export const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024
export const COMENTARIO_MAXIMO = 500
export const TIPOS_FOTO_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']

export type AvaliacaoDoCliente = {
  agendamentoId: string
  nota: number
  comentario: string
  temFoto: boolean
}

export type DadosAvaliacao = {
  nota: number
  comentario: string
  foto?: File
}

type AcaoAvaliacao = 'carregar' | 'enviar'

export class AvaliacaoError extends Error {
  // 409 = atendimento já avaliado ou ainda não concluído
  readonly conflito: boolean

  constructor(mensagem: string, conflito = false) {
    super(mensagem)
    this.conflito = conflito
  }
}

export function validarFoto(arquivo: File): string | undefined {
  if (!TIPOS_FOTO_ACEITOS.includes(arquivo.type)) return 'A foto deve ser um arquivo JPG, PNG ou WebP.'
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) return 'A foto deve ter no máximo 2 MB.'
  return undefined
}

export async function listarMinhasAvaliacoes(): Promise<AvaliacaoDoCliente[]> {
  try {
    const { data } = await api.get<AvaliacaoDoCliente[]>('/avaliacoes/cliente/minhas')
    return data
  } catch (erro) {
    throw erroDeAvaliacao(erro, 'carregar')
  }
}

// A foto é privada (exige o token), então é baixada como arquivo e não por <img src>.
export async function buscarFotoAvaliacao(agendamentoId: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`/avaliacoes/agendamento/${encodeURIComponent(agendamentoId)}/foto`, {
    responseType: 'blob',
  })
  return data
}

export async function enviarAvaliacao(agendamentoId: string, dados: DadosAvaliacao): Promise<void> {
  try {
    const formulario = new FormData()
    formulario.append('nota', String(dados.nota))
    const comentario = dados.comentario.trim()
    if (comentario) formulario.append('comentario', comentario)
    if (dados.foto) formulario.append('foto', dados.foto)

    await api.post(`/avaliacoes/agendamento/${encodeURIComponent(agendamentoId)}`, formulario, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  } catch (erro) {
    throw erroDeAvaliacao(erro, 'enviar')
  }
}

function erroDeAvaliacao(erro: unknown, acao: AcaoAvaliacao): AvaliacaoError {
  if (!isAxiosError(erro) || !erro.response) {
    return new AvaliacaoError(
      `Não foi possível ${acao} a avaliação. Verifique sua conexão e tente novamente.`,
    )
  }

  const { status, data } = erro.response
  const mensagem = typeof data?.message === 'string' ? data.message : ''

  if (status === 409) return new AvaliacaoError(mensagem || 'Este atendimento já foi avaliado.', true)
  if (status === 413) return new AvaliacaoError('A foto deve ter no máximo 2 MB.')
  if (status === 400) {
    return new AvaliacaoError(mensagem || 'Confira a nota, o comentário e a foto e tente novamente.')
  }
  if (status === 404) return new AvaliacaoError('Atendimento não encontrado.')
  if (status === 403) return new AvaliacaoError('Você não tem permissão para avaliar este atendimento.')
  return new AvaliacaoError(`Não foi possível ${acao} a avaliação agora. Tente novamente em instantes.`)
}
