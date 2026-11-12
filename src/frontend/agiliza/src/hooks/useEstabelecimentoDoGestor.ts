import { useEffect, useState } from 'react'
import {
  carregarEstabelecimentoDoGestor,
  type EstabelecimentoDoGestor,
} from '../services/profissionaisService'

export type EstadoEstabelecimentoDoGestor =
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'semEstabelecimento' }
  | { status: 'pronto'; estabelecimento: EstabelecimentoDoGestor }

export function useEstabelecimentoDoGestor(): EstadoEstabelecimentoDoGestor {
  const [estado, setEstado] = useState<EstadoEstabelecimentoDoGestor>({ status: 'carregando' })

  useEffect(() => {
    let ativo = true

    carregarEstabelecimentoDoGestor()
      .then((estabelecimento) => {
        if (!ativo) return
        setEstado(
          estabelecimento ? { status: 'pronto', estabelecimento } : { status: 'semEstabelecimento' },
        )
      })
      .catch(() => {
        if (ativo) setEstado({ status: 'erro' })
      })

    return () => {
      ativo = false
    }
  }, [])

  return estado
}
