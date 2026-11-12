import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GaleriaFotos } from './GaleriaFotos'

const fotos = [
  { id: 'f1', criadaEm: '2026-11-01T10:00:00.000Z' },
  { id: 'f2', criadaEm: '2026-11-02T10:00:00.000Z' },
  { id: 'f3', criadaEm: '2026-11-03T10:00:00.000Z' },
]

describe('GaleriaFotos', () => {
  it('mostra as miniaturas na ordem recebida, com "Foto N de M"', () => {
    render(<GaleriaFotos idEstabelecimento="est-1" fotos={fotos} />)

    const imagens = screen.getAllByRole('img')
    expect(imagens.map((imagem) => imagem.getAttribute('alt'))).toEqual(['Foto 1 de 3', 'Foto 2 de 3', 'Foto 3 de 3'])
    expect(imagens[1]).toHaveAttribute('src', 'http://localhost:3000/api/estabelecimentos/est-1/fotos/f2')
    expect(imagens[1]).toHaveAttribute('loading', 'lazy')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('com aoRemover, cada foto tem um botão de remover que informa a foto e a posição', async () => {
    const aoRemover = vi.fn()
    render(<GaleriaFotos idEstabelecimento="est-1" fotos={fotos} aoRemover={aoRemover} />)

    await userEvent.click(screen.getByRole('button', { name: 'Remover foto 2' }))

    expect(aoRemover).toHaveBeenCalledWith(fotos[1], 2)
  })

  it('com aoAbrir, cada miniatura vira um botão que informa o índice', async () => {
    const aoAbrir = vi.fn()
    render(<GaleriaFotos idEstabelecimento="est-1" fotos={fotos} aoAbrir={aoAbrir} />)

    const botao = screen.getByRole('button', { name: 'Ampliar foto 3 de 3' })
    expect(within(botao).getByRole('presentation')).toHaveAttribute('alt', '')
    await userEvent.click(botao)

    expect(aoAbrir).toHaveBeenCalledWith(2)
  })
})
