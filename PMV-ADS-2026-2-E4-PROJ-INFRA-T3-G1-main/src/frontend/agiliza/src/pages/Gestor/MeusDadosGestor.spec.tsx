import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MeusDadosGestor } from './MeusDadosGestor'
import * as gestorService from '../../services/gestorService'

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../contexts/FotoPerfilContext', () => ({
  useFotoPerfil: () => ({ foto: null, definirFoto: vi.fn() }),
}))

describe('MeusDadosGestor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve carregar e preencher o formulário com os dados existentes do gestor', async () => {
    vi.spyOn(gestorService, 'consultarPerfilGestor').mockResolvedValue({
      id: 'uuid-gestor-1',
      usuarioId: 'uuid-gestor-1',
      nome: 'Carlos',
      sobrenome: 'Ferreira',
      email: 'carlos@agiliza.com',
      telefone: '(31) 98888-7777',
      cpf: '007.530.100-89',
      perfil: 'gestor',
    })

    vi.spyOn(gestorService, 'buscarGestor').mockResolvedValue({
      usuarioId: 'uuid-gestor-1',
      usuario: {
        id: 'uuid-gestor-1',
        nome: 'Carlos',
        sobrenome: 'Ferreira',
        email: 'carlos@agiliza.com',
        telefone: '(31) 98888-7777',
        cpf: '007.530.100-89',
        perfil: 'gestor',
      },
    })

    render(
      <MemoryRouter>
        <MeusDadosGestor />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Carlos')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Ferreira')).toBeInTheDocument()
      expect(screen.getByDisplayValue('carlos@agiliza.com')).toBeInTheDocument()
    })
  })

  it('deve salvar as alterações e redirecionar para a rota de perfil com state de sucesso', async () => {
    const user = userEvent.setup()

    vi.spyOn(gestorService, 'consultarPerfilGestor').mockResolvedValue({
      id: 'uuid-gestor-1',
      usuarioId: 'uuid-gestor-1',
      nome: 'Carlos',
      sobrenome: 'Ferreira',
      email: 'carlos@agiliza.com',
      telefone: '(31) 98888-7777',
      cpf: '007.530.100-89',
      perfil: 'gestor',
    })

    vi.spyOn(gestorService, 'buscarGestor').mockResolvedValue({
      usuarioId: 'uuid-gestor-1',
      usuario: {
        id: 'uuid-gestor-1',
        nome: 'Carlos',
        sobrenome: 'Ferreira',
        email: 'carlos@agiliza.com',
        telefone: '(31) 98888-7777',
        cpf: '007.530.100-89',
        perfil: 'gestor',
      },
    })

    const spyAtualizar = vi.spyOn(gestorService, 'atualizarGestor').mockResolvedValue({
      usuarioId: 'uuid-gestor-1',
      usuario: {
        id: 'uuid-gestor-1',
        nome: 'Carlos Editado',
        sobrenome: 'Ferreira',
        email: 'carlos@agiliza.com',
        telefone: '(31) 98888-7777',
        cpf: '007.530.100-89',
        perfil: 'gestor',
      },
    })

    render(
      <MemoryRouter>
        <MeusDadosGestor />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Carlos')).toBeInTheDocument()
    })

    const campoNome = screen.getByDisplayValue('Carlos')
    await user.clear(campoNome)
    await user.type(campoNome, 'Carlos Editado')

    const botaoSalvar = screen.getByRole('button', { name: /salvar alterações/i })
    await user.click(botaoSalvar)

    await waitFor(() => {
      expect(spyAtualizar).toHaveBeenCalledWith(
        'uuid-gestor-1',
        expect.objectContaining({ nome: 'Carlos Editado' }),
      )
      expect(mockNavigate).toHaveBeenCalledWith('/gestor/perfil', {
        state: {
          aviso: {
            tipo: 'success',
            mensagem: 'Dados de Carlos Editado Ferreira atualizados com sucesso.',
          },
        },
      })
    })
  })
})