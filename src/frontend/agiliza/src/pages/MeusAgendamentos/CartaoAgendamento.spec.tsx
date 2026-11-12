import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { STATUS_AGENDAMENTO, type AgendamentoDoCliente } from '../../services/agendamentosService'
import { CartaoAgendamento } from './CartaoAgendamento'

const AGENDAMENTO: AgendamentoDoCliente = {
  id: 'a1',
  status: STATUS_AGENDAMENTO.CONCLUIDO,
  dataHoraInicio: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  dataHoraFim: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
  clienteId: 'cliente-1',
  servico: { id: 's1', nome: 'Corte' },
  profissional: { id: 'p1', nome: 'Carla', sobrenome: 'Mendes' },
  estabelecimento: { id: 'est-1', nome: 'Barbearia do Pedro', fotoAtualizadaEm: null },
}

describe('CartaoAgendamento', () => {
  it('mostra o profissional responsável', () => {
    render(<CartaoAgendamento agendamento={AGENDAMENTO} cancelavel={false} aoCancelar={() => {}} />)

    expect(screen.getByText('Profissional: Carla Mendes')).toBeInTheDocument()
  })

  it('cita o profissional no botão Avaliar', () => {
    render(<CartaoAgendamento agendamento={AGENDAMENTO} cancelavel={false} aoCancelar={() => {}} avaliavel aoAvaliar={() => {}} />)

    expect(
      screen.getByRole('button', { name: 'Avaliar atendimento de Corte com Carla Mendes em Barbearia do Pedro' }),
    ).toBeInTheDocument()
  })

  it('cita o profissional no selo Avaliado', () => {
    render(<CartaoAgendamento agendamento={AGENDAMENTO} cancelavel={false} aoCancelar={() => {}} notaAvaliacao={4} aoAvaliar={() => {}} />)

    expect(
      screen.getByRole('button', { name: 'Ver avaliação de Corte com Carla Mendes em Barbearia do Pedro: nota 4 de 5' }),
    ).toBeInTheDocument()
  })
})
