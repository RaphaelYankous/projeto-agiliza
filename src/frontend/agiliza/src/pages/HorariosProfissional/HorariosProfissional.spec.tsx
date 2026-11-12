import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { HorariosProfissional } from '.'

const SEGUNDA = { id: 'd1', diaSemana: 1, horaInicio: '09:00:00', horaFim: '12:00:00', ativo: true }
const DOMINGO = { id: 'd2', diaSemana: 0, horaInicio: '14:00:00', horaFim: '18:00:00', ativo: true }

function responderPerfil(status = 200) {
  servidor.use(
    http.get(`${API}/meu-perfil-profissional`, () =>
      status === 200
        ? HttpResponse.json({ nome: 'Ana', estabelecimento: 'Barbearia', horarioAbertura: '08:00:00', horarioFechamento: '19:00:00' })
        : HttpResponse.json({}, { status }),
    ),
  )
}

function responder(lista: object[] = [DOMINGO, SEGUNDA]) {
  responderPerfil()
  servidor.use(http.get(`${API}/minha-agenda/disponibilidades`, () => HttpResponse.json(lista)))
}

async function preencher(dia: string, inicio: string, fim: string) {
  await userEvent.selectOptions(screen.getByLabelText('Dia da semana'), dia)
  await userEvent.clear(screen.getByLabelText('Início'))
  await userEvent.type(screen.getByLabelText('Início'), inicio)
  await userEvent.clear(screen.getByLabelText('Fim'))
  await userEvent.type(screen.getByLabelText('Fim'), fim)
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }))
}

function contarEnvios() {
  const envios = { total: 0 }
  servidor.use(
    http.post(`${API}/minha-agenda/disponibilidades`, async ({ request }) => {
      envios.total += 1
      return HttpResponse.json({ id: `d${envios.total + 10}`, ativo: true, ...((await request.json()) as object) }, { status: 201 })
    }),
  )
  return envios
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/horarios" element={<HorariosProfissional />} />
      <Route path="/agenda" element={<PaginaAtual nome="Agenda" />} />
    </>,
    { rota: '/horarios' },
  )

const itensDaLista = () => within(screen.getByRole('list')).getAllByRole('listitem')
const diasDaLista = () => itensDaLista().map((item) => item.querySelector('strong')?.textContent)

