import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CampoFoto } from './CampoFoto'

const foto = new File(['conteudo'], 'foto.png', { type: 'image/png' })

function renderizar(props: Partial<Parameters<typeof CampoFoto>[0]> = {}) {
  const aoEscolher = vi.fn()
  const aoRemover = vi.fn()
  render(
    <CampoFoto
      rotulo="Escolher foto"
      descricao="Prévia da foto"
      aoEscolher={aoEscolher}
      aoRemover={aoRemover}
      {...props}
    />,
  )
  return { aoEscolher, aoRemover }
}

describe('CampoFoto', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
  })

  it('sem foto, mostra a legenda padrão e nenhum botão de remover', () => {
    renderizar()

    expect(screen.getByText('Foto (opcional)')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeInTheDocument()
  })

  it('mostra a foto atual quando existe', () => {
    renderizar({ fotoAtual: 'http://api/foto.png' })

    expect(screen.getByRole('img', { name: 'Prévia da foto' })).toHaveAttribute('src', 'http://api/foto.png')
    expect(screen.queryByText('Foto (opcional)')).not.toBeInTheDocument()
  })

  it('entrega o arquivo escolhido para aoEscolher', async () => {
    const { aoEscolher } = renderizar()

    await userEvent.upload(screen.getByLabelText('Escolher foto', { selector: 'input' }), foto)

    expect(aoEscolher).toHaveBeenCalledWith(foto)
  })

  it('com arquivo novo e sem foto salva, mostra a prévia e o botão "Remover foto"', async () => {
    const { aoRemover } = renderizar({ arquivo: foto })

    expect(screen.getByRole('img', { name: 'Prévia da foto' })).toHaveAttribute('src', 'blob:previa')
    await userEvent.click(screen.getByRole('button', { name: 'Remover foto' }))
    expect(aoRemover).toHaveBeenCalledTimes(1)
  })

  it('com arquivo novo e foto salva, o botão vira "Manter foto atual"', () => {
    renderizar({ arquivo: foto, fotoAtual: 'http://api/foto.png' })

    expect(screen.getByRole('button', { name: 'Manter foto atual' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeInTheDocument()
  })

  it('mostra o erro como alerta e liga erro e dica ao botão', () => {
    renderizar({ erro: 'A foto deve ter no máximo 2 MB.', dica: 'Aparece nos cards.' })

    expect(screen.getByRole('alert')).toHaveTextContent('A foto deve ter no máximo 2 MB.')
    expect(screen.getByRole('button', { name: 'Escolher foto' })).toHaveAccessibleDescription(
      'A foto deve ter no máximo 2 MB. Aparece nos cards.',
    )
  })

  it('aceita uma legenda própria', () => {
    renderizar({ legenda: 'Foto principal (opcional)' })

    expect(screen.getByText('Foto principal (opcional)')).toBeInTheDocument()
  })
})
