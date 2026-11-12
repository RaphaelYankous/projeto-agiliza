import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('mostra um diálogo com o título e o conteúdo', () => {
    render(<Modal titulo="Excluir serviço" aoFechar={() => {}}>Tem certeza?</Modal>)

    const dialogo = screen.getByRole('dialog', { name: 'Excluir serviço' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Excluir serviço' })).toBeInTheDocument()
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument()
  })

  it('fecha com clique fora do diálogo, mas não com clique dentro', async () => {
    const aoFechar = vi.fn()
    render(<Modal titulo="Aviso" aoFechar={aoFechar}><p>Conteúdo</p></Modal>)

    await userEvent.click(screen.getByText('Conteúdo'))
    expect(aoFechar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('dialog').parentElement!)
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('não fecha com clique fora quando o fechamento está bloqueado', async () => {
    const aoFechar = vi.fn()
    render(<Modal titulo="Salvando" aoFechar={aoFechar} fechamentoBloqueado>…</Modal>)

    await userEvent.click(screen.getByRole('dialog').parentElement!)
    expect(aoFechar).not.toHaveBeenCalled()
  })

  it('vira um formulário quando recebe aoEnviar', async () => {
    const aoEnviar = vi.fn((evento: { preventDefault: () => void }) => evento.preventDefault())
    render(
      <Modal titulo="Editar nome" aoFechar={() => {}} aoEnviar={aoEnviar}>
        <button type="submit">Salvar</button>
      </Modal>,
    )

    expect(screen.getByRole('dialog').tagName).toBe('FORM')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(aoEnviar).toHaveBeenCalledTimes(1)
  })
})
