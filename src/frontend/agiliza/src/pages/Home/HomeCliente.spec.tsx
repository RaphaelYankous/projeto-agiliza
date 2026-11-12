import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { HomeCliente } from './HomeCliente'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, bounds }: { children: ReactNode; center?: unknown; zoom?: number; bounds?: unknown }) => (
    <div data-testid="mapa" data-centro={JSON.stringify(center ?? null)} data-zoom={zoom} data-limites={JSON.stringify(bounds ?? null)}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: ({ title, children }: { title?: string; children?: ReactNode }) => (
    <div data-testid="marcador" data-titulo={title ?? 'você'}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const ESTABELECIMENTOS = [
  { id: 'longe', nome: 'Salão Distante', endereco: 'Rua B', latitude: '-19.95', longitude: '-43.95', fotoAtualizadaEm: null },
  { id: 'perto', nome: 'Barbearia São José', endereco: 'Rua A', latitude: '-19.92', longitude: '-43.94', fotoAtualizadaEm: '2026-11-07T12:00:00.000Z' },
  { id: 'invalido', nome: 'Sem coordenada', endereco: 'Rua C', latitude: 'abc', longitude: null },
]

function responder({ estabelecimentos = ESTABELECIMENTOS }: { estabelecimentos?: object[] } = {}) {
  servidor.use(
    http.get(`${API}/estabelecimentos`, () => HttpResponse.json(estabelecimentos)),
    http.get(`${API}/estabelecimentos/:id/servicos/publicos`, ({ params }) =>
      params.id === 'perto'
        ? HttpResponse.json([{ nome: 'Corte' }, { nome: 'Barba' }, { nome: 'Sobrancelha' }, { nome: 'Pigmentação' }])
        : HttpResponse.json({}, { status: 500 }),
    ),
  )
}

function localizacao(resposta: { coords?: { latitude: number; longitude: number }; erro?: number }) {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      getCurrentPosition: (sucesso: PositionCallback, falha: PositionErrorCallback) =>
        resposta.coords
          ? sucesso({ coords: resposta.coords } as GeolocationPosition)
          : falha({ code: resposta.erro, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
    },
  })
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/" element={<HomeCliente />} />
      <Route path="/estabelecimentos/:id" element={<PaginaAtual nome="Detalhe" />} />
    </>,
  )
const nomesDosCartoes = () => screen.getAllByRole('heading', { level: 3 }).map((titulo) => titulo.textContent)

describe('Home do cliente', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sem localização no navegador, avisa e enquadra o mapa em todos os estabelecimentos', async () => {
    responder()
    renderizar()

    expect(await screen.findByText(/Este navegador não oferece localização/)).toBeInTheDocument()
    const mapa = await screen.findByTestId('mapa')
    expect(JSON.parse(mapa.dataset.limites!)).toEqual([[-19.95, -43.95], [-19.92, -43.94]])
    expect(within(mapa).getAllByTestId('marcador').map((m) => m.dataset.titulo)).toEqual(['Salão Distante', 'Barbearia São José'])
    expect(nomesDosCartoes()).toEqual(['Salão Distante', 'Barbearia São José'])
  })

  it('mostra até 3 serviços e a foto de cada estabelecimento', async () => {
    responder()
    renderizar()

    expect(await screen.findByText('Corte, Barba, Sobrancelha')).toBeInTheDocument()
    const cartao = screen.getByRole('heading', { name: 'Barbearia São José' }).closest('li')!
    expect(cartao.querySelector('img')).toHaveAttribute('src', expect.stringContaining('/estabelecimentos/perto/foto?v='))
  })

  it('abre a página do estabelecimento ao clicar no cartão', async () => {
    responder()
    renderizar()

    const link = await screen.findByRole('link', { name: /Barbearia São José/ })
    expect(link).toHaveAttribute('href', '/estabelecimentos/perto')
    await userEvent.click(link)

    expect(screen.getByText('Detalhe em /estabelecimentos/perto')).toBeInTheDocument()
  })

  it('com a localização, centraliza o mapa no usuário e ordena pelos mais próximos', async () => {
    localizacao({ coords: { latitude: -19.921, longitude: -43.941 } })
    responder()
    renderizar()

    const mapa = await screen.findByTestId('mapa')
    expect(JSON.parse(mapa.dataset.centro!)).toEqual([-19.921, -43.941])
    expect(within(mapa).getAllByTestId('marcador')[0].dataset.titulo).toBe('você')
    expect(nomesDosCartoes()).toEqual(['Barbearia São José', 'Salão Distante'])
    expect(await screen.findByText('0,2 km · Corte, Barba, Sobrancelha')).toBeInTheDocument()
    expect(screen.queryByText(/Mostrando a região/)).not.toBeInTheDocument()
  })

  it('explica quando a localização é negada ou demora demais', async () => {
    localizacao({ erro: 1 })
    responder()
    const { unmount } = renderizar()
    expect(await screen.findByText(/A permissão de localização foi negada neste navegador/)).toBeInTheDocument()
    unmount()

    localizacao({ erro: 3 })
    responder()
    renderizar()
    expect(await screen.findByText(/A localização demorou demais para responder/)).toBeInTheDocument()
  })

  it('filtra pelo nome sem diferenciar acentos e maiúsculas', async () => {
    responder()
    renderizar()
    await screen.findByTestId('mapa')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar serviço ou salão' }), 'SAO JOSE')
    expect(nomesDosCartoes()).toEqual(['Barbearia São José'])
    expect(screen.getAllByTestId('marcador')).toHaveLength(1)

    await userEvent.type(screen.getByRole('searchbox'), 'x')
    expect(screen.getByText('Nenhum estabelecimento encontrado para essa busca.')).toBeInTheDocument()
  })

  it('marca a categoria escolhida', async () => {
    responder()
    renderizar()

    expect(screen.getByRole('button', { name: 'Cabelo' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Unhas' }))
    expect(screen.getByRole('button', { name: 'Unhas' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Cabelo' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('avisa quando não há estabelecimentos ou quando a lista não carrega', async () => {
    responder({ estabelecimentos: [] })
    const { unmount } = renderizar()
    expect(await screen.findByText('Nenhum estabelecimento cadastrado ainda.')).toBeInTheDocument()
    unmount()

    servidor.use(http.get(`${API}/estabelecimentos`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os estabelecimentos.')
  })
})
