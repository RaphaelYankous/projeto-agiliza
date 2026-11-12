import { isAxiosError } from 'axios'
import { MENSAGEM_TAMANHO_FOTO } from '../utils/validacao'
import { api } from './api'

export type OrdenacaoBusca = 'distancia' | 'preco' | 'avaliacao' | 'nome'

export type EstabelecimentoBusca = {
  id: string
  nome: string
  endereco: string
  descricao?: string
  telefone: string
  latitude: number
  longitude: number
  horarioAbertura: string
  horarioFechamento: string
  fidelidade: boolean
  redeSocial?: string[]
  distanciaKm: number | null
  avaliacaoMedia: number | null
  totalAvaliacoes: number
  precoMinimo: number | null
  fotoAtualizadaEm?: string | null
}

export type FiltrosBusca = {
  nome?: string
  ordenarPor?: OrdenacaoBusca
  lat?: number
  lng?: number
  raio?: number
}

export type EstabelecimentoDetalhe = {
  id: string
  nome: string
  razaoSocial: string
  email: string
  endereco: string
  latitude: number
  longitude: number
  telefone: string
  descricao?: string
  fotos?: string[]
  fidelidade: boolean
  redeSocial?: string[]
  horarioAbertura: string
  horarioFechamento: string
  fotoAtualizadaEm?: string | null
}

export type Estabelecimento = {
  id: string
  nome: string
  endereco: string
  latitude: number
  longitude: number
  fotoAtualizadaEm?: string | null
}

type DadosCriacaoEstabelecimento = {
  nome: string
  razaoSocial: string
  cnpj: string
  email: string
  endereco: string
  latitude: number
  longitude: number
  telefone: string
  horarioAbertura: string
  horarioFechamento: string
  diasFuncionamento?: string[]
}

type ServicoResumo = {
  nome: string
}

export type ServicoPublico = {
  id: string
  nome: string
  duracao: number
  preco: number
}

export class BuscaError extends Error {}

export async function buscarEstabelecimentos(
  filtros: FiltrosBusca,
): Promise<EstabelecimentoBusca[]> {
  try {
    const resposta = await api.get<EstabelecimentoBusca[]>('/estabelecimentos/busca', {
      params: {
        nome: filtros.nome?.trim() || undefined,
        ordenarPor: filtros.ordenarPor,
        lat: filtros.lat,
        lng: filtros.lng,
        raio: filtros.raio,
      },
    })
    return resposta.data
  } catch (erro) {
    throw new BuscaError(mensagemDeErro(erro))
  }
}

export async function buscarEstabelecimentoPorId(id: string): Promise<EstabelecimentoDetalhe> {
  try {
    const resposta = await api.get<EstabelecimentoDetalhe>(`/estabelecimentos/${id}`)
    return resposta.data
  } catch (erro) {
    throw new BuscaError(mensagemDeErro(erro))
  }
}

export async function listarEstabelecimentos(): Promise<Estabelecimento[]> {
  const { data } = await api.get<Estabelecimento[]>('/estabelecimentos')

  return data
    .map((e) => ({
      id: e.id,
      nome: e.nome,
      endereco: e.endereco,
      latitude: Number(e.latitude),
      longitude: Number(e.longitude),
      fotoAtualizadaEm: e.fotoAtualizadaEm ?? null,
    }))
    .filter((e) => Number.isFinite(e.latitude) && Number.isFinite(e.longitude))
}

export async function cadastrarEstabelecimento(dados: DadosCriacaoEstabelecimento) {
  try {
    const { data } = await api.post<Estabelecimento>('/estabelecimentos', dados)
    return data
  } catch (erro) {
    throw new Error(mensagemDeErroAoSalvar(erro), { cause: erro })
  }
}

export async function atualizarEstabelecimento(id: string, dados: Partial<DadosCriacaoEstabelecimento>) {
  const { data } = await api.patch<Estabelecimento>(`/estabelecimentos/${id}`, dados)
  return data
}

export class FotoEstabelecimentoError extends Error {}

export function urlFotoEstabelecimento(id: string, fotoAtualizadaEm?: string | null): string | null {
  if (!fotoAtualizadaEm) return null
  return `${api.defaults.baseURL}/estabelecimentos/${id}/foto?v=${new Date(fotoAtualizadaEm).getTime()}`
}

export async function enviarFotoEstabelecimento(id: string, arquivo: File): Promise<string> {
  const formulario = new FormData()
  formulario.append('foto', arquivo)
  try {
    const { data } = await api.patch<{ fotoAtualizadaEm: string }>(
      `/estabelecimentos/${id}/foto`,
      formulario,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data.fotoAtualizadaEm
  } catch (erro) {
    throw new FotoEstabelecimentoError(mensagemDeErroDaFoto(erro))
  }
}

export const AVISO_FOTO_NAO_SALVA =
  'Estabelecimento cadastrado, mas a foto não foi salva. Envie a foto pela edição do estabelecimento.'

export async function enviarFotoDoNovoEstabelecimento(id: string, arquivo?: File): Promise<boolean> {
  if (!arquivo) return true
  return enviarFotoEstabelecimento(id, arquivo).then(
    () => true,
    () => false,
  )
}

function mensagemDeErroDaFoto(erro: unknown): string {
  if (!isAxiosError(erro) || !erro.response) {
    return 'Não foi possível enviar a foto. Verifique sua conexão e tente novamente.'
  }
  const { status, data } = erro.response
  if (status === 413) return MENSAGEM_TAMANHO_FOTO
  if (status === 400 && typeof data?.message === 'string') return data.message
  if (status === 403) return 'Você só pode alterar a foto do seu estabelecimento.'
  return 'Não foi possível enviar a foto agora. Tente novamente em instantes.'
}

export async function listarNomesDosServicos(estabelecimentoId: string): Promise<string[]> {
  const { data } = await api.get<ServicoResumo[]>(`/estabelecimentos/${estabelecimentoId}/servicos/publicos`)

  return data.map((s) => s.nome)
}

export async function listarServicosPublicos(estabelecimentoId: string): Promise<ServicoPublico[]> {
  const { data } = await api.get<ServicoPublico[]>(`/estabelecimentos/${estabelecimentoId}/servicos/publicos`)
  return data
}

function mensagemDeErro(erro: unknown): string {
  if (!isAxiosError(erro) || !erro.response) {
    return 'Não foi possível buscar os estabelecimentos. Verifique sua conexão e tente novamente.'
  }
  if (erro.response.status === 400) {
    return 'Os filtros informados não são válidos. Ajuste a busca e tente novamente.'
  }
  return 'Não foi possível concluir a busca agora. Tente novamente em instantes.'
}

function mensagemDeErroAoSalvar(erro: unknown): string {
  if (!isAxiosError(erro) || !erro.response) {
    return 'Não foi possível salvar o estabelecimento. Verifique sua conexão e tente novamente.'
  }

  const mensagem = typeof erro.response.data?.message === 'string'
    ? erro.response.data.message
    : Array.isArray(erro.response.data?.message)
      ? erro.response.data.message.join(' ')
      : ''

  if (erro.response.status === 403) return 'Apenas usuários com perfil gestor podem criar estabelecimentos.'
  if (erro.response.status === 409) return mensagem || 'O CNPJ ou e-mail informado já está cadastrado.'
  if (erro.response.status === 400) return mensagem || 'Revise os dados informados e tente novamente.'
  return mensagem || 'Não foi possível salvar o estabelecimento. Tente novamente.'
}
