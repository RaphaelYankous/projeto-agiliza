import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export function RotaProfissional() {
  const { usuario } = useAuth()
  return usuario?.perfil === 'profissional' ? <Outlet /> : <Navigate to="/" replace />
}
