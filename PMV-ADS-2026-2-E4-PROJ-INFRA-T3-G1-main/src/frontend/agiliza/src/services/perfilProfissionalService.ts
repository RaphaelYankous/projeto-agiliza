import { api } from './api'

export type ServicoPerfil = { id: string; nome: string; preco: number; duracao: number }
export type PerfilProfissional = {
  nome: string
  sobrenome: string
  funcao: string
  estabelecimento: string
  horarioAbertura: string
  horarioFechamento: string
  foto: string | null
  servicos: ServicoPerfil[]
}
export type AvaliacoesProfissional = {
  media: number | null
  quantidade: number
  avaliacoes: { id: string; nota: number; comentario: string }[]
}

export async function consultarPerfil(): Promise<PerfilProfissional> {
  const { data } = await api.get<PerfilProfissional>('/meu-perfil-profissional')
  return data
}

export async function consultarAvaliacoes(): Promise<AvaliacoesProfissional> {
  const { data } = await api.get<AvaliacoesProfissional>('/meu-perfil-profissional/avaliacoes')
  return data
}

export async function atualizarNome(nome: string, sobrenome: string): Promise<Pick<PerfilProfissional, 'nome' | 'sobrenome'>> {
  const { data } = await api.patch<Pick<PerfilProfissional, 'nome' | 'sobrenome'>>('/meu-perfil-profissional', { nome, sobrenome })
  return data
}

export async function atualizarFoto(arquivo: File): Promise<Pick<PerfilProfissional, 'foto'>> {
  const formulario = new FormData()
  formulario.append('foto', arquivo)
  const { data } = await api.patch<Pick<PerfilProfissional, 'foto'>>('/meu-perfil-profissional/foto', formulario, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
