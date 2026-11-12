import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { buscarMinhaFoto } from '../services/usuarioService'
import { useAuth } from './AuthContext'
import { FotoPerfilContext } from './FotoPerfilContext'

export function FotoPerfilProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const email = usuario?.email
  const [fotoSalva, setFotoSalva] = useState<{ email: string; foto: string | null } | null>(null)
  const versao = useRef(0)

  useEffect(() => {
    if (!email) return
    let cancelado = false
    const versaoInicial = versao.current
    buscarMinhaFoto().then((foto) => {
      if (!cancelado && versao.current === versaoInicial) setFotoSalva({ email, foto })
    }).catch(() => {
      // Sem foto disponível, o menu continua com o ícone padrão.
    })
    return () => { cancelado = true }
  }, [email])

  const definirFoto = useCallback((foto: string | null) => {
    if (!email) return
    versao.current += 1
    setFotoSalva({ email, foto })
  }, [email])

  const foto = fotoSalva && fotoSalva.email === email ? fotoSalva.foto : null

  return <FotoPerfilContext.Provider value={{ foto, definirFoto }}>{children}</FotoPerfilContext.Provider>
}
