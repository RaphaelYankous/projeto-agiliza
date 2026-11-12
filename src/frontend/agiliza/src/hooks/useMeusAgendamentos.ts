import { useCallback, useEffect, useState } from 'react'
import {
  listarMeusAgendamentos,
  type AgendamentoDoCliente,
  type StatusAgendamento,
} from '../services/agendamentosService'

export type EstadoAgendamentos =
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'pronto'; agendamentos: AgendamentoDoCliente[] }

export function useMeusAgendamentos() {
  const [estado, setEstado] = useState<EstadoAgendamentos>({ status: 'carregando' })

  useEffect(() => {
    let ativo = true

    listarMeusAgendamentos()
      .then((agendamentos) => {
        if (ativo) setEstado({ status: 'pronto', agendamentos })
      })
      .catch(() => {
        if (ativo) setEstado({ status: 'erro' })
      })

    return () => {
      ativo = false
    }
  }, [])

  const atualizarStatus = useCallback((id: string, status: StatusAgendamento) => {
    setEstado((atual) =>
      atual.status === 'pronto'
        ? {
            status: 'pronto',
            agendamentos: atual.agendamentos.map((agendamento) =>
              agendamento.id === id ? { ...agendamento, status } : agendamento,
            ),
          }
        : atual,
    )
  }, [])

  return { estado, atualizarStatus }
}
