import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ProfissionalDaLista } from '../../services/profissionaisService'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { Profissionais } from '.'

const servico = (id: string, nome: string) => ({ id, nome })

const CARLA: ProfissionalDaLista = {
  id: 'p1',
  nome: 'Carla',
  sobrenome: 'Mendes',
  email: 'carla@email.com',
  foto: 'http://localhost:3000/api/foto-carla.png',
  servicos: [servico('s1', 'Corte'), servico('s2', 'Barba'), servico('s3', 'Escova'), servico('s4', 'Coloração'), servico('s5', 'Hidratação')],
  temHorarios: true,
}
const LUCAS: ProfissionalDaLista = { id: 'p2', nome: 'Lucas', sobrenome: 'Lima', email: 'lucas@email.com', foto: null, servicos: [], temHorarios: false }

function responder({ estabelecimentos = [{ id: 'est-1', nome: 'Barbearia' }], profissionais = [CARLA, LUCAS] } = {}) {
  servidor.use(
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json(estabelecimentos)),
    http.get(`${API}/estabelecimentos/est-1/profissionais`, () => HttpResponse.json(profissionais)),
  )
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/gestor/profissionais" element={<Profissionais />} />
      <Route path="/gestor/profissionais/novo" element={<PaginaAtual nome="Novo" />} />
      <Route path="/gestor/profissionais/:id/editar" element={<PaginaAtual nome="Edição" />} />
      <Route path="/gestor/profissionais/:id/horarios" element={<PaginaAtual nome="Horários" />} />
    </>,
    { rota: '/gestor/profissionais' },
  )

describe('Tela Profissionais', () => {
  it('mostra os profissionais em cartões com foto, e-mail e até 3 serviços', async () => {
    responder()
    renderizar()

    const cartoes = await screen.findAllByRole('article')
    expect(cartoes).toHaveLength(2)

    const carla = within(cartoes[0])
    expect(carla.getByRole('heading', { name: 'Carla' })).toBeInTheDocument()
    expect(carla.getByRole('img', { name: 'Foto de Carla Mendes' })).toHaveAttribute('src', CARLA.foto)
    expect(carla.getByText('carla@email.com')).toHaveAttribute('title', 'carla@email.com')
    const servicos = within(carla.getByRole('list', { name: 'Serviços de Carla Mendes' })).getAllByRole('listitem')
    expect(servicos.map((item) => item.textContent)).toEqual(['Corte', 'Barba', 'Escova', '+2'])
    expect(carla.getByText('+2')).toHaveAttribute('title', 'Coloração, Hidratação')

    const lucas = within(cartoes[1])
    expect(lucas.queryByRole('img')).not.toBeInTheDocument()
    expect(lucas.queryByRole('list')).not.toBeInTheDocument()
  })

  it('avisa no cartão do profissional sem horários que ele não aparece para os clientes', async () => {
    responder()
    renderizar()

    const [carla, lucas] = await screen.findAllByRole('article')
    expect(within(carla).queryByText('Sem horários cadastrados.')).not.toBeInTheDocument()
    expect(within(lucas).getByText('Sem horários cadastrados.').parentElement).toHaveTextContent(
      'Sem horários cadastrados. Enquanto não tiver horário, este profissional não aparece para os clientes.',
    )
  })

  it('leva para a página de horários do profissional', async () => {
    responder()
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Horários de Carla Mendes' }))

    expect(screen.getByText('Horários em /gestor/profissionais/p1/horarios')).toBeInTheDocument()
  })

  it('mostra a mensagem de lista vazia', async () => {
    responder({ profissionais: [] })
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Nenhum profissional cadastrado' })).toBeInTheDocument()
  })

  it('pede um estabelecimento antes e desativa o cadastro', async () => {
    responder({ estabelecimentos: [] })
    renderizar()

    expect(await screen.findByRole('status')).toHaveTextContent('Cadastre um estabelecimento antes de cadastrar profissionais.')
    expect(screen.getByRole('button', { name: 'Cadastrar novo profissional' })).toBeDisabled()
  })

  it('mostra um alerta quando a lista não carrega', async () => {
    responder()
    servidor.use(http.get(`${API}/estabelecimentos/est-1/profissionais`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os profissionais.')
  })

  it('leva para o cadastro e para a edição', async () => {
    responder()
    const { unmount } = renderizar()
    await screen.findAllByRole('article')

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar novo profissional' }))
    expect(screen.getByText('Novo em /gestor/profissionais/novo')).toBeInTheDocument()
    unmount()

    renderizar()
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Lucas Lima' }))
    expect(screen.getByText('Edição em /gestor/profissionais/p2/editar')).toBeInTheDocument()
  })

  it('exclui um profissional depois da confirmação', async () => {
    responder()
    let excluido: string | undefined
    servidor.use(
      http.delete(`${API}/estabelecimentos/est-1/profissionais/:id`, ({ params }) => {
        excluido = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await screen.findAllByRole('article')

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Carla Mendes' }))
    const dialogo = screen.getByRole('dialog', { name: 'Excluir profissional' })
    expect(dialogo).toHaveTextContent('Deseja excluir Carla Mendes?')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Profissional Carla Mendes excluído com sucesso.')
    expect(excluido).toBe('p1')
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('mostra no diálogo o motivo quando a exclusão é recusada', async () => {
    responder()
    servidor.use(
      http.delete(`${API}/estabelecimentos/est-1/profissionais/:id`, () =>
        HttpResponse.json({ message: 'O profissional tem agendamentos futuros.' }, { status: 409 }),
      ),
    )
    renderizar()
    await screen.findAllByRole('article')

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Lucas Lima' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('O profissional tem agendamentos futuros.')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })
})
