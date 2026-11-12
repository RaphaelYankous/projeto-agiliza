import { isAxiosError } from 'axios'
import { api } from './api'
import { somenteDigitos } from '../utils/mascaras'

export type EstabelecimentoDoGestor = {
  id: string
  nome: string
  horarioAbertura: string
  horarioFechamento: string
}

export type ServicoDoEstabelecimento = {
  id: string
  nome: string
}

export type ProfissionalDaLista = {
  id: string
  nome: string
  sobrenome: string
  email: string
  foto: string | null
  servicos: ServicoDoEstabelecimento[]
  temHorarios: boolean
}

export type ProfissionalDetalhe = {
  id: string
  nome: string
  sobrenome: string
  email: string
  cpf: string
  telefone: string
  foto: string | null
  servicos: ServicoDoEstabelecimento[]
}

export type DadosEdicaoProfissional = Pick<
  DadosNovoProfissional,
  'nome' | 'sobrenome' | 'email' | 'telefone' | 'servicoIds'
>

export type DadosNovoProfissional = {
  nome: string
  sobrenome: string
  email: string
  cpf: string
  telefone: string
  senha: string
  servicoIds: string[]
}

type AcaoProfissional = 'cadastrar' | 'carregar' | 'salvar' | 'excluir'

export class ProfissionalError extends Error {
  readonly campo?: 'email' | 'cpf'

  constructor(message: string, campo?: 'email' | 'cpf') {
    super(message)
    this.campo = campo
  }
}

export async function listarEstabelecimentosDoGestor(): Promise<EstabelecimentoDoGestor[]> {
  const { data } = await api.get<EstabelecimentoDoGestor[]>('/estabelecimentos/meus')

  return data.map(({ id, nome, horarioAbertura, horarioFechamento }) => ({
    id,
    nome,
    horarioAbertura,
    horarioFechamento,
  }))
}

export async function carregarEstabelecimentoDoGestor(): Promise<EstabelecimentoDoGestor | null> {
  const [estabelecimento] = await listarEstabelecimentosDoGestor()

  return estabelecimento ?? null
}

export async function listarServicos(estabelecimentoId: string): Promise<ServicoDoEstabelecimento[]> {
  const { data } = await api.get<ServicoDoEstabelecimento[]>(
    `/estabelecimentos/${estabelecimentoId}/servicos`,
  )

  return data.map((servico) => ({ id: servico.id, nome: servico.nome }))
}

export async function listarProfissionais(estabelecimentoId: string): Promise<ProfissionalDaLista[]> {
  const { data } = await api.get<ProfissionalDaLista[]>(
    `/estabelecimentos/${estabelecimentoId}/profissionais`,
  )

  return data
}

export type ProfissionalPublico = Omit<ProfissionalDaLista, 'email'>

export async function listarProfissionaisPublicos(estabelecimentoId: string): Promise<ProfissionalPublico[]> {
  const { data } = await api.get<ProfissionalPublico[]>(
    `/estabelecimentos/${estabelecimentoId}/profissionais/publicos`,
  )
  return data
}

export async function buscarProfissional(
  estabelecimentoId: string,
  id: string,
): Promise<ProfissionalDetalhe> {
  try {
    const { data } = await api.get<ProfissionalDetalhe>(
      `/estabelecimentos/${estabelecimentoId}/profissionais/${id}`,
    )
    return data
  } catch (erro) {
    throw erroDeProfissional(erro, 'carregar')
  }
}

export async function cadastrarProfissional(
  estabelecimentoId: string,
  dados: DadosNovoProfissional,
): Promise<string> {
  try {
    const { data } = await api.post<{ id: string }>(`/estabelecimentos/${estabelecimentoId}/profissionais`, {
      nome: dados.nome.trim(),
      sobrenome: dados.sobrenome.trim(),
      email: dados.email.trim(),
      cpf: somenteDigitos(dados.cpf),
      telefone: somenteDigitos(dados.telefone),
      senha: dados.senha,
      servicoIds: dados.servicoIds,
    })
    return data.id
  } catch (erro) {
    throw erroDeProfissional(erro, 'cadastrar')
  }
}

export async function atualizarProfissional(
  estabelecimentoId: string,
  id: string,
  dados: DadosEdicaoProfissional,
): Promise<void> {
  try {
    await api.patch(`/estabelecimentos/${estabelecimentoId}/profissionais/${id}`, {
      nome: dados.nome.trim(),
      sobrenome: dados.sobrenome.trim(),
      email: dados.email.trim(),
      telefone: somenteDigitos(dados.telefone),
      servicoIds: dados.servicoIds,
    })
  } catch (erro) {
    throw erroDeProfissional(erro, 'salvar')
  }
}

export async function enviarFotoProfissional(
  estabelecimentoId: string,
  id: string,
  arquivo: File,
): Promise<void> {
  const formulario = new FormData()
  formulario.append('foto', arquivo)
  try {
    await api.patch(`/estabelecimentos/${estabelecimentoId}/profissionais/${id}/foto`, formulario, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  } catch (erro) {
    throw erroDeProfissional(erro, 'salvar')
  }
}

export async function excluirProfissional(estabelecimentoId: string, id: string): Promise<void> {
  try {
    await api.delete(`/estabelecimentos/${estabelecimentoId}/profissionais/${id}`)
  } catch (erro) {
    throw erroDeProfissional(erro, 'excluir')
  }
}

function erroDeProfissional(erro: unknown, acao: AcaoProfissional): ProfissionalError {
  if (!isAxiosError(erro) || !erro.response) {
    return new ProfissionalError(
      `Não foi possível ${acao} o profissional. Verifique sua conexão e tente novamente.`,
    )
  }

  const { status, data } = erro.response
  const mensagem = typeof data?.message === 'string' ? data.message : ''

  if (status === 409 && acao === 'excluir') {
    return new ProfissionalError(mensagem || 'Não é possível excluir este profissional agora.')
  }
  if (status === 409 && mensagem.startsWith('Email ')) {
    return new ProfissionalError('Este e-mail já está cadastrado.', 'email')
  }
  if (status === 409 && mensagem.startsWith('CPF ')) {
    return new ProfissionalError('Este CPF já está cadastrado.', 'cpf')
  }
  if (status === 409) return new ProfissionalError('E-mail ou CPF já cadastrado.')
  if (status === 404) return new ProfissionalError('Profissional não encontrado.')
  if (status === 403) {
    return new ProfissionalError(
      acao === 'cadastrar'
        ? 'Você não tem permissão para cadastrar profissionais neste estabelecimento.'
        : 'Você não tem permissão para acessar este profissional.',
    )
  }
  if (status === 400) {
    return new ProfissionalError('Alguns dados foram recusados pelo servidor. Revise os campos e tente novamente.')
  }
  return new ProfissionalError(`Não foi possível ${acao} o profissional agora. Tente novamente em instantes.`)
}
