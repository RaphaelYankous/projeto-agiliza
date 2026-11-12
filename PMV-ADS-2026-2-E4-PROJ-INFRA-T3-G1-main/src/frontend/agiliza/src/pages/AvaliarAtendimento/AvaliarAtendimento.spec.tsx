import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import {
  STATUS_AGENDAMENTO,
  type AgendamentoDoCliente,
  type StatusAgendamento,
} from '../../services/agendamentosService'
import type { AvaliacaoDoCliente } from '../../services/avaliacoesService'
import { renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { AvaliarAtendimento } from '.'

function agendamento(status: StatusAgendamento): AgendamentoDoCliente {
  return {
    id: 'a1',
    status,
    dataHoraInicio: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    dataHoraFim: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    clienteId: 'cliente-1',
    servico: { id: 's1', nome: 'Corte' },
    profissional: { id: 'p1', nome: 'Carla', sobrenome: 'Mendes' },
    estabelecimento: { id: 'est-1', nome: 'Barbearia do Pedro', fotoAtualizadaEm: null },
  }
}

function responder(agendamentos: AgendamentoDoCliente[], avaliacoes: AvaliacaoDoCliente[] = []) {
  servidor.use(
    http.get(`${API}/agendamentos/meus`, () => HttpResponse.json(agendamentos)),
    http.get(`${API}/avaliacoes/cliente/minhas`, () => HttpResponse.json(avaliacoes)),
  )
}

const renderizar = () =>
  renderizarComRotas(<Route path="/cliente/agendamentos/:id/avaliar" element={<AvaliarAtendimento />} />, {
    rota: '/cliente/agendamentos/a1/avaliar',
  })

describe('Tela Avaliar atendimento', () => {
  it('mostra o profissional responsável no resumo do atendimento a avaliar', async () => {
    responder([agendamento(STATUS_AGENDAMENTO.CONCLUIDO)])
    renderizar()

    expect(await screen.findByText('Profissional: Carla Mendes')).toBeInTheDocument()
    expect(screen.getByText('Barbearia do Pedro')).toBeInTheDocument()
    expect(screen.getByText(/Corte •/)).toBeInTheDocument()
  })

  it('mostra o profissional também quando o atendimento já foi avaliado', async () => {
    responder(
      [agendamento(STATUS_AGENDAMENTO.CONCLUIDO)],
      [{ agendamentoId: 'a1', nota: 5, comentario: 'Ótimo!', temFoto: false }],
    )
    renderizar()

    expect(await screen.findByText('Profissional: Carla Mendes')).toBeInTheDocument()
    expect(screen.getByText('Este atendimento já foi avaliado')).toBeInTheDocument()
  })
})
