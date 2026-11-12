import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { EditarProfissional } from '.'

const CARLA = {
  id: 'p1',
  nome: 'Carla',
  sobrenome: 'Mendes',
  email: 'carla@email.com',
  cpf: '52998224725',
  telefone: '31988881001',
  foto: null,
  servicos: [{ id: 's1', nome: 'Corte' }],
}

function responder() {
  servidor.use(
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json([{ id: 'est-1', nome: 'Barbearia' }])),
    http.get(`${API}/estabelecimentos/est-1/servicos`, () =>
      HttpResponse.json([{ id: 's1', nome: 'Corte' }, { id: 's2', nome: 'Barba' }]),
    ),
    http.get(`${API}/estabelecimentos/est-1/profissionais/p1`, () => HttpResponse.json(CARLA)),
  )
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/gestor/profissionais/:id/editar" element={<EditarProfissional />} />
      <Route path="/gestor/profissionais" element={<PaginaAtual nome="Lista" />} />
    </>,
    { rota: '/gestor/profissionais/p1/editar' },
  )

describe('Tela Editar profissional', () => {
  it('preenche o formulário com os dados atuais, com CPF só para leitura e sem senha', async () => {
    responder()
    renderizar()

    expect(await screen.findByLabelText('Nome')).toHaveValue('Carla')
    expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25')
    expect(screen.getByLabelText('CPF')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Telefone')).toHaveValue('(31) 98888-1001')
    expect(screen.queryByLabelText('Senha de acesso')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Corte' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Barba' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'Adicionar horário' })).not.toBeInTheDocument()
  })

  it('salva as alterações e volta para a lista com o aviso', async () => {
    responder()
    let corpo: unknown
    servidor.use(
      http.patch(`${API}/estabelecimentos/est-1/profissionais/p1`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({})
      }),
    )
    renderizar()
    await screen.findByRole('button', { name: 'Barba' })

    await userEvent.clear(screen.getByLabelText('Sobrenome'))
    await userEvent.type(screen.getByLabelText('Sobrenome'), 'Souza')
    await userEvent.click(screen.getByRole('button', { name: 'Barba' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Lista em /gestor/profissionais com o aviso: Profissional Carla Souza atualizado com sucesso.')).toBeInTheDocument()
    expect(corpo).toEqual({
      nome: 'Carla',
      sobrenome: 'Souza',
      email: 'carla@email.com',
      telefone: '31988881001',
      servicoIds: ['s1', 's2'],
    })
  })

  it('mostra o erro quando o profissional não existe', async () => {
    responder()
    servidor.use(http.get(`${API}/estabelecimentos/est-1/profissionais/p1`, () => HttpResponse.json({}, { status: 404 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Profissional não encontrado.')
  })

  it('mostra o erro da API ao salvar sem sair da tela', async () => {
    responder()
    servidor.use(http.patch(`${API}/estabelecimentos/est-1/profissionais/p1`, () => HttpResponse.json({}, { status: 400 })))
    renderizar()
    await screen.findByRole('button', { name: 'Barba' })

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Alguns dados foram recusados pelo servidor.')
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled()
  })
})
