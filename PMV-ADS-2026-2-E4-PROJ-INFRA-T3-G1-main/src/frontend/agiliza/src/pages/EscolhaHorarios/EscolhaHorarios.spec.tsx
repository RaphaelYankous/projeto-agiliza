import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { EscolhaHorarios } from '.'

const ROTA = '/cliente/horarios?estabelecimentoId=est-1&profissionalId=prof-1&servicoId=serv-1'

function responder({
  abertura = '09:00:00',
  fechamento = '19:00:00',
  horariosPorDia = { '2030-10-21': ['09:00', '10:30'] } as Record<string, string[]>,
} = {}) {
  servidor.use(
    http.get(`${API}/estabelecimentos/est-1`, () =>
      HttpResponse.json({ id: 'est-1', nome: 'Barbearia', horarioAbertura: abertura, horarioFechamento: fechamento }),
    ),
    http.get(`${API}/profissionais/prof-1/horarios-disponiveis`, ({ request }) => {
      const data = new URL(request.url).searchParams.get('data') ?? ''
      return HttpResponse.json(horariosPorDia[data] ?? [])
    }),
  )
}

const renderizar = (rota = ROTA) =>
  renderizarComRotas(
    <>
      <Route path="/cliente/horarios" element={<EscolhaHorarios />} />
      <Route path="/cliente/agendamentos" element={<PaginaAtual nome="Meus agendamentos" />} />
    </>,
    { rota },
  )

async function horariosDaGrade() {
  const grade = await screen.findByLabelText('Horários do dia')
  return within(grade).getAllByRole('button')
}

const rotulo = (botao: HTMLElement) => botao.querySelector('span')?.textContent

describe('Escolha de horários', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-10-21T07:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('monta a grade da abertura até o último início antes do fechamento', async () => {
    responder()
    renderizar()

    const botoes = await horariosDaGrade()

    expect(botoes).toHaveLength(20)
    expect(rotulo(botoes[0])).toBe('09:00')
    expect(rotulo(botoes[botoes.length - 1])).toBe('18:30')
  })

  it('começa no primeiro horário em hora cheia ou meia hora depois da abertura', async () => {
    responder({ abertura: '08:15:00', fechamento: '10:00:00', horariosPorDia: { '2030-10-21': ['09:00'] } })
    renderizar()

    const botoes = await horariosDaGrade()

    expect(botoes.map(rotulo)).toEqual(['08:30', '09:00', '09:30'])
  })

  it('mostra como indisponível o que não veio na lista e deixa escolher o que veio', async () => {
    responder()
    renderizar()

    const botoes = await horariosDaGrade()
    const nove = botoes.find((botao) => rotulo(botao) === '09:00')!
    const noveEMeia = botoes.find((botao) => rotulo(botao) === '09:30')!

    expect(noveEMeia).toBeDisabled()
    expect(noveEMeia).toHaveTextContent('indisp.')
    expect(nove).toBeEnabled()

    await userEvent.click(nove)
    expect(screen.getByRole('button', { name: 'Confirmar as 09:00' })).toBeEnabled()
  })

  it('mostra uma mensagem no lugar da grade quando o dia não tem horários', async () => {
    responder()
    renderizar()
    await horariosDaGrade()

    const dias = within(screen.getByLabelText('Escolha uma data')).getAllByRole('button')
    await userEvent.click(dias.find((botao) => botao.textContent?.endsWith('22'))!)

    expect(await screen.findByText('Não há horários disponíveis neste dia.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Horários do dia')).not.toBeInTheDocument()
  })

  it('pede a escolha de profissional e serviço quando falta o estabelecimento na URL', async () => {
    renderizar('/cliente/horarios?profissionalId=prof-1&servicoId=serv-1')

    expect(screen.getByText('Escolha um profissional e um serviço para ver os horários.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Horários do dia')).not.toBeInTheDocument()
  })

  async function escolherNoveHoras() {
    const botoes = await horariosDaGrade()
    await userEvent.click(botoes.find((botao) => rotulo(botao) === '09:00')!)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar as 09:00' }))
  }

  it('confirma o agendamento e leva para Meus agendamentos com o aviso de sucesso', async () => {
    let corpo: unknown
    responder()
    servidor.use(
      http.post(`${API}/agendamentos`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 'agend-1' }, { status: 201 })
      }),
    )
    renderizar()

    await escolherNoveHoras()

    expect(
      await screen.findByText('Meus agendamentos em /cliente/agendamentos com o aviso: Agendamento confirmado com sucesso.'),
    ).toBeInTheDocument()
    expect(corpo).toEqual({ profissionalId: 'prof-1', servicoId: 'serv-1', dataHoraInicio: '2030-10-21T09:00:00' })
  })

  it('mostra a mensagem do backend quando a confirmação é recusada e atualiza a grade', async () => {
    const horariosPorDia = { '2030-10-21': ['09:00', '10:30'] }
    responder({ horariosPorDia })
    servidor.use(
      http.post(`${API}/agendamentos`, () => {
        horariosPorDia['2030-10-21'] = ['10:30']
        return HttpResponse.json(
          { statusCode: 409, message: 'O horário selecionado não está mais disponível.' },
          { status: 409 },
        )
      }),
    )
    renderizar()

    await escolherNoveHoras()

    expect(await screen.findByRole('alert')).toHaveTextContent('O horário selecionado não está mais disponível.')
    await vi.waitFor(async () => {
      const nove = (await horariosDaGrade()).find((botao) => rotulo(botao) === '09:00')!
      expect(nove).toBeDisabled()
    })
    expect(screen.getByRole('button', { name: 'Selecione um horário' })).toBeDisabled()
  })

  it.each([
    [400, { message: 'O horário do agendamento deve estar no futuro.' }, 'O horário do agendamento deve estar no futuro.'],
    [404, { message: 'Serviço com ID serv-1 não encontrado.' }, 'Serviço com ID serv-1 não encontrado.'],
    [403, { message: 'Forbidden resource' }, 'Só clientes podem fazer agendamentos.'],
    [500, {}, 'Não foi possível confirmar o agendamento agora. Tente novamente em instantes.'],
  ])('com resposta %i mostra a mensagem certa', async (status, corpo, mensagem) => {
    responder()
    servidor.use(http.post(`${API}/agendamentos`, () => HttpResponse.json(corpo, { status })))
    renderizar()

    await escolherNoveHoras()

    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem)
  })
})
