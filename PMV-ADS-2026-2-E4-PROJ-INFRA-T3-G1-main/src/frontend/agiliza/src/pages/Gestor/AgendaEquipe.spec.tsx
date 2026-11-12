import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgendaDoDia } from '../../services/agendaProfissionalService'
import { renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { criarToken } from '../../test/token'
import { AgendaEquipe } from './AgendaEquipe'

const HOJE = '2026-11-09'
const profissionais = [
  { id: 'p1', nome: 'Carla', sobrenome: 'Mendes', email: 'carla@email.com', foto: null, servicos: [{ id: 's1', nome: 'Corte' }] },
  { id: 'p2', nome: 'Lucas', sobrenome: 'Lima', email: 'lucas@email.com', foto: null, servicos: [] },
]

function agenda(data = HOJE, cliente = 'Ana'): AgendaDoDia {
  return {
    data,
    disponibilidades: [{ horaInicio: '09:00:00', horaFim: '11:00:00' }],
    agendamentos: [{
      id: 'a1', horaInicio: '2026-11-09T09:30:00', horaFim: '2026-11-09T10:00:00',
      cliente, servico: 'Corte', status: 1,
    }],
    bloqueios: [{ id: 'b1', data, horaInicio: '10:00:00', horaFim: '10:30:00', motivo: 'Almoço' }],
  }
}

function responderAgenda() {
  servidor.use(
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json([{ id: 'est-1', nome: 'Barbearia' }])),
    http.get(`${API}/estabelecimentos/est-1/profissionais`, () => HttpResponse.json(profissionais)),
    http.get(`${API}/agenda-gestor/:profissionalId`, ({ params, request }) => {
      const data = new URL(request.url).searchParams.get('data') ?? HOJE
      return HttpResponse.json(agenda(data, params.profissionalId === 'p2' ? 'Bruno' : 'Ana'))
    }),
  )
}

function renderizar() {
  return renderizarComRotas(<Route path="/gestor/agenda" element={<AgendaEquipe />} />, {
    rota: '/gestor/agenda', token: criarToken({ perfil: 'gestor' }),
  })
}

describe('Agenda da equipe', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 9, 8, 0))
  })

  afterEach(() => vi.useRealTimers())

  it('mostra os profissionais e os quadrinhos livres, agendados e bloqueados', async () => {
    responderAgenda()
    renderizar()

    expect(await screen.findByRole('button', { name: /Carla Mendes/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lucas Lima/ })).toBeInTheDocument()

    const agendaSelecionada = await screen.findByLabelText('Horários da agenda selecionada')
    expect(within(agendaSelecionada).getAllByText('Livre').length).toBeGreaterThan(0)
    expect(within(agendaSelecionada).getByText('Agendado')).toBeInTheDocument()
    expect(within(agendaSelecionada).getByText('Bloqueado')).toBeInTheDocument()
  })

  it('troca a agenda ao selecionar outro profissional', async () => {
    responderAgenda()
    renderizar()

    await screen.findByText('Carla Mendes')
    await userEvent.click(screen.getByRole('button', { name: /Lucas Lima/ }))

    const agendaSelecionada = await screen.findByLabelText('Horários da agenda selecionada')
    expect(screen.getByRole('heading', { name: 'Lucas Lima' })).toBeInTheDocument()
    expect(within(agendaSelecionada).getByText('Agendado')).toBeInTheDocument()
  })

  it('consulta novamente as agendas ao mudar a data', async () => {
    const datas: string[] = []
    servidor.use(
      http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json([{ id: 'est-1', nome: 'Barbearia' }])),
      http.get(`${API}/estabelecimentos/est-1/profissionais`, () => HttpResponse.json(profissionais)),
      http.get(`${API}/agenda-gestor/:profissionalId`, ({ request }) => {
        datas.push(new URL(request.url).searchParams.get('data') ?? '')
        return HttpResponse.json(agenda(new URL(request.url).searchParams.get('data') ?? HOJE))
      }),
    )
    renderizar()
    await screen.findByLabelText('Horários da agenda selecionada')

    const campoData = screen.getByLabelText('Dia da agenda')
    fireEvent.change(campoData, { target: { value: '2026-11-10' } })

    await vi.waitFor(() => expect(datas).toContain('2026-11-10'))
  })

  it('mostra erro quando não consegue carregar a equipe', async () => {
    servidor.use(http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a equipe.')
  })
})
