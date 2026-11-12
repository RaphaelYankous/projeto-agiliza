import { useEffect, useState } from 'react'
import { listarMinhasAvaliacoes, type AvaliacaoDoCliente } from '../services/avaliacoesService'

export type EstadoAvaliacoes =
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'pronto'; avaliacoes: AvaliacaoDoCliente[] }

export function useMinhasAvaliacoes() {
  const [estado, setEstado] = useState<EstadoAvaliacoes>({ status: 'carregando' })

  useEffect(() => {
    let ativo = true

    listarMinhasAvaliacoes()
      .then((avaliacoes) => {
        if (ativo) setEstado({ status: 'pronto', avaliacoes })
      })
      .catch(() => {
        if (ativo) setEstado({ status: 'erro' })
      })

    return () => {
      ativo = false
    }
  }, [])

  return { estado }
}
