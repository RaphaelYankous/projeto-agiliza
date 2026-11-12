import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EstabelecimentoBusca } from '../../services/estabelecimentoService'
import { renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { Buscar } from '.'

function estabelecimento(dados: Partial<EstabelecimentoBusca>): EstabelecimentoBusca {
  return {
    id: 'est-1',
    nome: 'Barbearia do Pedro',
    endereco: 'Av. Afonso Pena, 1500',
    telefone: '31988881001',
    latitude: -19.92,
    longitude: -43.94,
    horarioAbertura: '09:00:00',
    horarioFechamento: '19:00:00',
    fidelidade: false,
    distanciaKm: null,
    avaliacaoMedia: null,
    totalAvaliacoes: 0,
    precoMinimo: null,
    fotoAtualizadaEm: null,
    ...dados,
  }
}

function responderBusca(lista: EstabelecimentoBusca[]) {
  const buscas: URLSearchParams[] = []
  servidor.use(
    http.get(`${API}/estabelecimentos/busca`, ({ request }) => {
      buscas.push(new URL(request.url).searchParams)
      return HttpResponse.json(lista)
    }),
  )
  return buscas
}

const renderizar = () => renderizarComRotas(<Route path="/buscar" element={<Buscar />} />, { rota: '/buscar' })

describe('Tela de busca', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('carrega os estabelecimentos ordenados por avaliação e mostra os dados de cada um', async () => {
    const buscas = responderBusca([
      estabelecimento({
        fidelidade: true,
        avaliacaoMedia: 4.5,
        totalAvaliacoes: 12,
        precoMinimo: 4500,
        distanciaKm: 2.46,
      }),
    ])
    renderizar()

    expect(screen.getByText('Buscando estabelecimentos…')).toBeInTheDocument()
    expect(await screen.findByText('1 estabelecimento(s) encontrado(s)')).toBeInTheDocument()

    const cartao = screen.getByRole('listitem')
    expect(within(cartao).getByRole('heading', { name: 'Barbearia do Pedro' })).toBeInTheDocument()
    expect(within(cartao).getByText('Fidelidade')).toBeInTheDocument()
    expect(within(cartao).getByText('4,5 (12)')).toBeInTheDocument()
    expect(within(cartao).getByText('2,5 km')).toBeInTheDocument()
    expect(within(cartao).getByText(/A partir de R\$\s45,00/)).toBeInTheDocument()
    expect(within(cartao).getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/estabelecimentos/est-1')
    expect(buscas[0].get('ordenarPor')).toBe('avaliacao')
    expect(buscas[0].has('nome')).toBe(false)
  })

  it('mostra textos padrão quando faltam nota e preço', async () => {
    responderBusca([estabelecimento({})])
    renderizar()

    expect(await screen.findByText('Sem avaliações')).toBeInTheDocument()
    expect(screen.getByText('Preço não informado')).toBeInTheDocument()
  })

  it('busca pelo nome digitado', async () => {
    const buscas = responderBusca([estabelecimento({})])
    renderizar()
    await screen.findByText('1 estabelecimento(s) encontrado(s)')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Nome da barbearia' }), 'pedro')

    await vi.waitFor(() => expect(buscas.at(-1)?.get('nome')).toBe('pedro'))
    expect(buscas).toHaveLength(2)
  })

  it('troca a ordenação pelos botões', async () => {
    const buscas = responderBusca([estabelecimento({})])
    renderizar()
    await screen.findByText('1 estabelecimento(s) encontrado(s)')

    await userEvent.click(screen.getByRole('button', { name: 'Preço' }))

    await vi.waitFor(() => expect(buscas.at(-1)?.get('ordenarPor')).toBe('preco'))
    expect(screen.getByRole('button', { name: 'Preço' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('avisa quando nenhum estabelecimento é encontrado', async () => {
    responderBusca([])
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Nenhuma barbearia encontrada' })).toBeInTheDocument()
    expect(screen.getByText('0 estabelecimento(s) encontrado(s)')).toBeInTheDocument()
  })

  it('mostra um alerta quando a busca falha', async () => {
    servidor.use(http.get(`${API}/estabelecimentos/busca`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a busca agora.')
    expect(screen.queryByRole('heading', { name: 'Nenhuma barbearia encontrada' })).not.toBeInTheDocument()
  })

  it('usa a localização do navegador para ordenar por distância', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (sucesso: PositionCallback) =>
          sucesso({ coords: { latitude: -19.9, longitude: -43.9 } } as GeolocationPosition),
      },
    })
    const buscas = responderBusca([estabelecimento({ distanciaKm: 0.35 })])
    renderizar()
    await screen.findByText('1 estabelecimento(s) encontrado(s)')

    await userEvent.click(screen.getByRole('button', { name: 'Usar minha localização' }))

    expect(await screen.findByText('Distâncias calculadas a partir de você')).toBeInTheDocument()
    await vi.waitFor(() => expect(buscas.at(-1)?.get('ordenarPor')).toBe('distancia'))
    expect(buscas.at(-1)?.get('lat')).toBe('-19.9')
    expect(buscas.at(-1)?.get('lng')).toBe('-43.9')
    expect(screen.getByText('350 m')).toBeInTheDocument()
  })

  it('explica quando o usuário nega a localização', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (_: PositionCallback, falha: PositionErrorCallback) =>
          falha({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
      },
    })
    responderBusca([])
    renderizar()

    await userEvent.click(screen.getByRole('button', { name: 'Usar minha localização' }))

    expect(screen.getByText(/Permissão de localização negada/)).toBeInTheDocument()
  })
})
