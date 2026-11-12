import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecuperarSenha } from './index';
import * as authService from '../../services/authService';

vi.mock('../../services/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof authService>();
  return {
    ...actual,
    solicitarRecuperacaoSenha: vi.fn(),
  };
});

const renderComponent = () =>
  render(
    <MemoryRouter>
      <RecuperarSenha />
    </MemoryRouter>
  );

describe('Tela de Recuperar Senha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar os campos do formulário e o link de retorno ao login', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /recuperar senha/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/seuemail@exemplo.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar link de recuperação/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar para o login/i })).toBeInTheDocument();
  });

  it('deve exibir erro de validação ao tentar submeter e-mail vazio ou inválido', async () => {
    renderComponent();
    const botaoEnviar = screen.getByRole('button', { name: /enviar link de recuperação/i });
    fireEvent.click(botaoEnviar);

    await waitFor(() => {
      const inputEmail = screen.getByPlaceholderText(/seuemail@exemplo.com/i);
      expect(inputEmail).toBeInTheDocument();
    });
  });

  it('deve exibir mensagem de sucesso ao submeter e-mail válido', async () => {
    vi.mocked(authService.solicitarRecuperacaoSenha).mockResolvedValueOnce();

    renderComponent();
    const inputEmail = screen.getByPlaceholderText(/seuemail@exemplo.com/i);
    const botaoEnviar = screen.getByRole('button', { name: /enviar link de recuperação/i });

    fireEvent.change(inputEmail, { target: { value: 'teste@exemplo.com' } });
    fireEvent.click(botaoEnviar);

    await waitFor(() => {
      expect(
        screen.getByText(/se o e-mail informado estiver cadastrado/i),
      ).toBeInTheDocument();
    });
  });

  it('deve exibir mensagem de erro amigável quando o serviço retornar erro', async () => {
    vi.mocked(authService.solicitarRecuperacaoSenha).mockRejectedValueOnce(
      new Error('Falha de rede')
    );

    renderComponent();
    const inputEmail = screen.getByPlaceholderText(/seuemail@exemplo.com/i);
    const botaoEnviar = screen.getByRole('button', { name: /enviar link de recuperação/i });

    fireEvent.change(inputEmail, { target: { value: 'erro@exemplo.com' } });
    fireEvent.click(botaoEnviar);

    await waitFor(() => {
      expect(
        screen.getByText(/ocorreu um erro inesperado|falha/i),
      ).toBeInTheDocument();
    });
  });
});