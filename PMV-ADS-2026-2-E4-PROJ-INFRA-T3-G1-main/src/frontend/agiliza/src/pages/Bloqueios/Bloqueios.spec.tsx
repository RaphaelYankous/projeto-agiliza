import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Bloqueio } from '../../services/agendaProfissionalService'
import { renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { Bloqueios } from './Bloqueios'

const ALMOCO: Bloqueio = { id: 'b1', data: '2026-11-10', horaInicio: '12:00:00', horaFim: '13:00:00', motivo: 'almoço' }
const FOLGA: Bloqueio = { id: 'b2', data: '2026-11-12', horaInicio: null, horaFim: null, motivo: null }

function responderLista(lista: Bloqueio[] = [FOLGA, ALMOCO]) {
  servidor.use(http.get(`${API}/minha-agenda/bloqueios`, () => HttpResponse.json(lista)))
}

const renderizar = () => renderizarComRotas(<Route path="/bloqueios" element={<Bloqueios />} />, { rota: '/bloqueios' })

describe('Tela Bloqueios', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 9, 8, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('lista os bloqueios registrados com data, período e motivo', async () => {
    responderLista()
    renderizar()

    const itens = await screen.findAllByRole('listitem')
    expect(itens[0]).toHaveTextContent('12/11/2026Dia inteiro')
    expect(itens[1]).toHaveTextContent('10/11/202612:00–13:00Motivo: almoço')
    expect(screen.getByLabelText('Data')).toHaveValue('2026-11-09')
  })

  it('mostra a mensagem de lista vazia', async () => {
    responderLista([])
    renderizar()

    expect(await screen.findByText('Nenhum bloqueio registrado.')).toBeInTheDocument()
  })

  it('registra um bloqueio com horário e motivo', async () => {
    responderLista([])
    let corpo: unknown
    servidor.use(
      http.post(`${API}/minha-agenda/bloqueios`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 'b3', data: '2026-11-09', horaInicio: '14:00:00', horaFim: '15:30:00', motivo: 'consulta' })
      }),
    )
    renderizar()
    await screen.findByText('Nenhum bloqueio registrado.')

    await userEvent.clear(screen.getByLabelText('Início'))
    await userEvent.type(screen.getByLabelText('Início'), '14:00')
    await userEvent.clear(screen.getByLabelText('Fim'))
    await userEvent.type(screen.getByLabelText('Fim'), '15:30')
    await userEvent.type(screen.getByLabelText('Motivo'), ' consulta ')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar bloqueio' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Bloqueio registrado. Ele também aparece na agenda do dia.')
    expect(corpo).toEqual({ data: '2026-11-09', horaInicio: '14:00', horaFim: '15:30', motivo: 'consulta' })
    expect(screen.getByRole('listitem')).toHaveTextContent('14:00–15:30')
    expect(screen.getByLabelText('Motivo')).toHaveValue('')
  })

  it('registra o dia inteiro sem horários', async () => {
    responderLista([])
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${API}/minha-agenda/bloqueios`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: 'b3', data: '2026-11-09', horaInicio: null, horaFim: null, motivo: null })
      }),
    )
    renderizar()
    await screen.findByText('Nenhum bloqueio registrado.')

    await userEvent.click(screen.getByRole('checkbox', { name: 'Bloquear o dia inteiro' }))
    expect(screen.queryByLabelText('Início')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar bloqueio' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent('Dia inteiro')
    expect(corpo).toEqual({ data: '2026-11-09', motivo: '' })
  })

  it('recusa um período com fim antes do início', async () => {
    responderLista([])
    renderizar()
    await screen.findByText('Nenhum bloqueio registrado.')

    await userEvent.clear(screen.getByLabelText('Fim'))
    await userEvent.type(screen.getByLabelText('Fim'), '08:00')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar bloqueio' }))

    expect(screen.getByRole('alert')).toHaveTextContent('O horário final precisa ser posterior ao inicial.')
  })

  it('mostra o conflito com um agendamento existente', async () => {
    responderLista([])
    servidor.use(http.post(`${API}/minha-agenda/bloqueios`, () => HttpResponse.json({}, { status: 409 })))
    renderizar()
    await screen.findByText('Nenhum bloqueio registrado.')

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar bloqueio' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um agendamento ou bloqueio neste período.')
  })

  it('remove um bloqueio depois da confirmação do navegador', async () => {
    responderLista()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    let removido: string | undefined
    servidor.use(
      http.delete(`${API}/minha-agenda/bloqueios/:id`, ({ params }) => {
        removido = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir bloqueio de 2026-11-10' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Bloqueio removido.')
    expect(removido).toBe('b1')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('não remove quando o usuário cancela a confirmação', async () => {
    responderLista()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir bloqueio de 2026-11-10' }))

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('permite tentar de novo quando a lista não carrega', async () => {
    servidor.use(http.get(`${API}/minha-agenda/bloqueios`, () => HttpResponse.json({}, { status: 404 }), { once: true }))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Sua conta ainda não está vinculada a um profissional.')
    responderLista([ALMOCO])
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent('Motivo: almoço')
    expect(within(screen.getByRole('listitem')).getByRole('button', { name: 'Excluir bloqueio de 2026-11-10' })).toBeEnabled()
  })
})
