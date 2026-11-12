import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgendaDoDia } from '../../services/agendaProfissionalService'
import { renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { AgendaProfissional } from './AgendaProfissional'

const HOJE = '2026-11-09'

function agendaPadrao(data = HOJE): AgendaDoDia {
  return {
    data,
    disponibilidades: [{ horaInicio: '09:00:00', horaFim: '12:00:00' }],
    agendamentos: [
      {
        id: 'a1',
        horaInicio: new Date(2026, 10, 9, 9, 30).toISOString(),
        horaFim: new Date(2026, 10, 9, 10, 30).toISOString(),
        cliente: 'Ana',
        servico: 'Corte',
        status: 1,
      },
    ],
    bloqueios: [{ id: 'b1', data, horaInicio: '10:30:00', horaFim: '11:00:00', motivo: 'almoço' }],
  }
}

function responderAgenda(responder: (data: string) => AgendaDoDia = agendaPadrao) {
  const datas: string[] = []
  servidor.use(
    http.get(`${API}/minha-agenda`, ({ request }) => {
      const data = new URL(request.url).searchParams.get('data')!
      datas.push(data)
      return HttpResponse.json(responder(data))
    }),
  )
  return datas
}

const renderizar = () => renderizarComRotas(<Route path="/agenda" element={<AgendaProfissional />} />, { rota: '/agenda' })

describe('Agenda do profissional', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 9, 8, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra a agenda de hoje dividida em horários livres, agendados e bloqueados', async () => {
    const datas = responderAgenda()
    renderizar()

    expect(screen.getByRole('heading', { name: 'Minha agenda · Hoje' })).toBeInTheDocument()
    const grade = await screen.findByLabelText('Horários do dia')
    const blocos = within(grade).getAllByRole('button').map((botao) => botao.getAttribute('aria-label'))

    expect(blocos).toEqual([
      '09:00 a 09:30: Livre, bloquear horário',
      '09:30 a 10:30: Ana, Corte, ver detalhes',
      '10:30 a 11:00: Bloqueado, almoço, ver detalhes',
      '11:00 a 11:30: Livre, bloquear horário',
      '11:30 a 12:00: Livre, bloquear horário',
    ])
    expect(datas).toEqual([HOJE])
    expect(screen.getByRole('button', { name: 'Ir para hoje' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Adicionar ou gerenciar bloqueios' })).toHaveAttribute('href', '/bloqueios')
  })

  it('bloqueia um horário livre com motivo e recarrega a agenda', async () => {
    const datas = responderAgenda()
    let corpo: unknown
    servidor.use(
      http.post(`${API}/minha-agenda/bloqueios`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 'b2' }, { status: 201 })
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: '09:00 a 09:30: Livre, bloquear horário' }))
    const dialogo = screen.getByRole('dialog', { name: 'Bloquear horário' })
    await userEvent.type(within(dialogo).getByLabelText('Motivo (opcional)'), ' Almoço ')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar bloqueio' }))

    await vi.waitFor(() => expect(datas).toHaveLength(2))
    expect(corpo).toEqual({ data: HOJE, horaInicio: '09:00', horaFim: '09:30', motivo: 'Almoço' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('remove um bloqueio pelo detalhe do horário', async () => {
    responderAgenda()
    let removido: string | undefined
    servidor.use(
      http.delete(`${API}/minha-agenda/bloqueios/:id`, ({ params }) => {
        removido = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: /Bloqueado, almoço/ }))
    const dialogo = screen.getByRole('dialog', { name: 'Horário bloqueado' })
    expect(dialogo).toHaveTextContent('Motivo: almoço')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover bloqueio' }))

    await vi.waitFor(() => expect(removido).toBe('b1'))
  })

  it('mostra o atendimento agendado sem opção de bloqueio', async () => {
    responderAgenda()
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: /Ana, Corte/ }))

    const dialogo = screen.getByRole('dialog', { name: 'Atendimento agendado' })
    expect(dialogo).toHaveTextContent('09:30–10:30 · 09/11/2026')
    expect(dialogo).toHaveTextContent('Ana · Corte')
    expect(within(dialogo).queryByRole('button', { name: /bloqueio/ })).not.toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('avisa quando o horário foi ocupado antes de confirmar o bloqueio', async () => {
    const datas = responderAgenda()
    servidor.use(http.post(`${API}/minha-agenda/bloqueios`, () => HttpResponse.json({}, { status: 409 })))
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: '09:00 a 09:30: Livre, bloquear horário' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar bloqueio' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Este horário acabou de ser ocupado. A agenda foi atualizada.')
    await vi.waitFor(() => expect(datas).toHaveLength(2))
  })

  it('explica quando não há horário de atendimento no dia e lista os bloqueios', async () => {
    responderAgenda((data) => ({
      data,
      disponibilidades: [],
      agendamentos: [],
      bloqueios: [{ id: 'b1', data, horaInicio: null, horaFim: null, motivo: 'Folga' }],
    }))
    renderizar()

    expect(await screen.findByText('Sem horários de atendimento neste dia. Há bloqueios registrados abaixo.')).toHaveAttribute('role', 'status')
    expect(screen.getByRole('heading', { name: 'Bloqueios do dia' })).toBeInTheDocument()
    expect(screen.getByText('Dia inteiro · Folga')).toBeInTheDocument()
  })

  it('avisa quando o profissional não está vinculado a um estabelecimento', async () => {
    servidor.use(http.get(`${API}/minha-agenda`, () => HttpResponse.json({}, { status: 404 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Seu perfil profissional ainda não está vinculado a um estabelecimento.')
  })

  it('navega pelas semanas e pelos dias e volta para hoje', async () => {
    const datas = responderAgenda()
    renderizar()
    await screen.findByLabelText('Horários do dia')

    await userEvent.click(screen.getByRole('button', { name: 'Próxima semana' }))
    expect(await screen.findByRole('heading', { name: 'Minha agenda · 16 de novembro' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /qua\s*18/i }))
    expect(await screen.findByRole('heading', { name: 'Minha agenda · 18 de novembro' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ir para hoje' }))
    expect(await screen.findByRole('heading', { name: 'Minha agenda · Hoje' })).toBeInTheDocument()

    await vi.waitFor(() => expect(datas).toEqual([HOJE, '2026-11-16', '2026-11-18', HOJE]))
  })
})
