import { useCallback, useEffect, useState } from 'react'
import { listarProfissionais, type ProfissionalDaLista } from '../services/profissionaisService'

export type EstadoProfissionais =
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'pronto'; profissionais: ProfissionalDaLista[] }

export function useProfissionaisDoEstabelecimento(estabelecimentoId?: string) {
  const [estado, setEstado] = useState<EstadoProfissionais>({ status: 'carregando' })

  useEffect(() => {
    if (!estabelecimentoId) return
    let ativo = true

    listarProfissionais(estabelecimentoId)
      .then((profissionais) => {
        if (ativo) setEstado({ status: 'pronto', profissionais })
      })
      .catch(() => {
        if (ativo) setEstado({ status: 'erro' })
      })

    return () => {
      ativo = false
    }
  }, [estabelecimentoId])

  const remover = useCallback((id: string) => {
    setEstado((atual) =>
      atual.status === 'pronto'
        ? { status: 'pronto', profissionais: atual.profissionais.filter((profissional) => profissional.id !== id) }
        : atual,
    )
  }, [])

  return { estado, remover }
}
