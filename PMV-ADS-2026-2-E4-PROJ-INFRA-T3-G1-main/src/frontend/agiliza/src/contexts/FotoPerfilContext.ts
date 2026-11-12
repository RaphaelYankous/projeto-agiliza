import { createContext, useContext } from 'react'

export type FotoPerfilContextValue = {
  foto: string | null
  definirFoto: (foto: string | null) => void
}

export const FotoPerfilContext = createContext<FotoPerfilContextValue | null>(null)

export function useFotoPerfil(): FotoPerfilContextValue {
  const contexto = useContext(FotoPerfilContext)
  if (!contexto) throw new Error('useFotoPerfil precisa ser usado dentro do FotoPerfilProvider.')
  return contexto
}
