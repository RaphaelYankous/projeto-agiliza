import { useCallback, useEffect, useState } from 'react'
import { listarServicos, type ServicoDaLista } from '../services/servicosService'

export type EstadoServicos =
  | { status: 'carregando' }
  | { status: 'erro'; estabelecimentoId: string }
  | { status: 'pronto'; estabelecimentoId: string; servicos: ServicoDaLista[] }

export function useServicosDoEstabelecimento(estabelecimentoId?: string) {
  const [estado, setEstado] = useState<EstadoServicos>({ status: 'carregando' })

  useEffect(() => {
    if (!estabelecimentoId) return
    let ativo = true

    listarServicos(estabelecimentoId)
      .then((servicos) => {
        if (ativo) setEstado({ status: 'pronto', estabelecimentoId, servicos })
      })
      .catch(() => {
        if (ativo) setEstado({ status: 'erro', estabelecimentoId })
      })

    return () => {
      ativo = false
    }
  }, [estabelecimentoId])

  const remover = useCallback((id: string) => {
    setEstado((atual) =>
      atual.status === 'pronto'
        ? { status: 'pronto', estabelecimentoId: atual.estabelecimentoId, servicos: atual.servicos.filter((servico) => servico.id !== id) }
        : atual,
    )
  }, [])

  return { estado, remover }
}
