import { api } from './api'

export type PerfilCliente = {
  id: string
  nome: string
  sobrenome: string
  email: string
}

export type Fidelidade = {
  pontos: number
  meta: number | null
}

export async function consultarPerfil(): Promise<PerfilCliente> {
  const { data } = await api.get<PerfilCliente>('/meu-perfil-cliente')
  return data
}

export async function consultarFidelidade(): Promise<Fidelidade> {
  const { data } = await api.get<Fidelidade>('/meu-perfil-cliente/fidelidade')
  return data
}