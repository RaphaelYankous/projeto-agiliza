import { isAxiosError } from 'axios'
import { api } from './api'
import { MENSAGEM_TAMANHO_FOTO, validarArquivoFoto } from '../utils/validacao'

export const LIMITE_GALERIA = 10

export type FotoGaleria = {
  id: string
  criadaEm: string
}

export class GaleriaError extends Error {}

export function urlFotoGaleria(estabelecimentoId: string, fotoId: string): string {
  return `${api.defaults.baseURL}/estabelecimentos/${estabelecimentoId}/fotos/${fotoId}`
}

export function mensagemLimiteGaleria(existentes: number): string {
  const restantes = LIMITE_GALERIA - existentes
  return restantes > 0
    ? `A galeria aceita no máximo ${LIMITE_GALERIA} fotos. Você pode adicionar mais ${restantes}.`
    : `A galeria já tem ${LIMITE_GALERIA} fotos. Remova uma para adicionar outra.`
}

export function validarEnvioGaleria(arquivos: File[], existentes: number): string | undefined {
  if (existentes + arquivos.length > LIMITE_GALERIA) return mensagemLimiteGaleria(existentes)
  for (const arquivo of arquivos) {
    const erro = validarArquivoFoto(arquivo)
    if (erro) return arquivos.length > 1 ? `${arquivo.name}: ${erro}` : erro
  }
  return undefined
}

export async function listarFotosGaleria(estabelecimentoId: string): Promise<FotoGaleria[]> {
  const { data } = await api.get<FotoGaleria[]>(`/estabelecimentos/${estabelecimentoId}/fotos`)
  return data
}

export async function enviarFotosGaleria(estabelecimentoId: string, arquivos: File[]): Promise<FotoGaleria[]> {
  const formulario = new FormData()
  for (const arquivo of arquivos) formulario.append('fotos', arquivo)
  try {
    const { data } = await api.post<FotoGaleria[]>(`/estabelecimentos/${estabelecimentoId}/fotos`, formulario, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  } catch (erro) {
    throw new GaleriaError(mensagemDeErro(erro, 'enviar as fotos'))
  }
}

export async function removerFotoGaleria(estabelecimentoId: string, fotoId: string): Promise<void> {
  try {
    await api.delete(`/estabelecimentos/${estabelecimentoId}/fotos/${fotoId}`)
  } catch (erro) {
    throw new GaleriaError(mensagemDeErro(erro, 'remover a foto'))
  }
}

function mensagemDeErro(erro: unknown, acao: string): string {
  if (!isAxiosError(erro) || !erro.response) {
    return `Não foi possível ${acao}. Verifique sua conexão e tente novamente.`
  }
  const { status, data } = erro.response
  if (status === 413) return MENSAGEM_TAMANHO_FOTO
  if (status === 400 && typeof data?.message === 'string') return data.message
  if (status === 403) return 'Você só pode alterar as fotos do seu estabelecimento.'
  if (status === 404) return 'A foto não foi encontrada. Atualize a página.'
  return `Não foi possível ${acao} agora. Tente novamente em instantes.`
}
