import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export function RotaPublica() {
  const { usuario } = useAuth()

  if (usuario) return <Navigate to="/" replace />
  return <Outlet />
}
