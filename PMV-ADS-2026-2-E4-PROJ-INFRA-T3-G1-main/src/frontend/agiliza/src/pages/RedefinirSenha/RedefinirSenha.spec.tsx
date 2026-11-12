import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedefinirSenha } from './index';
import * as authService from '../../services/authService';

const mockNavigate = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof authService>();
  return {
    ...actual,
    redefinirSenha: vi.fn(),
  };
});

const renderComponent = (rota = '/redefinir-senha?token=token-teste-123') =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <RedefinirSenha />
    </MemoryRouter>
  );

describe('Tela de Redefinir Senha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve indicar link incompleto quando o parâmetro token não estiver na URL', () => {
    renderComponent('/redefinir-senha');
    expect(
      screen.getByText(/link de recuperação inválido ou incompleto/i)
    ).toBeInTheDocument();
  });

  it('deve alertar quando as senhas informadas forem divergentes', async () => {
    renderComponent();
    const inputSenha = screen.getByLabelText(/^nova senha/i);
    const inputConfirmacao = screen.getByLabelText(/^confirmar nova senha/i);
    const botaoSalvar = screen.getByRole('button', { name: /salvar nova senha/i });

    fireEvent.change(inputSenha, { target: { value: 'Senha@123' } });
    fireEvent.change(inputConfirmacao, { target: { value: 'Outra@456' } });
    fireEvent.click(botaoSalvar);

    await waitFor(() => {
      expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    });
  });

  it('deve alertar quando a nova senha tiver menos de 6 caracteres', async () => {
    renderComponent();
    const inputSenha = screen.getByLabelText(/^nova senha/i);
    const inputConfirmacao = screen.getByLabelText(/^confirmar nova senha/i);
    const botaoSalvar = screen.getByRole('button', { name: /salvar nova senha/i });

    fireEvent.change(inputSenha, { target: { value: '12345' } });
    fireEvent.change(inputConfirmacao, { target: { value: '12345' } });
    fireEvent.click(botaoSalvar);

    await waitFor(() => {
      expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();
    });
  });

  it('deve submeter a nova senha com êxito e redirecionar para o login', async () => {
    vi.mocked(authService.redefinirSenha).mockResolvedValueOnce(undefined as never);

    renderComponent();
    const inputSenha = screen.getByLabelText(/^nova senha/i);
    const inputConfirmacao = screen.getByLabelText(/^confirmar nova senha/i);
    const botaoSalvar = screen.getByRole('button', { name: /salvar nova senha/i });

    fireEvent.change(inputSenha, { target: { value: 'NovaSenha@2026' } });
    fireEvent.change(inputConfirmacao, { target: { value: 'NovaSenha@2026' } });
    fireEvent.click(botaoSalvar);

    await waitFor(() => {
      expect(authService.redefinirSenha).toHaveBeenCalledWith('token-teste-123', 'NovaSenha@2026');
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { senhaRedefinida: true },
        replace: true,
      });
    });
  });

  it('deve exibir mensagem de erro amigável quando o serviço retornar erro', async () => {
    vi.mocked(authService.redefinirSenha).mockRejectedValueOnce(
      new Error('Falha ao redefinir a senha')
    );

    renderComponent();
    const inputSenha = screen.getByLabelText(/^nova senha/i);
    const inputConfirmacao = screen.getByLabelText(/^confirmar nova senha/i);
    const botaoSalvar = screen.getByRole('button', { name: /salvar nova senha/i });

    fireEvent.change(inputSenha, { target: { value: 'NovaSenha@2026' } });
    fireEvent.change(inputConfirmacao, { target: { value: 'NovaSenha@2026' } });
    fireEvent.click(botaoSalvar);

    await waitFor(() => {
      expect(
        screen.getByText(/ocorreu um erro ao redefinir a senha/i)
      ).toBeInTheDocument();
    });
  });
});