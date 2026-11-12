import { api } from './api'

export async function buscarMinhaFoto(): Promise<string | null> {
  const { data } = await api.get<{ foto: string | null }>('/usuarios/me/foto')
  return data.foto
}
