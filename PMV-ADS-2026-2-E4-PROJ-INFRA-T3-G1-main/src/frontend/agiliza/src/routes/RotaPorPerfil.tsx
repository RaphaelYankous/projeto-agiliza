import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import type { Perfil } from '../services/sessao'
import type { AvisoNavegacao } from '../components/AppLayout'

const ACESSO_NEGADO: AvisoNavegacao = {
  tipo: 'error',
  mensagem: 'Você não tem permissão para acessar essa página.',
}

export function RotaPorPerfil({ perfis }: { perfis: Perfil[] }) {
  const { usuario } = useAuth()

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (!perfis.includes(usuario.perfil)) {
    return <Navigate to="/" replace state={{ aviso: ACESSO_NEGADO }} />
  }

  return <Outlet />
}
