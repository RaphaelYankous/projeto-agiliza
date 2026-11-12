import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { EditarServico } from '.'

const CORTE = { id: 's1', nome: 'Corte', preco: 4500, descricao: 'Corte clássico', duracao: 35, pontoFidelidade: 2, estabelecimentoId: 'est-1' }

function responder() {
  servidor.use(
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json([{ id: 'est-1', nome: 'Barbearia' }])),
    http.get(`${API}/estabelecimentos/est-1/servicos/s1`, () => HttpResponse.json(CORTE)),
  )
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/gestor/servicos/:id/editar" element={<EditarServico />} />
      <Route path="/gestor/servicos" element={<PaginaAtual nome="Lista" />} />
    </>,
    { rota: '/gestor/servicos/s1/editar' },
  )

describe('Tela Editar serviço', () => {
  it('preenche o formulário com os dados atuais', async () => {
    responder()
    renderizar()

    expect(await screen.findByLabelText('Nome')).toHaveValue('Corte')
    expect(screen.getByLabelText('Preço (R$)')).toHaveValue('45,00')
    expect(screen.getByLabelText('Duração (minutos)')).toHaveValue('35')
    expect(screen.getByLabelText('Pontos de fidelidade')).toHaveValue('2')
  })

  it('salva as alterações e volta para a lista com o aviso', async () => {
    responder()
    let corpo: unknown
    servidor.use(
      http.patch(`${API}/estabelecimentos/est-1/servicos/s1`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({})
      }),
    )
    renderizar()

    await userEvent.clear(await screen.findByLabelText('Preço (R$)'))
    await userEvent.type(screen.getByLabelText('Preço (R$)'), '5000')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Lista em /gestor/servicos com o aviso: Serviço Corte atualizado com sucesso.')).toBeInTheDocument()
    expect(corpo).toEqual({ nome: 'Corte', preco: 5000, descricao: 'Corte clássico', duracao: 35, pontoFidelidade: 2 })
  })

  it('mostra o erro quando o serviço não existe', async () => {
    responder()
    servidor.use(http.get(`${API}/estabelecimentos/est-1/servicos/s1`, () => HttpResponse.json({}, { status: 404 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Serviço não encontrado.')
  })

  it('volta para a lista ao cancelar', async () => {
    responder()
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('Lista em /gestor/servicos')).toBeInTheDocument()
  })
})
