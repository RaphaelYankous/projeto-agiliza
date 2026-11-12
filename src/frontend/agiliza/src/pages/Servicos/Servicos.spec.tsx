import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ServicoDaLista } from '../../services/servicosService'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { Servicos } from '.'

const CORTE: ServicoDaLista = { id: 's1', nome: 'Corte', preco: 4500, descricao: 'Corte clássico', duracao: 35, pontoFidelidade: 1 }
const AJUSTE: ServicoDaLista = { id: 's2', nome: 'Ajuste', preco: 1000, descricao: 'Pezinho', duracao: 1, pontoFidelidade: 0 }

function responder({ estabelecimentos = [{ id: 'est-1', nome: 'Barbearia' }], servicos = [CORTE, AJUSTE] } = {}) {
  servidor.use(
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json(estabelecimentos)),
    http.get(`${API}/estabelecimentos/est-1/servicos`, () => HttpResponse.json(servicos)),
  )
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/gestor/servicos" element={<Servicos />} />
      <Route path="/gestor/servicos/novo" element={<PaginaAtual nome="Novo" />} />
      <Route path="/gestor/servicos/:id/editar" element={<PaginaAtual nome="Edição" />} />
    </>,
    { rota: '/gestor/servicos' },
  )

describe('Tela Serviços', () => {
  it('mostra os serviços com preço em reais e duração no singular ou plural', async () => {
    responder()
    renderizar()

    const cartoes = await screen.findAllByRole('article')
    expect(within(cartoes[0]).getByRole('heading', { name: 'Corte' })).toBeInTheDocument()
    expect(within(cartoes[0]).getByText(/R\$\s45,00 • 35 minutos/)).toBeInTheDocument()
    expect(within(cartoes[1]).getByText(/R\$\s10,00 • 1 minuto$/)).toBeInTheDocument()
  })

  it('mostra a mensagem de lista vazia', async () => {
    responder({ servicos: [] })
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Nenhum serviço cadastrado' })).toBeInTheDocument()
  })

  it('pede um estabelecimento antes e desativa o cadastro', async () => {
    responder({ estabelecimentos: [] })
    renderizar()

    expect(await screen.findByRole('status')).toHaveTextContent('Cadastre um estabelecimento antes de')
    expect(screen.getByRole('button', { name: 'Cadastrar novo serviço' })).toBeDisabled()
  })

  it('mostra um alerta quando o estabelecimento ou a lista não carregam', async () => {
    servidor.use(http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json({}, { status: 500 })))
    const { unmount } = renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o seu estabelecimento.')
    unmount()

    responder()
    servidor.use(http.get(`${API}/estabelecimentos/est-1/servicos`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os serviços.')
  })

  it('leva para o cadastro e para a edição', async () => {
    responder()
    const { unmount } = renderizar()
    await screen.findAllByRole('article')

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar novo serviço' }))
    expect(screen.getByText('Novo em /gestor/servicos/novo')).toBeInTheDocument()
    unmount()

    renderizar()
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Corte' }))
    expect(screen.getByText('Edição em /gestor/servicos/s1/editar')).toBeInTheDocument()
  })

  it('exclui um serviço depois da confirmação', async () => {
    responder()
    let excluido: string | undefined
    servidor.use(
      http.delete(`${API}/estabelecimentos/est-1/servicos/:id`, ({ params }) => {
        excluido = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await screen.findAllByRole('article')

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Corte' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Excluir serviço' })).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Serviço Corte excluído com sucesso.')
    expect(excluido).toBe('s1')
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('mostra no diálogo o motivo quando a exclusão é recusada', async () => {
    responder()
    servidor.use(
      http.delete(`${API}/estabelecimentos/est-1/servicos/:id`, () =>
        HttpResponse.json({ message: 'O serviço tem agendamentos vinculados.' }, { status: 409 }),
      ),
    )
    renderizar()
    await screen.findAllByRole('article')

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Ajuste' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('O serviço tem agendamentos vinculados.')
  })
})
