import { isAxiosError } from 'axios'
import { api } from './api'

export type DadosNovoServico = {
  nome: string
  preco: number
  descricao: string
  duracao: number
  pontoFidelidade: number
}

export type ServicoCadastrado = {
  id: string
  nome: string
  preco: number
  descricao: string
  duracao: number
  pontoFidelidade: number
  estabelecimentoId: string
}

export type ServicoDaLista = Omit<ServicoCadastrado, 'estabelecimentoId'>

type AcaoServico = 'cadastrar' | 'carregar' | 'salvar' | 'excluir'

export class ServicoError extends Error {}

export async function listarServicos(estabelecimentoId: string): Promise<ServicoDaLista[]> {
  try {
    const { data } = await api.get<ServicoDaLista[]>(
      `/estabelecimentos/${estabelecimentoId}/servicos`,
    )
    return data
  } catch (erro) {
    throw erroDeServico(erro, 'carregar')
  }
}

export async function buscarServico(
  estabelecimentoId: string,
  id: string,
): Promise<ServicoCadastrado> {
  try {
    const { data } = await api.get<ServicoCadastrado>(
      `/estabelecimentos/${estabelecimentoId}/servicos/${id}`,
    )
    return data
  } catch (erro) {
    throw erroDeServico(erro, 'carregar')
  }
}

export async function cadastrarServico(
  estabelecimentoId: string,
  dados: DadosNovoServico,
): Promise<ServicoCadastrado> {
  try {
    const { data } = await api.post<ServicoCadastrado>(
      `/estabelecimentos/${estabelecimentoId}/servicos`,
      {
        nome: dados.nome.trim(),
        preco: dados.preco,
        descricao: dados.descricao.trim(),
        duracao: dados.duracao,
        pontoFidelidade: dados.pontoFidelidade,
      },
    )
    return data
  } catch (erro) {
    throw erroDeServico(erro, 'cadastrar')
  }
}

export async function atualizarServico(
  estabelecimentoId: string,
  id: string,
  dados: DadosNovoServico,
): Promise<void> {
  try {
    await api.patch(`/estabelecimentos/${estabelecimentoId}/servicos/${id}`, {
      nome: dados.nome.trim(),
      preco: dados.preco,
      descricao: dados.descricao.trim(),
      duracao: dados.duracao,
      pontoFidelidade: dados.pontoFidelidade,
    })
  } catch (erro) {
    throw erroDeServico(erro, 'salvar')
  }
}

export async function excluirServico(estabelecimentoId: string, id: string): Promise<void> {
  try {
    await api.delete(`/estabelecimentos/${estabelecimentoId}/servicos/${id}`)
  } catch (erro) {
    throw erroDeServico(erro, 'excluir')
  }
}

function erroDeServico(erro: unknown, acao: AcaoServico): ServicoError {
  if (!isAxiosError(erro) || !erro.response) {
    return new ServicoError(
      `Não foi possível ${acao} o serviço. Verifique sua conexão e tente novamente.`,
    )
  }

  const { status, data } = erro.response
  const mensagemDeServidor = data?.message
  const mensagem = Array.isArray(mensagemDeServidor)
    ? mensagemDeServidor.join(' ')
    : typeof mensagemDeServidor === 'string'
      ? mensagemDeServidor
      : ''

  if (status === 403) {
    return new ServicoError(
      acao === 'cadastrar'
        ? 'Você não tem permissão para cadastrar serviços neste estabelecimento.'
        : 'Você não tem permissão para acessar os serviços deste estabelecimento.',
    )
  }
  if (status === 404) {
    return new ServicoError(
      acao === 'cadastrar'
        ? 'Estabelecimento não encontrado. Atualize a página e tente novamente.'
        : 'Serviço não encontrado. Atualize a página e tente novamente.',
    )
  }
  if (status === 409) {
    return new ServicoError(mensagem || 'Não é possível excluir este serviço agora.')
  }
  if (status === 400) {
    return new ServicoError(
      mensagem || 'Alguns dados foram recusados pelo servidor. Revise os campos e tente novamente.',
    )
  }
  return new ServicoError(`Não foi possível ${acao} o serviço agora. Tente novamente em instantes.`)
}
