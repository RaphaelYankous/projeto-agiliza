import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { Estabelecimento } from '.'

const DETALHE = {
  id: 'est-1',
  nome: 'Barbearia do Pedro',
  razaoSocial: 'Pedro LTDA',
  email: 'contato@barbearia.com',
  endereco: 'Av. Afonso Pena, 1500',
  latitude: -19.92,
  longitude: -43.94,
  telefone: '31988881001',
  descricao: 'Cortes clássicos.',
  fidelidade: true,
  redeSocial: ['https://instagram.com/barbearia', 'javascript:alert(1)'],
  horarioAbertura: '09:00:00',
  horarioFechamento: '19:00:00',
  fotoAtualizadaEm: '2026-11-07T12:00:00.000Z',
}

const FOTOS = [
  { id: 'f1', criadaEm: '2026-11-01T10:00:00.000Z' },
  { id: 'f2', criadaEm: '2026-11-02T10:00:00.000Z' },
  { id: 'f3', criadaEm: '2026-11-03T10:00:00.000Z' },
]

const SERVICO = { id: 'serv-1', nome: 'Corte', duracao: 30, preco: 4000 }
const BARBA = { id: 'serv-2', nome: 'Barba', duracao: 20, preco: 3000 }
const PROFISSIONAL = {
  id: 'prof-1',
  nome: 'Ângela',
  sobrenome: 'Ferreira',
  foto: null,
  servicos: [{ id: 'serv-1', nome: 'Corte' }],
  temHorarios: true,
}
const FOTO_PROFISSIONAL = 'data:image/png;base64,iVBORw0KGgo='
const BRUNO = {
  id: 'prof-2',
  nome: 'Bruno',
  sobrenome: 'Carvalho',
  foto: FOTO_PROFISSIONAL,
  servicos: [{ id: 'serv-1', nome: 'Corte' }, { id: 'serv-2', nome: 'Barba' }],
  temHorarios: true,
}
const CARLOS_SEM_HORARIO = {
  id: 'prof-3',
  nome: 'Carlos',
  sobrenome: 'Oliveira',
  foto: null,
  servicos: [{ id: 'serv-1', nome: 'Corte' }],
  temHorarios: false,
}

function responder({
  detalhe = DETALHE as object,
  fotos = FOTOS as object[],
  servicos = [] as object[],
  profissionais = [] as object[],
} = {}) {
  servidor.use(
    http.get(`${API}/estabelecimentos/est-1`, () => HttpResponse.json(detalhe)),
    http.get(`${API}/estabelecimentos/est-1/fotos`, () => HttpResponse.json(fotos)),
    http.get(`${API}/estabelecimentos/est-1/servicos/publicos`, () => HttpResponse.json(servicos)),
    http.get(`${API}/estabelecimentos/est-1/profissionais/publicos`, () => HttpResponse.json(profissionais)),
  )
}

function TelaDeHorarios() {
  const { pathname, search } = useLocation()
  return <p>Horários em {pathname + search}</p>
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/estabelecimentos/:id" element={<Estabelecimento />} />
      <Route path="/cliente/horarios" element={<TelaDeHorarios />} />
    </>,
    { rota: '/estabelecimentos/est-1' },
  )

