import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { NovoServico } from '.'

function responder(estabelecimentos = [{ id: 'est-1', nome: 'Barbearia' }]) {
  servidor.use(http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json(estabelecimentos)))
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/gestor/servicos/novo" element={<NovoServico />} />
      <Route path="/gestor/servicos" element={<PaginaAtual nome="Lista" />} />
    </>,
    { rota: '/gestor/servicos/novo' },
  )

const cadastrar = () => userEvent.click(screen.getByRole('button', { name: 'Cadastrar serviço' }))

describe('Tela Novo serviço', () => {
  it('mostra os erros de cada campo', async () => {
    responder()
    renderizar()

    await userEvent.type(await screen.findByLabelText('Preço (R$)'), '0')
    await cadastrar()

    expect(screen.getAllByText('Campo obrigatório.')).toHaveLength(3)
    expect(screen.getByText('Informe um preço maior que zero.')).toBeInTheDocument()
  })

  it('aplica a máscara de moeda e aceita só números na duração e nos pontos', async () => {
    responder()
    renderizar()

    await userEvent.type(await screen.findByLabelText('Preço (R$)'), '4550')
    await userEvent.type(screen.getByLabelText('Duração (minutos)'), '3a5')
    await userEvent.clear(screen.getByLabelText('Pontos de fidelidade'))
    await userEvent.type(screen.getByLabelText('Pontos de fidelidade'), 'x2')

    expect(screen.getByLabelText('Preço (R$)')).toHaveValue('45,50')
    expect(screen.getByLabelText('Duração (minutos)')).toHaveValue('35')
    expect(screen.getByLabelText('Pontos de fidelidade')).toHaveValue('2')
  })

  it('cadastra o serviço com o preço em centavos e volta para a lista com o aviso', async () => {
    responder()
    let corpo: unknown
    servidor.use(
      http.post(`${API}/estabelecimentos/est-1/servicos`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 's9', nome: 'Corte', estabelecimentoId: 'est-1' }, { status: 201 })
      }),
    )
    renderizar()

    await userEvent.type(await screen.findByLabelText('Nome'), ' Corte ')
    await userEvent.type(screen.getByLabelText('Preço (R$)'), '4500')
    await userEvent.type(screen.getByLabelText('Duração (minutos)'), '35')
    await userEvent.type(screen.getByLabelText('Descrição'), 'Corte clássico')
    await cadastrar()

    expect(await screen.findByText('Lista em /gestor/servicos com o aviso: Serviço Corte cadastrado com sucesso.')).toBeInTheDocument()
    expect(corpo).toEqual({ nome: 'Corte', preco: 4500, descricao: 'Corte clássico', duracao: 35, pontoFidelidade: 0 })
  })

  it('mostra a mensagem da API quando o cadastro é recusado', async () => {
    responder()
    servidor.use(
      http.post(`${API}/estabelecimentos/est-1/servicos`, () =>
        HttpResponse.json({ message: ['preco must be a positive number'] }, { status: 400 }),
      ),
    )
    renderizar()

    await userEvent.type(await screen.findByLabelText('Nome'), 'Corte')
    await userEvent.type(screen.getByLabelText('Preço (R$)'), '4500')
    await userEvent.type(screen.getByLabelText('Duração (minutos)'), '35')
    await userEvent.type(screen.getByLabelText('Descrição'), 'Corte clássico')
    await cadastrar()

    expect(await screen.findByRole('alert')).toHaveTextContent('preco must be a positive number')
  })

  it('pede um estabelecimento antes de cadastrar serviços', async () => {
    responder([])
    renderizar()

    expect(await screen.findByRole('status')).toHaveTextContent('Você ainda não possui um estabelecimento.')
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
  })
})
