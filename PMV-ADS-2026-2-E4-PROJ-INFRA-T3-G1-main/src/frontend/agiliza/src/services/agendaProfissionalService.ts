import { isAxiosError } from 'axios'
import { api } from './api'

export type Disponibilidade = { horaInicio: string; horaFim: string }
export type DisponibilidadeSemanal = Disponibilidade & { id: string; diaSemana: number; ativo: boolean }
export type Bloqueio = { id: string; data: string; horaInicio: string | null; horaFim: string | null; motivo: string | null }
export type Agendamento = {
  id: string
  horaInicio: string
  horaFim: string
  cliente: string
  servico: string
  status: number
}
export type AgendaDoDia = {
  data: string
  disponibilidades: Disponibilidade[]
  bloqueios: Bloqueio[]
  agendamentos: Agendamento[]
}

export async function consultarMinhaAgenda(data: string): Promise<AgendaDoDia> {
  const resposta = await api.get<AgendaDoDia>('/minha-agenda', { params: { data } })
  return resposta.data
}

export async function consultarAgendaDoProfissional(profissionalId: string, data: string): Promise<AgendaDoDia> {
  const resposta = await api.get<AgendaDoDia>(`/agenda-gestor/${profissionalId}`, { params: { data } })
  return resposta.data
}

export async function listarBloqueios(): Promise<Bloqueio[]> {
  const resposta = await api.get<Bloqueio[]>('/minha-agenda/bloqueios')
  return resposta.data
}

export async function criarBloqueio(data: string, horaInicio?: string, horaFim?: string, motivo?: string): Promise<Bloqueio> {
  const resposta = await api.post<Bloqueio>('/minha-agenda/bloqueios', { data, horaInicio, horaFim, motivo })
  return resposta.data
}

export async function removerBloqueio(id: string) {
  await api.delete(`/minha-agenda/bloqueios/${encodeURIComponent(id)}`)
}

export async function listarDisponibilidades(profissionalId: string): Promise<DisponibilidadeSemanal[]> {
  const { data } = await api.get<DisponibilidadeSemanal[]>(
    `/profissionais/${profissionalId}/disponibilidades`,
  )
  return data
}

export async function criarDisponibilidade(
  profissionalId: string,
  dados: Pick<DisponibilidadeSemanal, 'diaSemana' | 'horaInicio' | 'horaFim'>,
): Promise<DisponibilidadeSemanal> {
  const { data } = await api.post<DisponibilidadeSemanal>(
    `/profissionais/${profissionalId}/disponibilidades`,
    dados,
  )
  return data
}

export async function removerDisponibilidade(id: string): Promise<void> {
  await api.delete(`/disponibilidades/${encodeURIComponent(id)}`)
}

export async function listarMinhasDisponibilidades(): Promise<DisponibilidadeSemanal[]> {
  const { data } = await api.get<DisponibilidadeSemanal[]>('/minha-agenda/disponibilidades')
  return data
}

export async function criarMinhaDisponibilidade(
  dados: Pick<DisponibilidadeSemanal, 'diaSemana' | 'horaInicio' | 'horaFim'>,
): Promise<DisponibilidadeSemanal> {
  const { data } = await api.post<DisponibilidadeSemanal>('/minha-agenda/disponibilidades', dados)
  return data
}

export async function removerMinhaDisponibilidade(id: string): Promise<void> {
  await api.delete(`/minha-agenda/disponibilidades/${encodeURIComponent(id)}`)
}

export function mensagemDeErroDaAgenda(erro: unknown, padrao: string): string {
  if (isAxiosError(erro) && erro.response?.status === 400 && typeof erro.response.data?.message === 'string') {
    return erro.response.data.message
  }
  return padrao
}