describe('Detalhe do estabelecimento', () => {
  it('mostra a capa, os dados de contato e o selo de fidelidade', async () => {
    responder()
    renderizar()

    expect(screen.getByText('Carregando estabelecimento…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Barbearia do Pedro' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto de Barbearia do Pedro' })).toHaveAttribute(
      'src',
      expect.stringContaining('/estabelecimentos/est-1/foto?v='),
    )
    expect(screen.getByText('Programa de fidelidade')).toBeInTheDocument()
    expect(screen.getByText('Cortes clássicos.')).toBeInTheDocument()
    expect(screen.getByText('09:00 às 19:00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para a busca' })).toHaveAttribute('href', '/buscar')
  })

  it('só transforma em link as redes sociais com endereço http ou https', async () => {
    responder()
    renderizar()

    expect(await screen.findByRole('link', { name: 'https://instagram.com/barbearia' })).toHaveAttribute('target', '_blank')
    expect(screen.getByText('javascript:alert(1)').tagName).toBe('SPAN')
  })

  it('mostra a galeria e amplia a foto clicada, com contador e navegação', async () => {
    responder()
    renderizar()

    const secao = await screen.findByRole('region', { name: 'Fotos' })
    await userEvent.click(within(secao).getByRole('button', { name: 'Ampliar foto 2 de 3' }))

    expect(await screen.findByText('2 de 3')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto 2 de 3 de Barbearia do Pedro' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(await screen.findByText('3 de 3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(await screen.findByText('1 de 3')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    await vi.waitFor(() => expect(screen.queryByText('1 de 3')).not.toBeInTheDocument())
  })

  it('esconde a seção de fotos quando a galeria está vazia ou falha', async () => {
    responder({ fotos: [] })
    const { unmount } = renderizar()
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('region', { name: 'Fotos' })).not.toBeInTheDocument()
    unmount()

    responder()
    servidor.use(http.get(`${API}/estabelecimentos/est-1/fotos`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('region', { name: 'Fotos' })).not.toBeInTheDocument()
  })

  it('mostra a foto principal uma vez, depois do cabeçalho, sem a faixa de iniciais', async () => {
    responder()
    renderizar()

    const titulo = await screen.findByRole('heading', { level: 1, name: 'Barbearia do Pedro' })
    const fotos = screen.getAllByRole('img', { name: 'Foto de Barbearia do Pedro' })
    expect(fotos).toHaveLength(1)
    expect(titulo.compareDocumentPosition(fotos[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Cortes clássicos.').compareDocumentPosition(fotos[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('BA')).not.toBeInTheDocument()
  })

  it('sem foto principal não mostra imagem nem as iniciais do nome', async () => {
    responder({ detalhe: { ...DETALHE, fotoAtualizadaEm: null }, fotos: [] })
    renderizar()

    await screen.findByRole('heading', { level: 1, name: 'Barbearia do Pedro' })
    expect(screen.queryByRole('img', { name: 'Foto de Barbearia do Pedro' })).not.toBeInTheDocument()
    expect(screen.queryByText('BA')).not.toBeInTheDocument()
  })

  const servicoBotao = (nome: string) => screen.findByRole('button', { name: new RegExp(`^${nome}`) })
  const profissionalBotao = (nome: string) => screen.queryByRole('button', { name: nome })

  it('abre sem serviço escolhido, sem a seção de profissionais e com o agendamento desabilitado', async () => {
    responder({ servicos: [SERVICO, BARBA], profissionais: [PROFISSIONAL, BRUNO] })
    renderizar()

    expect(await servicoBotao('Corte')).toHaveAttribute('aria-pressed', 'false')
    expect(await servicoBotao('Barba')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('heading', { name: 'Escolha o profissional' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agendar horário' })).toBeDisabled()
  })

  it('ao escolher o serviço lista só quem presta o serviço e tem horário, sem ninguém marcado', async () => {
    responder({ servicos: [SERVICO, BARBA], profissionais: [PROFISSIONAL, BRUNO, CARLOS_SEM_HORARIO] })
    renderizar()

    await userEvent.click(await servicoBotao('Barba'))

    expect(await screen.findByRole('heading', { name: 'Escolha o profissional' })).toBeInTheDocument()
    await vi.waitFor(() => expect(profissionalBotao('Bruno Carvalho')).toBeInTheDocument())
    expect(profissionalBotao('Bruno Carvalho')).toHaveAttribute('aria-pressed', 'false')
    expect(profissionalBotao('Ângela Ferreira')).not.toBeInTheDocument()
    expect(profissionalBotao('Carlos Oliveira')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agendar horário' })).toBeDisabled()
  })

  it('mostra a foto ou a inicial e o nome em cada profissional', async () => {
    responder({ servicos: [SERVICO], profissionais: [PROFISSIONAL, BRUNO] })
    renderizar()

    await userEvent.click(await servicoBotao('Corte'))
    await vi.waitFor(() => expect(profissionalBotao('Ângela Ferreira')).toBeInTheDocument())

    expect(within(profissionalBotao('Bruno Carvalho')!).getByRole('presentation')).toHaveAttribute('src', FOTO_PROFISSIONAL)
    expect(profissionalBotao('Ângela Ferreira')).toHaveTextContent(/^ÂÂngela Ferreira$/)
  })

  it('ao trocar de serviço mantém quem presta os dois e limpa quem não presta', async () => {
    responder({ servicos: [SERVICO, BARBA], profissionais: [PROFISSIONAL, BRUNO] })
    renderizar()

    await userEvent.click(await servicoBotao('Corte'))
    await vi.waitFor(() => expect(profissionalBotao('Bruno Carvalho')).toBeInTheDocument())
    await userEvent.click(profissionalBotao('Bruno Carvalho')!)
    await userEvent.click(await servicoBotao('Barba'))
    expect(profissionalBotao('Bruno Carvalho')).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(await servicoBotao('Corte'))
    await userEvent.click(profissionalBotao('Ângela Ferreira')!)
    await userEvent.click(await servicoBotao('Barba'))
    expect(profissionalBotao('Ângela Ferreira')).not.toBeInTheDocument()
    expect(profissionalBotao('Bruno Carvalho')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Agendar horário' })).toBeDisabled()
  })

  it('avisa quando nenhum profissional atende o serviço escolhido', async () => {
    responder({ servicos: [SERVICO, BARBA], profissionais: [PROFISSIONAL] })
    renderizar()

    await userEvent.click(await servicoBotao('Barba'))

    expect(await screen.findByText('Nenhum profissional disponível para este serviço.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agendar horário' })).toBeDisabled()
  })

  it('leva o estabelecimento, o profissional e o serviço para a tela de horários', async () => {
    responder({ servicos: [SERVICO], profissionais: [PROFISSIONAL] })
    renderizar()

    await userEvent.click(await servicoBotao('Corte'))
    await vi.waitFor(() => expect(profissionalBotao('Ângela Ferreira')).toBeInTheDocument())
    await userEvent.click(profissionalBotao('Ângela Ferreira')!)
    const botao = screen.getByRole('button', { name: 'Agendar horário' })
    expect(botao).toBeEnabled()
    await userEvent.click(botao)

    expect(
      await screen.findByText('Horários em /cliente/horarios?estabelecimentoId=est-1&profissionalId=prof-1&servicoId=serv-1'),
    ).toBeInTheDocument()
  })

  it('mostra o erro e o link de volta quando o estabelecimento não carrega', async () => {
    responder()
    servidor.use(http.get(`${API}/estabelecimentos/est-1`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a busca agora.')
    expect(screen.getByRole('link', { name: 'Voltar para a busca' })).toBeInTheDocument()
  })
})
