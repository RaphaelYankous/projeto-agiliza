import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { arquivoPng } from '../../test/dados'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { NovoProfissional } from '.'

function responder({ servicos = [{ id: 's1', nome: 'Corte' }, { id: 's2', nome: 'Barba' }] } = {}) {
  servidor.use(
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json([{ id: 'est-1', nome: 'Barbearia', horarioAbertura: '09:00:00', horarioFechamento: '19:00:00' }])),
    http.get(`${API}/estabelecimentos/est-1/servicos`, () => HttpResponse.json(servicos)),
  )
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/gestor/profissionais/novo" element={<NovoProfissional />} />
      <Route path="/gestor/profissionais" element={<PaginaAtual nome="Lista" />} />
      <Route path="/" element={<PaginaAtual nome="Início" />} />
    </>,
    { rota: '/gestor/profissionais/novo' },
  )

async function preencher() {
  await userEvent.type(screen.getByLabelText('Nome'), 'Carla')
  await userEvent.type(screen.getByLabelText('Sobrenome'), 'Mendes')
  await userEvent.type(screen.getByLabelText('E-mail'), 'carla@email.com')
  await userEvent.type(screen.getByLabelText('CPF'), '52998224725')
  await userEvent.type(screen.getByLabelText('Telefone'), '31988881001')
  await userEvent.type(screen.getByLabelText('Senha de acesso'), 'segredo1')
  await userEvent.click(screen.getByRole('button', { name: 'Barba' }))
}

const cadastrar = () => userEvent.click(screen.getByRole('button', { name: 'Cadastrar profissional' }))

async function adicionarHorario(dia: string, inicio: string, fim: string) {
  await userEvent.selectOptions(screen.getByLabelText('Dia da semana'), dia)
  await userEvent.clear(screen.getByLabelText('Início'))
  await userEvent.type(screen.getByLabelText('Início'), inicio)
  await userEvent.clear(screen.getByLabelText('Fim'))
  await userEvent.type(screen.getByLabelText('Fim'), fim)
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }))
}

const horariosDaLista = () =>
  within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)

function aceitarCadastro() {
  servidor.use(
    http.post(`${API}/estabelecimentos/est-1/profissionais`, () => HttpResponse.json({ id: 'p9' }, { status: 201 })),
  )
}

