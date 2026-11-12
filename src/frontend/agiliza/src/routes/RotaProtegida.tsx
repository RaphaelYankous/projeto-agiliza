import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export function RotaProtegida() {
  const { usuario, sessaoExpirada } = useAuth()

  if (!usuario) {
    return <Navigate to="/login" replace state={sessaoExpirada ? { sessaoExpirada: true } : undefined} />
  }
  return <Outlet />
}
