import { createContext, useContext } from 'react'
import type { UsuarioLogado } from '../services/sessao'

export type AuthContextValue = {
  usuario: UsuarioLogado | null
  sessaoExpirada: boolean
  entrar: (token: string) => void
  sair: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth precisa ser usado dentro do AuthProvider.')
  return contexto
}