describe('Minha disponibilidade', () => {
  it('lista os horários semanais do profissional com o dia e o intervalo', async () => {
    responder()
    renderizar()

    expect(screen.getByRole('heading', { level: 1, name: 'Minha disponibilidade' })).toBeInTheDocument()
    expect(screen.getByText('Carregando horários...')).toBeInTheDocument()
    await screen.findByRole('list')
    expect(itensDaLista().map((item) => item.textContent)).toEqual([
      'Domingo14:00 às 18:00Remover',
      'Segunda-feira09:00 às 12:00Remover',
    ])
  })

  it('avisa quando não há horário cadastrado', async () => {
    responder([])
    renderizar()

    expect(await screen.findByText('Nenhum horário semanal cadastrado.')).toBeInTheDocument()
  })

  it('mostra erro quando a lista não carrega', async () => {
    responderPerfil()
    servidor.use(http.get(`${API}/minha-agenda/disponibilidades`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os horários.')
  })

  it('adiciona um horário e mantém a lista em ordem de dia e início', async () => {
    let corpo: unknown
    responder([SEGUNDA])
    servidor.use(
      http.post(`${API}/minha-agenda/disponibilidades`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 'd3', ativo: true, ...(corpo as object) }, { status: 201 })
      }),
    )
    renderizar()
    await screen.findByRole('list')

    await userEvent.selectOptions(screen.getByLabelText('Dia da semana'), 'Domingo')
    await userEvent.clear(screen.getByLabelText('Início'))
    await userEvent.type(screen.getByLabelText('Início'), '13:00')
    await userEvent.clear(screen.getByLabelText('Fim'))
    await userEvent.type(screen.getByLabelText('Fim'), '17:30')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }))

    await screen.findByText('13:00 às 17:30')
    expect(corpo).toEqual({ diaSemana: 0, horaInicio: '13:00', horaFim: '17:30' })
    expect(diasDaLista()).toEqual(['Domingo', 'Segunda-feira'])
  })

  it('não envia horário com fim antes do início', async () => {
    let enviou = false
    responder([])
    servidor.use(
      http.post(`${API}/minha-agenda/disponibilidades`, () => {
        enviou = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    renderizar()
    await screen.findByText('Nenhum horário semanal cadastrado.')

    await userEvent.clear(screen.getByLabelText('Fim'))
    await userEvent.type(screen.getByLabelText('Fim'), '07:00')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }))

    expect(screen.getByRole('alert')).toHaveTextContent('O horário final precisa ser posterior ao horário inicial.')
    expect(enviou).toBe(false)
  })

  it('remove um horário da lista', async () => {
    let removido = ''
    responder()
    servidor.use(
      http.delete(`${API}/minha-agenda/disponibilidades/:id`, ({ params }) => {
        removido = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await screen.findByRole('list')

    await userEvent.click(within(itensDaLista()[0]).getByRole('button', { name: 'Remover' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Remover horário' })).getByRole('button', { name: 'Remover' }))

    await vi.waitFor(() => expect(diasDaLista()).toEqual(['Segunda-feira']))
    expect(removido).toBe('d2')
  })

  it('mostra erro e mantém o horário quando a remoção falha', async () => {
    responder()
    servidor.use(http.delete(`${API}/minha-agenda/disponibilidades/:id`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()
    await screen.findByRole('list')

    await userEvent.click(within(itensDaLista()[0]).getByRole('button', { name: 'Remover' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Remover horário' })).getByRole('button', { name: 'Remover' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível remover o horário.')
    expect(diasDaLista()).toEqual(['Domingo', 'Segunda-feira'])
  })

  it('volta para a agenda', async () => {
    responder([])
    renderizar()
    await screen.findByText('Nenhum horário semanal cadastrado.')

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByText('Agenda em /agenda')).toBeInTheDocument()
  })

  it('começa o formulário no funcionamento do estabelecimento', async () => {
    responder()
    renderizar()

    await screen.findByText('Funcionamento do estabelecimento: 08:00 às 19:00')
    expect(screen.getByLabelText('Início')).toHaveValue('08:00')
    expect(screen.getByLabelText('Fim')).toHaveValue('19:00')
  })

  it('mostra o funcionamento do estabelecimento como referência', async () => {
    responder()
    renderizar()

    expect(await screen.findByText('Funcionamento do estabelecimento: 08:00 às 19:00')).toBeInTheDocument()
  })

  it.each([
    ['07:30', '10:00', 'O horário precisa estar dentro do funcionamento do estabelecimento (08:00 às 19:00).'],
    ['11:00', '13:00', 'Este horário se sobrepõe a outro já cadastrado na segunda-feira (09:00 às 12:00).'],
  ])('não envia %s às %s e explica o motivo', async (inicio, fim, mensagem) => {
    responder([SEGUNDA])
    const envios = contarEnvios()
    renderizar()
    await screen.findByText('Funcionamento do estabelecimento: 08:00 às 19:00')

    await preencher('Segunda-feira', inicio, fim)

    expect(screen.getByRole('alert')).toHaveTextContent(mensagem)
    expect(envios.total).toBe(0)
  })

  it('aceita horário que só encosta em outro do mesmo dia', async () => {
    responder([SEGUNDA])
    const envios = contarEnvios()
    renderizar()
    await screen.findByText('Funcionamento do estabelecimento: 08:00 às 19:00')

    await preencher('Segunda-feira', '12:00', '18:00')

    await vi.waitFor(() => expect(envios.total).toBe(1))
  })

  it('mostra a mensagem do backend quando ele recusa o horário', async () => {
    responder([])
    servidor.use(
      http.post(`${API}/minha-agenda/disponibilidades`, () =>
        HttpResponse.json({ statusCode: 400, message: 'Mensagem vinda da API.' }, { status: 400 }),
      ),
    )
    renderizar()
    await screen.findByText('Nenhum horário semanal cadastrado.')

    await preencher('Terça-feira', '09:00', '10:00')

    expect(await screen.findByRole('alert')).toHaveTextContent('Mensagem vinda da API.')
  })

  it('continua funcionando sem o funcionamento quando o perfil não carrega', async () => {
    responderPerfil(500)
    servidor.use(http.get(`${API}/minha-agenda/disponibilidades`, () => HttpResponse.json([SEGUNDA])))
    renderizar()

    await screen.findByRole('list')
    expect(screen.queryByText(/Funcionamento do estabelecimento/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
