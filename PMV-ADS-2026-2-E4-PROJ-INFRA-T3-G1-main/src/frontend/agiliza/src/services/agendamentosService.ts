import { isAxiosError } from 'axios'
import { api } from './api'

// Mesmos valores do enum StatusAgendamento do backend
export const STATUS_AGENDAMENTO = {
  PENDENTE: 0,
  CONFIRMADO: 1,
  CONCLUIDO: 2,
  CANCELADO: 3,
} as const

export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[keyof typeof STATUS_AGENDAMENTO]

export type AgendamentoDoCliente = {
  id: string
  status: StatusAgendamento
  dataHoraInicio: string
  dataHoraFim: string
  clienteId: string
  servico: { id: string; nome: string }
  profissional: { id: string; nome: string; sobrenome: string }
  estabelecimento: { id: string; nome: string; fotoAtualizadaEm?: string | null }
}

export function podeCancelar(status: StatusAgendamento): boolean {
  return status === STATUS_AGENDAMENTO.PENDENTE || status === STATUS_AGENDAMENTO.CONFIRMADO
}

type AcaoAgendamento = 'carregar' | 'cancelar' | 'criar'

export class AgendamentoError extends Error {}

export async function listarMeusAgendamentos(): Promise<AgendamentoDoCliente[]> {
  try {
    const { data } = await api.get<AgendamentoDoCliente[]>('/agendamentos/meus')
    return data
  } catch (erro) {
    throw erroDeAgendamento(erro, 'carregar')
  }
}

export async function criarAgendamento(dados: {
  profissionalId: string
  servicoId: string
  dataHoraInicio: string
}): Promise<void> {
  try {
    await api.post('/agendamentos', dados)
  } catch (erro) {
    throw erroDeAgendamento(erro, 'criar')
  }
}

export async function cancelarAgendamento(id: string): Promise<void> {
  try {
    await api.delete(`/agendamentos/${id}`)
  } catch (erro) {
    throw erroDeAgendamento(erro, 'cancelar')
  }
}

function erroDeAgendamento(erro: unknown, acao: AcaoAgendamento): AgendamentoError {
  if (!isAxiosError(erro) || !erro.response) {
    return new AgendamentoError(
      `Não foi possível ${acao === 'criar' ? 'confirmar' : acao} o agendamento. Verifique sua conexão e tente novamente.`,
    )
  }

  const { status, data } = erro.response
  const mensagem = typeof data?.message === 'string' ? data.message : ''

  if (acao === 'criar') {
    if (status === 403) return new AgendamentoError('Só clientes podem fazer agendamentos.')
    if (mensagem && [400, 404, 409].includes(status)) return new AgendamentoError(mensagem)
    return new AgendamentoError('Não foi possível confirmar o agendamento agora. Tente novamente em instantes.')
  }

  if (status === 409) {
    return new AgendamentoError(mensagem || 'Este agendamento não pode mais ser cancelado.')
  }
  if (status === 404) return new AgendamentoError('Agendamento não encontrado.')
  if (status === 403) {
    return new AgendamentoError('Você não tem permissão para cancelar este agendamento.')
  }
  return new AgendamentoError(`Não foi possível ${acao} o agendamento agora. Tente novamente em instantes.`)
}
