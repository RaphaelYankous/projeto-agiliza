import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { aoSessaoExpirar } from '../services/api'
import {
  decodificarToken,
  lerToken,
  removerToken,
  salvarToken,
  tokenExpirado,
  type UsuarioLogado,
} from '../services/sessao'
import { AuthContext, type AuthContextValue } from './AuthContext'

type EstadoSessao = {
  usuario: UsuarioLogado | null
  sessaoExpirada: boolean
}

function estadoInicial(): EstadoSessao {
  const token = lerToken()
  if (!token) return { usuario: null, sessaoExpirada: false }
  if (tokenExpirado(token)) return { usuario: null, sessaoExpirada: true }

  const dados = decodificarToken(token)
  return {
    usuario: dados && { email: dados.email, perfil: dados.perfil },
    sessaoExpirada: false,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSessao>(estadoInicial)
  const location = useLocation()

  const entrar = useCallback((token: string) => {
    const dados = decodificarToken(token)
    if (!dados) return
    salvarToken(token)
    setEstado({
      usuario: { email: dados.email, perfil: dados.perfil },
      sessaoExpirada: false,
    })
  }, [])

  const sair = useCallback(() => {
    removerToken()
    setEstado({ usuario: null, sessaoExpirada: false })
  }, [])

  const expirarSessao = useCallback(() => {
    removerToken()
    setEstado((atual) => (atual.usuario ? { usuario: null, sessaoExpirada: true } : atual))
  }, [])

  const conferirValidade = useCallback(() => {
    const token = lerToken()
    if (!token || tokenExpirado(token)) expirarSessao()
  }, [expirarSessao])

  useEffect(() => {
    const token = lerToken()
    if (token && tokenExpirado(token)) removerToken()
  }, [])

  useEffect(() => aoSessaoExpirar(expirarSessao), [expirarSessao])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (estado.usuario) conferirValidade()
  }, [location.key, estado.usuario, conferirValidade])

  useEffect(() => {
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') conferirValidade()
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade)
  }, [conferirValidade])

  const valor = useMemo<AuthContextValue>(
    () => ({ ...estado, entrar, sair }),
    [estado, entrar, sair],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
