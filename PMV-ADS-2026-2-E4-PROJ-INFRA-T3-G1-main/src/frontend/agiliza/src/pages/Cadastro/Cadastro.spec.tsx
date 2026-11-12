import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { Cadastro } from '.'

const rotas = (
  <>
    <Route path="/cadastro" element={<Cadastro />} />
    <Route path="/login" element={<PaginaAtual nome="Login" />} />
  </>
)

async function preencherFormulario() {
  await userEvent.type(screen.getByLabelText('Nome'), ' Ana ')
  await userEvent.type(screen.getByLabelText('Sobrenome'), 'Souza')
  await userEvent.type(screen.getByLabelText('E-mail'), 'ana@email.com')
  await userEvent.type(screen.getByLabelText('CPF'), '52998224725')
  await userEvent.type(screen.getByLabelText('Telefone'), '31988881001')
  await userEvent.type(screen.getByLabelText('Senha'), 'segredo1')
  await userEvent.type(screen.getByLabelText('Confirmar senha'), 'segredo1')
}

const criarConta = () => userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

describe('Tela de cadastro', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
  })

  it('mostra os erros de cada campo sem chamar a API', async () => {
    renderizarComRotas(rotas, { rota: '/cadastro' })

    await userEvent.type(screen.getByLabelText('CPF'), '12345678900')
    await userEvent.type(screen.getByLabelText('Senha'), '123')
    await userEvent.type(screen.getByLabelText('Confirmar senha'), '321')
    await criarConta()

    expect(screen.getAllByText('Campo obrigatório.')).toHaveLength(4)
    expect(screen.getByText('Informe um CPF válido.')).toBeInTheDocument()
    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument()
  })

  it('aplica as máscaras de CPF e telefone enquanto o usuário digita', async () => {
    renderizarComRotas(rotas, { rota: '/cadastro' })

    await userEvent.type(screen.getByLabelText('CPF'), '52998224725')
    await userEvent.type(screen.getByLabelText('Telefone'), '31988881001')

    expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25')
    expect(screen.getByLabelText('Telefone')).toHaveValue('(31) 98888-1001')
  })

  it('cria a conta de cliente com os dados limpos e vai para o login com o recado de sucesso', async () => {
    let enviado: FormData | undefined
    servidor.use(
      http.post(`${API}/clientes`, async ({ request }) => {
        enviado = await request.formData()
        return HttpResponse.json({ id: 'novo' }, { status: 201 })
      }),
    )
    renderizarComRotas(rotas, { rota: '/cadastro' })

    await preencherFormulario()
    await criarConta()

    expect(await screen.findByText('Login em /login')).toBeInTheDocument()
    expect(Object.fromEntries(enviado!.entries())).toEqual({
      nome: 'Ana',
      sobrenome: 'Souza',
      email: 'ana@email.com',
      cpf: '52998224725',
      telefone: '31988881001',
      senha: 'segredo1',
    })
  })

  it('envia a conta de gestor para a rota de gestores, com a foto escolhida', async () => {
    let corpo = ''
    servidor.use(
      http.post(`${API}/gestores`, async ({ request }) => {
        corpo = await request.text()
        return HttpResponse.json({ id: 'novo' }, { status: 201 })
      }),
    )
    renderizarComRotas(rotas, { rota: '/cadastro' })

    await userEvent.click(screen.getByRole('radio', { name: 'Gestor de estabelecimento' }))
    await userEvent.upload(
      screen.getByLabelText('Escolher foto', { selector: 'input' }),
      new File(['png'], 'eu.png', { type: 'image/png' }),
    )
    await preencherFormulario()
    await criarConta()

    expect(await screen.findByText('Login em /login')).toBeInTheDocument()
    expect(corpo).toMatch(/name="foto"; filename="eu\.png"\r\nContent-Type: image\/png/)
  })

  it('recusa foto em formato inválido antes de enviar', async () => {
    renderizarComRotas(rotas, { rota: '/cadastro' })

    await userEvent.upload(
      screen.getByLabelText('Escolher foto', { selector: 'input' }),
      new File(['gif'], 'eu.gif', { type: 'image/gif' }),
      { applyAccept: false },
    )

    expect(screen.getByRole('alert')).toHaveTextContent('A foto deve ser um arquivo JPG, PNG ou WebP válido.')
    expect(screen.queryByRole('img', { name: 'Prévia da sua foto' })).not.toBeInTheDocument()
  })

  it('mostra a mensagem da API quando o e-mail já está cadastrado', async () => {
    servidor.use(
      http.post(`${API}/clientes`, () =>
        HttpResponse.json({ message: 'Este e-mail já está cadastrado.' }, { status: 409 }),
      ),
    )
    renderizarComRotas(rotas, { rota: '/cadastro' })

    await preencherFormulario()
    await criarConta()

    expect(await screen.findByRole('alert')).toHaveTextContent('Este e-mail já está cadastrado.')
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled()
  })

  it('mostra no campo de foto o erro de foto devolvido pela API', async () => {
    servidor.use(
      http.post(`${API}/clientes`, () =>
        HttpResponse.json({ message: 'A foto deve ter no máximo 2 MB.' }, { status: 400 }),
      ),
    )
    renderizarComRotas(rotas, { rota: '/cadastro' })

    await userEvent.upload(
      screen.getByLabelText('Escolher foto', { selector: 'input' }),
      new File(['png'], 'eu.png', { type: 'image/png' }),
    )
    await preencherFormulario()
    await criarConta()

    expect(await screen.findByRole('alert')).toHaveTextContent('A foto deve ter no máximo 2 MB.')
    expect(screen.queryByRole('img', { name: 'Prévia da sua foto' })).not.toBeInTheDocument()
  })
})
