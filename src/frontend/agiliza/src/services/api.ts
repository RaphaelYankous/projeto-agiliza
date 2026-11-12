import axios, { isAxiosError } from 'axios'
import { lerToken } from './sessao'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = lerToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function aoSessaoExpirar(callback: () => void): () => void {
  const id = api.interceptors.response.use(undefined, (erro: unknown) => {
    const levouToken = isAxiosError(erro) && Boolean(erro.config?.headers?.Authorization)
    if (levouToken && isAxiosError(erro) && erro.response?.status === 401) callback()
    return Promise.reject(erro)
  })
  return () => api.interceptors.response.eject(id)
}
