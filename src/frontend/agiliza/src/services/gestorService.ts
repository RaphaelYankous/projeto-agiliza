import { api } from './api'

export type ResumoMensalEstabelecimento = {
  servicosRealizados: number
  agendamentos: number
  faturamentoEstimado: number
  agendamentosHoje: number
}

export type EstabelecimentoGestor = {
  id: string
  nome: string
  razaoSocial: string
  cnpj: string
  email: string
  endereco: string
  latitude: number
  longitude: number
  telefone: string
  descricao?: string
  horarioAbertura: string
  horarioFechamento: string
  diasFuncionamento?: string[]
  fidelidade: boolean
  fotoAtualizadaEm?: string | null
}

export type ResumoEstabelecimento = {
  estabelecimento: EstabelecimentoGestor
  servicos: number | null
  profissionais: number | null
}

export type GestorDetalhe = {
  usuarioId: string
  usuario: {
    id: string
    nome: string
    sobrenome: string
    email: string
    cpf: string
    telefone: string
    perfil: string
  }
}

export type PerfilGestor = {
  id: string
  usuarioId: string
  nome: string
  sobrenome: string
  email: string
  telefone: string
  cpf: string
  perfil: string
}

export type DadosEdicaoGestor = {
  nome: string
  sobrenome: string
  email: string
  cpf: string
  telefone: string
  senha?: string
  foto?: File | null
}

export class GestorError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'GestorError'
  }
}

export async function carregarMeusEstabelecimentos(): Promise<EstabelecimentoGestor[]> {
  const { data } = await api.get<EstabelecimentoGestor[]>('/estabelecimentos/meus')

  return data
}

export async function contarServicos(estabelecimentoId: string): Promise<number> {
  const { data } = await api.get<unknown[]>(`/estabelecimentos/${estabelecimentoId}/servicos`)

  return data.length
}

export async function contarProfissionais(estabelecimentoId: string): Promise<number> {
  const { data } = await api.get<unknown[]>(`/estabelecimentos/${estabelecimentoId}/profissionais`)

  return data.length
}

export async function carregarPainelGestor(): Promise<ResumoEstabelecimento[]> {
  const estabelecimentos = await carregarMeusEstabelecimentos()

  return Promise.all(
    estabelecimentos.map(async (estabelecimento) => {
      const [servicos, profissionais] = await Promise.all([
        contarServicos(estabelecimento.id).catch(() => null),
        contarProfissionais(estabelecimento.id).catch(() => null),
      ])

      return { estabelecimento, servicos, profissionais }
    }),
  )
}

export async function carregarResumoMensal(
  estabelecimentoId: string,
): Promise<ResumoMensalEstabelecimento> {
  const { data } = await api.get<ResumoMensalEstabelecimento>(
    `/agendamentos/resumo/${estabelecimentoId}`,
  )

  return data
}

export async function consultarPerfilGestor(): Promise<PerfilGestor> {
  try {
    const { data } = await api.get<PerfilGestor>('/gestores/perfil')
    return data
  } catch {
    throw new GestorError('Não foi possível carregar as informações do seu perfil.')
  }
}

export async function buscarGestor(id: string): Promise<GestorDetalhe> {
  try {
    const { data } = await api.get<GestorDetalhe>(`/gestores/${id}`)
    return data
  } catch {
    throw new GestorError('Não foi possível obter os dados do gestor.')
  }
}

export async function atualizarGestor(
  id: string,
  dados: DadosEdicaoGestor,
): Promise<GestorDetalhe> {
  try {
    const corpo = new FormData()
    corpo.append('nome', dados.nome)
    corpo.append('sobrenome', dados.sobrenome)
    corpo.append('email', dados.email)
    corpo.append('cpf', dados.cpf)
    corpo.append('telefone', dados.telefone)

    if (dados.senha) {
      corpo.append('senha', dados.senha)
    }

    if (dados.foto) {
      corpo.append('foto', dados.foto)
    }

    const { data } = await api.patch<GestorDetalhe>(`/gestores/${id}`, corpo, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  } catch (erro: any) {
    const mensagem = erro.response?.data?.message || 'Falha ao atualizar dados do gestor.'
    throw new GestorError(Array.isArray(mensagem) ? mensagem.join(', ') : mensagem)
  }
}