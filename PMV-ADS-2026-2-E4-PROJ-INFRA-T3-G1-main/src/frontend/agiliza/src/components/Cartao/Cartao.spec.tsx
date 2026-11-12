import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Cartao } from '.'

describe('Cartao', () => {
  it('mostra mídia, título, conteúdo e rodapé num article', () => {
    render(
      <Cartao midia={<span>ícone</span>} titulo="Corte" rodape={<button type="button">Editar</button>}>
        <p>R$ 45,00</p>
      </Cartao>,
    )

    const cartao = screen.getByRole('article')
    expect(cartao).toHaveTextContent('ícone')
    expect(screen.getByRole('heading', { level: 2, name: 'Corte' })).toBeInTheDocument()
    expect(screen.getByText('R$ 45,00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  it('vira um botão selecionável quando recebe aoSelecionar', async () => {
    const aoSelecionar = vi.fn()
    const { rerender } = render(<Cartao midia={<span aria-hidden="true">A</span>} titulo="Ângela Ferreira" aoSelecionar={aoSelecionar} />)

    const botao = screen.getByRole('button', { name: 'Ângela Ferreira' })
    expect(botao).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()

    await userEvent.click(botao)
    expect(aoSelecionar).toHaveBeenCalledTimes(1)

    rerender(<Cartao midia={<span aria-hidden="true">A</span>} titulo="Ângela Ferreira" aoSelecionar={aoSelecionar} selecionado />)
    expect(screen.getByRole('button', { name: 'Ângela Ferreira' })).toHaveAttribute('aria-pressed', 'true')
  })
})
