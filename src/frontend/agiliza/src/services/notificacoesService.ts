import { api } from './api'

export type Notificacao = {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  criadaEm: string
}

export async function listarNotificacoes(): Promise<Notificacao[]> {
  const { data } = await api.get<Notificacao[]>('/notificacoes')
  return data
}

export async function marcarNotificacaoComoLida(id: string): Promise<void> {
  await api.patch(`/notificacoes/${encodeURIComponent(id)}/lida`)
}
