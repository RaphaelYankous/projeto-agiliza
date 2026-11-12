import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { FotoPerfilProvider } from '../../contexts/FotoPerfilProvider'
import { renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { criarToken } from '../../test/token'
import { PerfilCliente } from './PerfilCliente'

function responder({ foto = null as string | null, fidelidade = { pontos: 120, meta: 200 } as object } = {}) {
  servidor.use(
    http.get(`${API}/usuarios/me/foto`, () => HttpResponse.json({ foto })),
    http.get(`${API}/meu-perfil-cliente`, () => HttpResponse.json({ nome: 'João', sobrenome: 'Silva', email: 'joao@email.com' })),
    http.get(`${API}/meu-perfil-cliente/fidelidade`, () => HttpResponse.json(fidelidade)),
  )
}

const renderizar = () =>
  renderizarComRotas(
    <Route path="/cliente/perfil" element={<FotoPerfilProvider><PerfilCliente /></FotoPerfilProvider>} />,
    { rota: '/cliente/perfil', token: criarToken({ perfil: 'cliente', email: 'joao@email.com' }) },
  )

describe('Perfil do cliente', () => {
  it('mostra nome, e-mail e os pontos de fidelidade com a barra de progresso', async () => {
    responder()
    renderizar()

    expect(await screen.findByRole('heading', { name: 'João Silva' })).toBeInTheDocument()
    expect(screen.getByText('joao@email.com')).toBeInTheDocument()
    expect(await screen.findByText('120 pts')).toBeInTheDocument()
    expect(screen.getByText('Faltam 80 pts para o próximo resgate')).toBeInTheDocument()
    const barra = screen.getByRole('progressbar', { name: 'Progresso para o próximo resgate' })
    expect(barra).toHaveAttribute('aria-valuenow', '120')
    expect(barra).toHaveAttribute('aria-valuemax', '200')
  })

  it('mostra a foto do menu quando o cliente tem uma', async () => {
    responder({ foto: 'data:image/png;base64,AAA' })
    renderizar()

    expect(await screen.findByRole('img', { name: 'Sua foto de perfil' })).toHaveAttribute('src', 'data:image/png;base64,AAA')
  })

  it('avisa quando os pontos já podem ser resgatados', async () => {
    responder({ fidelidade: { pontos: 250, meta: 200 } })
    renderizar()

    expect(await screen.findByText('Você já pode resgatar seus pontos')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '200')
  })

  it('sem meta de resgate, mostra só os pontos', async () => {
    responder({ fidelidade: { pontos: 30, meta: null } })
    renderizar()

    expect(await screen.findByText('30 pts')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('avisa quando o perfil ou os pontos não carregam', async () => {
    responder()
    servidor.use(
      http.get(`${API}/meu-perfil-cliente`, () => HttpResponse.json({}, { status: 500 })),
      http.get(`${API}/meu-perfil-cliente/fidelidade`, () => HttpResponse.json({}, { status: 500 })),
    )
    renderizar()

    expect(await screen.findByText('Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.')).toBeInTheDocument()
    expect(await screen.findByText('Não foi possível carregar seus pontos.')).toBeInTheDocument()
  })
})
