import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { estabelecimentoGestor } from '../../test/dados'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { PainelGestor } from './Painel'

function EstadoRecebido() {
  const { state } = useLocation()
  return <p>Editar com {(state as { estabelecimento?: { nome: string } } | null)?.estabelecimento?.nome}</p>
}

const rotas = (
  <>
    <Route path="/gestor" element={<PainelGestor />} />
    <Route path="/gestor/editar-estabelecimento" element={<EstadoRecebido />} />
    <Route path="/gestor/galeria" element={<PaginaAtual nome="Galeria" />} />
    <Route path="/gestor/criar-estabelecimento" element={<PaginaAtual nome="Criar" />} />
  </>
)

const renderizar = () => renderizarComRotas(rotas, { rota: '/gestor' })

function responderPainel({
  estabelecimentos = [estabelecimentoGestor()],
  servicos = 3,
  profissionais = 2,
  resumo = { servicosRealizados: 5, agendamentos: 11, faturamentoEstimado: 49500, agendamentosHoje: 1 },
}: {
  estabelecimentos?: ReturnType<typeof estabelecimentoGestor>[]
  servicos?: number | 'erro'
  profissionais?: number
  resumo?: object | 'erro'
} = {}) {
  servidor.use(
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json(estabelecimentos)),
    http.get(`${API}/estabelecimentos/:id/servicos`, () =>
      servicos === 'erro' ? HttpResponse.json({}, { status: 500 }) : HttpResponse.json(Array(servicos).fill({})),
    ),
    http.get(`${API}/estabelecimentos/:id/profissionais`, () => HttpResponse.json(Array(profissionais).fill({}))),
    http.get(`${API}/agendamentos/resumo/:id`, () =>
      resumo === 'erro' ? HttpResponse.json({}, { status: 500 }) : HttpResponse.json(resumo),
    ),
  )
}

describe('Painel do gestor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 9, 10, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra os dados do estabelecimento, os totais e o resumo do mês', async () => {
    responderPainel()
    renderizar()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando dados do estabelecimento...')
    const cartao = await screen.findByRole('article')

    expect(screen.getByRole('heading', { level: 1, name: 'Painel · Barbearia do Pedro' })).toBeInTheDocument()
    expect(within(cartao).getByText('Aberto agora')).toBeInTheDocument()
    expect(within(cartao).getByText('(31) 98888-1001')).toBeInTheDocument()
    expect(within(cartao).getByText('11.222.333/0001-81')).toBeInTheDocument()
    expect(within(cartao).getByText('09:00 às 19:00')).toBeInTheDocument()
    expect(within(cartao).getByText('Ativa')).toBeInTheDocument()
    expect(within(cartao).getByText('3')).toBeInTheDocument()
    expect(within(cartao).getByText('2')).toBeInTheDocument()
    expect(await within(cartao).findByText(/R\$\s495,00/)).toBeInTheDocument()
    expect(within(cartao).getByText('11')).toBeInTheDocument()
  })

  it('mostra "Fechado agora" fora do horário e "Não utilizada" sem fidelidade', async () => {
    vi.setSystemTime(new Date(2026, 10, 9, 20, 30))
    responderPainel({ estabelecimentos: [estabelecimentoGestor({ fidelidade: false })] })
    renderizar()

    expect(await screen.findByText('Fechado agora')).toBeInTheDocument()
    expect(screen.getByText('Não utilizada')).toBeInTheDocument()
  })

  it('usa "—" quando um total falha e avisa quando o resumo do mês não carrega', async () => {
    responderPainel({ servicos: 'erro', resumo: 'erro' })
    renderizar()

    expect(await screen.findByText('Resumo indisponível no momento.')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('convida a cadastrar um estabelecimento quando o gestor ainda não tem', async () => {
    responderPainel({ estabelecimentos: [] })
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Nenhum estabelecimento vinculado' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar estabelecimento' }))
    expect(screen.getByText('Criar em /gestor/criar-estabelecimento')).toBeInTheDocument()
  })

  it('mostra o erro e carrega de novo ao clicar em "Tentar novamente"', async () => {
    responderPainel()
    servidor.use(http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json({}, { status: 500 }), { once: true }))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o painel.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('article')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('leva para a edição com os dados do estabelecimento e para a galeria', async () => {
    responderPainel()
    const { unmount } = renderizar()
    await screen.findByRole('article')

    await userEvent.click(screen.getByRole('button', { name: 'Dados do estabelecimento' }))
    expect(screen.getByText('Editar com Barbearia do Pedro')).toBeInTheDocument()
    unmount()

    renderizar()
    await screen.findByRole('article')
    await userEvent.click(screen.getByRole('button', { name: 'Fotos do estabelecimento' }))
    expect(screen.getByText('Galeria em /gestor/galeria')).toBeInTheDocument()
  })
})
