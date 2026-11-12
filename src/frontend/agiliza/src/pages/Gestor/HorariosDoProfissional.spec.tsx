import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { HorariosDoProfissional } from './HorariosDoProfissional'

const ESTABELECIMENTO = { id: 'est-1', nome: 'Barbearia', horarioAbertura: '09:00:00', horarioFechamento: '19:00:00' }
const SEGUNDA = { id: 'd1', diaSemana: 1, horaInicio: '09:00:00', horaFim: '12:00:00', ativo: true }
const BRUNO = { id: 'p1', nome: 'Bruno', sobrenome: 'Carvalho', email: 'b@x.com', cpf: '1', telefone: '1', foto: null, servicos: [] }

function responder({
  estabelecimentos = [ESTABELECIMENTO] as object[],
  profissional = { status: 200, corpo: BRUNO as object },
  horarios = [SEGUNDA] as object[],
} = {}) {
  servidor.use(
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json(estabelecimentos)),
    http.get(`${API}/estabelecimentos/est-1/profissionais/p1`, () =>
      HttpResponse.json(profissional.corpo, { status: profissional.status }),
    ),
    http.get(`${API}/profissionais/p1/disponibilidades`, () => HttpResponse.json(horarios)),
  )
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/gestor/profissionais/:id/horarios" element={<HorariosDoProfissional />} />
      <Route path="/gestor/profissionais" element={<PaginaAtual nome="Profissionais" />} />
    </>,
    { rota: '/gestor/profissionais/p1/horarios' },
  )

async function preencher(dia: string, inicio: string, fim: string) {
  await userEvent.selectOptions(screen.getByLabelText('Dia da semana'), dia)
  await userEvent.clear(screen.getByLabelText('Início'))
  await userEvent.type(screen.getByLabelText('Início'), inicio)
  await userEvent.clear(screen.getByLabelText('Fim'))
  await userEvent.type(screen.getByLabelText('Fim'), fim)
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }))
}

const itens = () => within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)

describe('Horários do profissional (gestor)', () => {
  it('mostra o nome, o funcionamento do estabelecimento e os horários do profissional', async () => {
    responder()
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Bruno Carvalho' })).toBeInTheDocument()
    expect(screen.getByText('Funcionamento do estabelecimento: 09:00 às 19:00')).toBeInTheDocument()
    expect(screen.getByLabelText('Início')).toHaveValue('09:00')
    expect(screen.getByLabelText('Fim')).toHaveValue('19:00')
    expect(itens()).toEqual(['Segunda-feira09:00 às 12:00Remover'])
  })

  it('adiciona mais um horário no mesmo dia pela rota do gestor', async () => {
    let corpo: unknown
    responder()
    servidor.use(
      http.post(`${API}/profissionais/p1/disponibilidades`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 'd2', ativo: true, ...(corpo as object) }, { status: 201 })
      }),
    )
    renderizar()
    await screen.findByRole('heading', { name: 'Bruno Carvalho' })

    await preencher('Segunda-feira', '13:00', '18:00')

    await vi.waitFor(() =>
      expect(itens()).toEqual(['Segunda-feira09:00 às 12:00Remover', 'Segunda-feira13:00 às 18:00Remover']),
    )
    expect(corpo).toEqual({ diaSemana: 1, horaInicio: '13:00', horaFim: '18:00' })
  })

  it('não envia horário fora do funcionamento', async () => {
    let enviou = false
    responder()
    servidor.use(
      http.post(`${API}/profissionais/p1/disponibilidades`, () => {
        enviou = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    renderizar()
    await screen.findByRole('heading', { name: 'Bruno Carvalho' })

    await preencher('Terça-feira', '08:00', '10:00')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'O horário precisa estar dentro do funcionamento do estabelecimento (09:00 às 19:00).',
    )
    expect(enviou).toBe(false)
  })

  it('mostra a mensagem da API quando ela recusa o horário', async () => {
    responder({ horarios: [] })
    servidor.use(
      http.post(`${API}/profissionais/p1/disponibilidades`, () =>
        HttpResponse.json({ statusCode: 400, message: 'Mensagem vinda da API.' }, { status: 400 }),
      ),
    )
    renderizar()
    await screen.findByRole('heading', { name: 'Bruno Carvalho' })

    await preencher('Terça-feira', '10:00', '11:00')

    expect(await screen.findByRole('alert')).toHaveTextContent('Mensagem vinda da API.')
  })

  it('remove um horário pela rota do gestor', async () => {
    let removido = ''
    responder()
    servidor.use(
      http.delete(`${API}/disponibilidades/:id`, ({ params }) => {
        removido = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await screen.findByRole('heading', { name: 'Bruno Carvalho' })

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))
    expect(screen.getByRole('dialog', { name: 'Remover horário' })).toHaveTextContent(
      'Deseja remover o horário na segunda-feira, das 09:00 às 12:00?',
    )
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Remover horário' })).getByRole('button', { name: 'Remover' }))

    expect(await screen.findByText('Nenhum horário semanal cadastrado.')).toBeInTheDocument()
    expect(removido).toBe('d1')
  })

  it('mantém o horário e avisa quando a remoção falha', async () => {
    responder()
    servidor.use(http.delete(`${API}/disponibilidades/:id`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()
    await screen.findByRole('heading', { name: 'Bruno Carvalho' })

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Remover horário' })).getByRole('button', { name: 'Remover' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível remover o horário.')
    expect(itens()).toEqual(['Segunda-feira09:00 às 12:00Remover'])
  })

  it('não remove quando o gestor cancela a confirmação', async () => {
    let removeu = false
    responder()
    servidor.use(
      http.delete(`${API}/disponibilidades/:id`, () => {
        removeu = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await screen.findByRole('heading', { name: 'Bruno Carvalho' })

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(itens()).toEqual(['Segunda-feira09:00 às 12:00Remover'])
    expect(removeu).toBe(false)
  })

  it('avisa quando o profissional não é encontrado', async () => {
    responder({ profissional: { status: 404, corpo: { statusCode: 404, message: 'Profissional com ID p1 não encontrado.' } } })
    renderizar()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByLabelText('Dia da semana')).not.toBeInTheDocument()
  })

  it('pede um estabelecimento quando o gestor ainda não tem', async () => {
    responder({ estabelecimentos: [] })
    renderizar()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cadastre um estabelecimento antes de gerenciar os horários dos profissionais.',
    )
  })

  it('volta para a lista de profissionais', async () => {
    responder()
    renderizar()
    await screen.findByRole('heading', { name: 'Bruno Carvalho' })

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByText('Profissionais em /gestor/profissionais')).toBeInTheDocument()
  })
})
