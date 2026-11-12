import { screen } from '@testing-library/react'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { criarToken } from '../../test/token'
import { Home } from '.'

vi.mock('./HomeCliente', () => ({ HomeCliente: () => <p>Home do cliente</p> }))

const renderizar = (perfil: string) =>
  renderizarComRotas(
    <>
      <Route path="/" element={<Home />} />
      <Route path="/gestor" element={<PaginaAtual nome="Painel" />} />
    </>,
    { token: criarToken({ perfil }) },
  )

describe('Início', () => {
  it('mostra a home do cliente para o cliente', () => {
    renderizar('cliente')

    expect(screen.getByText('Home do cliente')).toBeInTheDocument()
  })

  it('manda o gestor para o painel', () => {
    renderizar('gestor')

    expect(screen.getByText('Painel em /gestor como gestor')).toBeInTheDocument()
  })

  it('mostra ao profissional os atalhos do menu dele', () => {
    renderizar('profissional')

    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Agenda.*Veja seus horários do dia/ })).toHaveAttribute('href', '/agenda')
    expect(screen.getByRole('link', { name: /Bloqueios/ })).toHaveAttribute('href', '/bloqueios')
    expect(screen.queryByRole('link', { name: /Início/ })).not.toBeInTheDocument()
  })
})
