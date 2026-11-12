import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RotaPublica } from '../../routes/RotaPublica'
import { lerToken } from '../../services/sessao'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { criarToken } from '../../test/token'
import { Login } from '.'

const rotas = (
  <>
    <Route element={<RotaPublica />}>
      <Route path="/login" element={<Login />} />
    </Route>
    <Route path="/" element={<PaginaAtual nome="Início" />} />
  </>
)

async function preencherEEnviar(email: string, senha: string) {
  await userEvent.type(screen.getByLabelText('E-mail'), email)
  await userEvent.type(screen.getByLabelText('Senha'), senha)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('Tela de login', () => {
  it('valida os campos antes de chamar a API', async () => {
    renderizarComRotas(rotas, { rota: '/login' })

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@email')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText('Campo obrigatório.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  it('entra com e-mail e senha, guarda o token e vai para o início', async () => {
    const token = criarToken({ email: 'ana@email.com', perfil: 'profissional' })
    let corpo: unknown
    servidor.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ access_token: token })
      }),
    )
    renderizarComRotas(rotas, { rota: '/login' })

    await preencherEEnviar('  ana@email.com ', 'segredo1')

    expect(await screen.findByText('Início em / como profissional')).toBeInTheDocument()
    expect(corpo).toEqual({ email: 'ana@email.com', senha: 'segredo1' })
    expect(lerToken()).toBe(token)
  })

  it('mostra "E-mail ou senha inválidos." e limpa a senha quando a API recusa', async () => {
    servidor.use(http.post(`${API}/auth/login`, () => HttpResponse.json({}, { status: 401 })))
    renderizarComRotas(rotas, { rota: '/login' })

    await preencherEEnviar('ana@email.com', 'errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@email.com')
    expect(lerToken()).toBeNull()
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    servidor.use(http.post(`${API}/auth/login`, () => HttpResponse.error()))
    renderizarComRotas(rotas, { rota: '/login' })

    await preencherEEnviar('ana@email.com', 'segredo1')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.')
  })

  it('mostra o recado de conta criada quando vem do cadastro', () => {
    renderizarComRotas(rotas, { rota: { pathname: '/login', state: { cadastroOk: true } } })

    expect(screen.getByRole('status')).toHaveTextContent('Conta criada com sucesso!')
  })

  it('mostra o recado de sessão expirada', () => {
    renderizarComRotas(rotas, { rota: { pathname: '/login', state: { sessaoExpirada: true } } })

    expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou. Entre novamente.')
  })

  it('mostra e esconde a senha pelo botão do campo', async () => {
    renderizarComRotas(rotas, { rota: '/login' })

    await userEvent.type(screen.getByLabelText('Senha'), 'segredo1')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
  })

  it('manda quem já está logado para o início', () => {
    renderizarComRotas(rotas, { rota: '/login', token: criarToken({ perfil: 'cliente' }) })

    expect(screen.getByText('Início em / como cliente')).toBeInTheDocument()
  })
})
