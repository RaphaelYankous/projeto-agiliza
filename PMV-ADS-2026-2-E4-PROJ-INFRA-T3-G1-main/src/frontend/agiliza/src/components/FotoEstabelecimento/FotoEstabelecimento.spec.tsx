import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FotoEstabelecimento } from './FotoEstabelecimento'

describe('FotoEstabelecimento', () => {
  it('mostra a foto com a versão na URL, para o navegador não usar uma cópia antiga', () => {
    render(<FotoEstabelecimento id="est-1" nome="Barbearia" fotoAtualizadaEm="2026-11-07T12:00:00.000Z" />)

    const imagem = screen.getByRole('img', { name: 'Foto de Barbearia' })
    expect(imagem).toHaveAttribute(
      'src',
      `http://localhost:3000/api/estabelecimentos/est-1/foto?v=${Date.parse('2026-11-07T12:00:00.000Z')}`,
    )
  })

  it('sem foto, mostra o ícone padrão no lugar da imagem', () => {
    const { container } = render(<FotoEstabelecimento id="est-1" nome="Barbearia" fotoAtualizadaEm={null} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('volta para o ícone quando a imagem falha ao carregar', () => {
    const { container } = render(
      <FotoEstabelecimento id="est-1" nome="Barbearia" fotoAtualizadaEm="2026-11-07T12:00:00.000Z" />,
    )

    fireEvent.error(screen.getByRole('img'))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('aceita texto alternativo vazio quando o nome já aparece ao lado', () => {
    const { container } = render(
      <FotoEstabelecimento id="est-1" nome="Barbearia" fotoAtualizadaEm="2026-11-07T12:00:00.000Z" alt="" carregamento="lazy" />,
    )

    const imagem = container.querySelector('img')!
    expect(imagem).toHaveAttribute('alt', '')
    expect(imagem).toHaveAttribute('loading', 'lazy')
  })
})
