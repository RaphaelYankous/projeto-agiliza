import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PerfilGestor } from './PerfilGestor'
import * as gestorService from '../../services/gestorService'

vi.mock('../../contexts/FotoPerfilContext', () => ({
  useFotoPerfil: () => ({ foto: null, definirFoto: vi.fn() }),
}))

describe('PerfilGestor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve exibir mensagem de carregamento inicial', () => {
    vi.spyOn(gestorService, 'consultarPerfilGestor').mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <PerfilGestor />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/carregando perfil/i)
  })

  it('deve renderizar os dados do gestor ao carregar com sucesso', async () => {
    vi.spyOn(gestorService, 'consultarPerfilGestor').mockResolvedValue({
      id: 'uuid-gestor-1',
      usuarioId: 'uuid-gestor-1',
      nome: 'João',
      sobrenome: 'Gestor',
      email: 'joao.gestor@agiliza.com',
      telefone: '(11) 99999-8888',
      cpf: '123.456.789-00',
      perfil: 'gestor',
    })

    render(
      <MemoryRouter>
        <PerfilGestor />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /joão gestor/i })).toBeInTheDocument()
      expect(screen.getByText('joao.gestor@agiliza.com')).toBeInTheDocument()
      expect(screen.getByText('Gestor Agiliza')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /meus dados/i })).toHaveAttribute('href', '/gestor/meus-dados')
    expect(screen.getByRole('link', { name: /meus estabelecimentos/i })).toHaveAttribute('href', '/gestor')
  })

  it('deve exibir alerta de erro quando a requisição falhar', async () => {
    vi.spyOn(gestorService, 'consultarPerfilGestor').mockRejectedValue(new Error('Erro de conexão'))

    render(
      <MemoryRouter>
        <PerfilGestor />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar seu perfil/i)
    })
  })
})