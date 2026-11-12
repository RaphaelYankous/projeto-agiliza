import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Routes, useLocation } from 'react-router'
import { AuthProvider } from '../contexts/AuthProvider'
import { useAuth } from '../contexts/AuthContext'

type Entrada = string | { pathname: string; state?: unknown }

export function renderizarComRotas(rotas: ReactNode, { rota = '/', token }: { rota?: Entrada; token?: string } = {}) {
  if (token) localStorage.setItem('agiliza.token', token)
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AuthProvider>
        <Routes>{rotas}</Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

export function PaginaAtual({ nome }: { nome: string }) {
  const { usuario } = useAuth()
  const { pathname, state } = useLocation()
  const aviso = (state as { aviso?: { mensagem: string } } | null)?.aviso
  return (
    <p>
      {nome} em {pathname}
      {usuario ? ` como ${usuario.perfil}` : ''}
      {aviso ? ` com o aviso: ${aviso.mensagem}` : ''}
    </p>
  )
}
