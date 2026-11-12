import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  STATUS_AGENDAMENTO,
  type AgendamentoDoCliente,
  type StatusAgendamento,
} from '../../services/agendamentosService'
import { renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { MeusAgendamentos } from '.'

const DIA = 24 * 60 * 60 * 1000

function agendamento(id: string, servico: string, status: StatusAgendamento, diasAPartirDeHoje: number): AgendamentoDoCliente {
  const inicio = new Date(Date.now() + diasAPartirDeHoje * DIA)
  return {
    id,
    status,
    dataHoraInicio: inicio.toISOString(),
    dataHoraFim: new Date(inicio.getTime() + 30 * 60 * 1000).toISOString(),
    clienteId: 'cliente-1',
    servico: { id: `s-${id}`, nome: servico },
    profissional: { id: 'p1', nome: 'Carla', sobrenome: 'Mendes' },
    estabelecimento: { id: 'est-1', nome: 'Barbearia do Pedro', fotoAtualizadaEm: null },
  }
}

const LISTA = [
  agendamento('a1', 'Barba', STATUS_AGENDAMENTO.CONFIRMADO, 5),
  agendamento('a2', 'Corte', STATUS_AGENDAMENTO.PENDENTE, 2),
  agendamento('a3', 'Sobrancelha', STATUS_AGENDAMENTO.CONCLUIDO, -3),
  agendamento('a4', 'Hidratação', STATUS_AGENDAMENTO.CANCELADO, -1),
]

function responderLista(lista: AgendamentoDoCliente[]) {
  servidor.use(http.get(`${API}/agendamentos/meus`, () => HttpResponse.json(lista)))
}

const renderizar = () =>
  renderizarComRotas(<Route path="/cliente/agendamentos" element={<MeusAgendamentos />} />, {
    rota: '/cliente/agendamentos',
  })

const servicosNaLista = () =>
  within(screen.getByRole('list'))
    .getAllByRole('heading', { level: 2 })
    .map((titulo) => titulo.parentElement!.querySelector('p:last-child')!.textContent)

describe('Tela Meus agendamentos', () => {
  beforeEach(() => {
    servidor.use(http.get(`${API}/avaliacoes/cliente/minhas`, () => HttpResponse.json([])))
  })

  it('mostra os próximos agendamentos do mais perto para o mais longe', async () => {
    responderLista(LISTA)
    renderizar()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando agendamentos…')
    await screen.findByRole('list')

    expect(servicosNaLista()).toEqual(['Corte', 'Barba'])
    expect(screen.getByText('pendente')).toBeInTheDocument()
    expect(screen.getByText('confirmado')).toBeInTheDocument()
  })

  it('mostra no histórico os concluídos e cancelados, do mais recente para o mais antigo', async () => {
    responderLista(LISTA)
    renderizar()
    await screen.findByRole('list')

    await userEvent.click(screen.getByRole('radio', { name: 'Histórico' }))

    expect(servicosNaLista()).toEqual(['Hidratação', 'Sobrancelha'])
    expect(screen.queryByRole('button', { name: /Cancelar agendamento de/ })).not.toBeInTheDocument()
  })

  it('mostra a mensagem de lista vazia em cada aba', async () => {
    responderLista([])
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Nenhum agendamento próximo' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Histórico' }))
    expect(screen.getByRole('heading', { name: 'Nenhum agendamento no histórico' })).toBeInTheDocument()
  })

  it('mostra um alerta quando a lista não carrega', async () => {
    servidor.use(http.get(`${API}/agendamentos/meus`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar seus agendamentos.')
  })

  it('cancela um agendamento depois da confirmação e o move para o histórico', async () => {
    responderLista(LISTA)
    let cancelado: string | undefined
    servidor.use(
      http.delete(`${API}/agendamentos/:id`, ({ params }) => {
        cancelado = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await screen.findByRole('list')

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar agendamento de Corte em Barbearia do Pedro' }))
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar agendamento' })
    expect(dialogo).toHaveTextContent('Deseja cancelar Corte em Barbearia do Pedro')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar agendamento' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Agendamento cancelado com sucesso.')
    expect(cancelado).toBe('a2')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(servicosNaLista()).toEqual(['Barba'])

    await userEvent.click(screen.getByRole('radio', { name: 'Histórico' }))
    expect(servicosNaLista()).toContain('Corte')
  })

  it('mantém o agendamento quando o usuário desiste no diálogo', async () => {
    responderLista(LISTA)
    renderizar()
    await screen.findByRole('list')

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar agendamento de Barba em Barbearia do Pedro' }))
    await userEvent.click(screen.getByRole('button', { name: 'Manter agendamento' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(servicosNaLista()).toEqual(['Corte', 'Barba'])
  })

  it('mostra no diálogo o motivo quando a API recusa o cancelamento', async () => {
    responderLista(LISTA)
    servidor.use(
      http.delete(`${API}/agendamentos/:id`, () =>
        HttpResponse.json({ message: 'Cancelamento permitido até 2 horas antes.' }, { status: 409 }),
      ),
    )
    renderizar()
    await screen.findByRole('list')

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar agendamento de Corte em Barbearia do Pedro' }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar agendamento' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Cancelamento permitido até 2 horas antes.')
    expect(servicosNaLista()).toEqual(['Corte', 'Barba'])
  })
})