describe('Tela Novo profissional', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
  })

  it('mostra os erros de cada campo, incluindo a falta de serviço', async () => {
    responder()
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })

    await cadastrar()

    expect(screen.getAllByText('Campo obrigatório.')).toHaveLength(6)
    expect(screen.getByText('Selecione ao menos um serviço.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Serviços' })).toHaveAccessibleDescription('Selecione ao menos um serviço.')
  })

  it('leva a tela até o primeiro campo com erro', async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    responder()
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })

    await cadastrar()

    expect(screen.getByLabelText('Nome')).toHaveFocus()
    expect(rolar.mock.contexts[0]).toBe(screen.getByLabelText('Nome'))
  })

  it('leva a tela até os serviços quando só eles faltam', async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    responder()
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Barba' }))

    await cadastrar()

    expect(rolar.mock.contexts[0]).toBe(screen.getByRole('group', { name: 'Serviços' }))
  })

  it('leva a tela até o campo apontado pela API', async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    responder()
    servidor.use(
      http.post(`${API}/estabelecimentos/est-1/profissionais`, () =>
        HttpResponse.json({ message: 'Email já está em uso.' }, { status: 409 }),
      ),
    )
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })
    await preencher()

    await cadastrar()

    await vi.waitFor(() => expect(screen.getByLabelText('E-mail')).toHaveFocus())
    expect(rolar.mock.contexts.at(-1)).toBe(screen.getByLabelText('E-mail'))
  })

  it('cadastra o profissional com os dados limpos e volta para o início com o aviso', async () => {
    responder()
    let corpo: unknown
    servidor.use(
      http.post(`${API}/estabelecimentos/est-1/profissionais`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 'p9' }, { status: 201 })
      }),
    )
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })

    await preencher()
    expect(screen.getByRole('button', { name: 'Barba' })).toHaveAttribute('aria-pressed', 'true')
    await cadastrar()

    expect(await screen.findByText('Início em / com o aviso: Profissional Carla Mendes cadastrado com sucesso.')).toBeInTheDocument()
    expect(corpo).toEqual({
      nome: 'Carla',
      sobrenome: 'Mendes',
      email: 'carla@email.com',
      cpf: '52998224725',
      telefone: '31988881001',
      senha: 'segredo1',
      servicoIds: ['s2'],
    })
  })

  it('avisa quando o profissional foi cadastrado mas a foto falhou', async () => {
    responder()
    servidor.use(
      http.post(`${API}/estabelecimentos/est-1/profissionais`, () => HttpResponse.json({ id: 'p9' }, { status: 201 })),
      http.patch(`${API}/estabelecimentos/est-1/profissionais/p9/foto`, () => HttpResponse.json({}, { status: 500 })),
    )
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })

    await userEvent.upload(screen.getByLabelText('Escolher foto', { selector: 'input' }), arquivoPng())
    await preencher()
    await cadastrar()

    expect(await screen.findByText(/cadastrado com sucesso, mas a foto não foi salva/)).toBeInTheDocument()
  })

  it('mostra no campo de e-mail quando ele já está cadastrado', async () => {
    responder()
    servidor.use(
      http.post(`${API}/estabelecimentos/est-1/profissionais`, () =>
        HttpResponse.json({ message: 'Email já está em uso.' }, { status: 409 }),
      ),
    )
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })

    await preencher()
    await cadastrar()

    expect(await screen.findByText('Este e-mail já está cadastrado.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  it('desativa o cadastro quando o estabelecimento não tem serviços', async () => {
    responder({ servicos: [] })
    renderizar()

    expect(await screen.findByText('Nenhum serviço cadastrado no estabelecimento.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar profissional' })).toBeDisabled()
  })

  it('avisa quando os serviços não carregam', async () => {
    responder()
    servidor.use(http.get(`${API}/estabelecimentos/est-1/servicos`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os serviços do estabelecimento.')
  })

  it('volta para a lista ao cancelar', async () => {
    responder()
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('Lista em /gestor/profissionais')).toBeInTheDocument()
  })

  it('mostra a seção opcional de horários com o funcionamento do estabelecimento', async () => {
    responder()
    renderizar()

    const secao = await screen.findByRole('group', { name: 'Horários de atendimento (opcional)' })
    expect(secao).toHaveTextContent('Sem horário, o profissional não aparece para os clientes.')
    expect(within(secao).getByText('Funcionamento do estabelecimento: 09:00 às 19:00')).toBeInTheDocument()
    expect(screen.getByLabelText('Início')).toHaveValue('09:00')
    expect(screen.getByLabelText('Fim')).toHaveValue('19:00')
  })

  it('adiciona e remove horários da lista sem chamar a API e sem confirmação', async () => {
    responder()
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })

    await adicionarHorario('Segunda-feira', '09:00', '12:00')
    await adicionarHorario('Segunda-feira', '13:00', '18:00')
    expect(horariosDaLista()).toEqual(['Segunda-feira09:00 às 12:00Remover', 'Segunda-feira13:00 às 18:00Remover'])

    await userEvent.click(screen.getAllByRole('button', { name: 'Remover' })[0])

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(horariosDaLista()).toEqual(['Segunda-feira13:00 às 18:00Remover'])
  })

  it.each([
    ['08:00', '10:00', 'O horário precisa estar dentro do funcionamento do estabelecimento (09:00 às 19:00).'],
    ['11:00', '13:00', 'Este horário se sobrepõe a outro já cadastrado na segunda-feira (09:00 às 12:00).'],
  ])('recusa %s às %s na seção de horários', async (inicio, fim, mensagem) => {
    responder()
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })
    await adicionarHorario('Segunda-feira', '09:00', '12:00')

    await adicionarHorario('Segunda-feira', inicio, fim)

    expect(screen.getByRole('alert')).toHaveTextContent(mensagem)
    expect(horariosDaLista()).toHaveLength(1)
  })

  it('salva os horários no profissional criado depois do cadastro', async () => {
    const enviados: unknown[] = []
    responder()
    aceitarCadastro()
    servidor.use(
      http.post(`${API}/profissionais/p9/disponibilidades`, async ({ request }) => {
        enviados.push(await request.json())
        return HttpResponse.json({ id: `d${enviados.length}` }, { status: 201 })
      }),
    )
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })

    await preencher()
    await adicionarHorario('Terça-feira', '09:00', '12:00')
    await adicionarHorario('Segunda-feira', '13:00', '18:00')
    await cadastrar()

    expect(await screen.findByText('Início em / com o aviso: Profissional Carla Mendes cadastrado com sucesso.')).toBeInTheDocument()
    expect(enviados).toEqual([
      { diaSemana: 2, horaInicio: '09:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '13:00', horaFim: '18:00' },
    ])
  })

  it('avisa quando o profissional foi cadastrado mas um horário não foi salvo', async () => {
    let chamadas = 0
    responder()
    aceitarCadastro()
    servidor.use(
      http.post(`${API}/profissionais/p9/disponibilidades`, () => {
        chamadas += 1
        return chamadas === 1
          ? HttpResponse.json({ message: 'Recusado.' }, { status: 400 })
          : HttpResponse.json({ id: 'd2' }, { status: 201 })
      }),
    )
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })

    await preencher()
    await adicionarHorario('Segunda-feira', '09:00', '12:00')
    await adicionarHorario('Terça-feira', '09:00', '12:00')
    await cadastrar()

    expect(
      await screen.findByText(
        'Início em / com o aviso: Profissional Carla Mendes cadastrado com sucesso, mas 1 horário não foi salvo. Cadastre-os pelo botão Horários na lista de profissionais.',
      ),
    ).toBeInTheDocument()
    expect(chamadas).toBe(2)
  })

  it('junta a foto e os horários que não foram salvos no mesmo aviso', async () => {
    responder()
    aceitarCadastro()
    servidor.use(
      http.patch(`${API}/estabelecimentos/est-1/profissionais/p9/foto`, () => HttpResponse.json({}, { status: 500 })),
      http.post(`${API}/profissionais/p9/disponibilidades`, () => HttpResponse.json({}, { status: 500 })),
    )
    renderizar()
    await screen.findByRole('group', { name: 'Serviços' })

    await userEvent.upload(screen.getByLabelText('Escolher foto', { selector: 'input' }), arquivoPng())
    await preencher()
    await adicionarHorario('Segunda-feira', '09:00', '12:00')
    await adicionarHorario('Terça-feira', '09:00', '12:00')
    await cadastrar()

    expect(
      await screen.findByText(
        'Início em / com o aviso: Profissional Carla Mendes cadastrado com sucesso, mas a foto e 2 horários não foram salvos. Envie a foto pela edição do profissional e cadastre os horários pelo botão Horários na lista de profissionais.',
      ),
    ).toBeInTheDocument()
  })
})
