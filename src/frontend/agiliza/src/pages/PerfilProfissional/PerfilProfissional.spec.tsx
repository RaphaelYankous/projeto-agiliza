import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useFotoPerfil } from '../../contexts/FotoPerfilContext'
import { FotoPerfilProvider } from '../../contexts/FotoPerfilProvider'
import { lerToken } from '../../services/sessao'
import { arquivoPng } from '../../test/dados'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { criarToken } from '../../test/token'
import { PerfilProfissional } from './PerfilProfissional'

const PERFIL = {
  nome: 'Carla',
  sobrenome: 'Mendes',
  funcao: 'Profissional',
  estabelecimento: 'Studio Savassi',
  foto: null,
  servicos: [{ id: 's1', nome: 'Corte', preco: 4500, duracao: 35 }],
}

const AVALIACOES = {
  media: 4.5,
  quantidade: 2,
  avaliacoes: [
    { id: 'av1', nota: 5, comentario: 'Excelente' },
    { id: 'av2', nota: 4, comentario: '' },
  ],
}

function FotoNoMenu() {
  const { foto } = useFotoPerfil()
  return <p>Foto no menu: {foto ?? 'nenhuma'}</p>
}

function responder({ perfil = PERFIL, avaliacoes = AVALIACOES }: { perfil?: object; avaliacoes?: object } = {}) {
  servidor.use(
    http.get(`${API}/usuarios/me/foto`, () => HttpResponse.json({ foto: null })),
    http.get(`${API}/meu-perfil-profissional`, () => HttpResponse.json(perfil)),
    http.get(`${API}/meu-perfil-profissional/avaliacoes`, () => HttpResponse.json(avaliacoes)),
  )
}

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route
        path="/perfil"
        element={
          <FotoPerfilProvider>
            <FotoNoMenu />
            <PerfilProfissional />
          </FotoPerfilProvider>
        }
      />
      <Route path="/login" element={<PaginaAtual nome="Login" />} />
    </>,
    { rota: '/perfil', token: criarToken({ perfil: 'profissional', email: 'carla@email.com' }) },
  )

describe('Perfil do profissional', () => {
  it('mostra nome, função, estabelecimento, iniciais e a nota média', async () => {
    responder()
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Carla Mendes' })).toBeInTheDocument()
    expect(screen.getByText('Profissional · Studio Savassi')).toBeInTheDocument()
    expect(screen.getByText('CM')).toBeInTheDocument()
    expect(await screen.findByText('4,5 (2 avaliações)')).toBeInTheDocument()
  })

  it('mostra "Sem nota" quando não há avaliações e avisa quando elas não carregam', async () => {
    responder({ avaliacoes: { media: null, quantidade: 0, avaliacoes: [] } })
    const { unmount } = renderizar()
    expect(await screen.findByText('Sem nota (0 avaliações)')).toBeInTheDocument()
    unmount()

    responder()
    servidor.use(http.get(`${API}/meu-perfil-profissional/avaliacoes`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()
    expect(await screen.findByText('Avaliações indisponíveis no momento')).toBeInTheDocument()
  })

  it('abre os serviços e as avaliações recebidas', async () => {
    responder()
    renderizar()
    await screen.findByRole('heading', { name: 'Carla Mendes' })

    await userEvent.click(screen.getByRole('button', { name: /Meus serviços/ }))
    expect(screen.getByRole('button', { name: /Meus serviços/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Serviços oferecidos por Studio Savassi. A edição é feita pelo gestor.')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s45,00 · 35 min/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Avaliações recebidas/ }))
    const avaliacoes = screen.getAllByRole('listitem')
    expect(avaliacoes[0]).toHaveTextContent('5/5Excelente')
    expect(avaliacoes[1]).toHaveTextContent('4/5Sem comentário')
  })

  it('edita o nome pelo diálogo', async () => {
    responder()
    let corpo: unknown
    servidor.use(
      http.patch(`${API}/meu-perfil-profissional`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ nome: 'Carla', sobrenome: 'Souza' })
      }),
    )
    renderizar()
    await screen.findByRole('heading', { name: 'Carla Mendes' })

    await userEvent.click(screen.getByRole('button', { name: 'Editar nome' }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar nome' })
    await userEvent.clear(within(dialogo).getByLabelText('Sobrenome'))
    await userEvent.type(within(dialogo).getByLabelText('Sobrenome'), ' Souza ')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('heading', { name: 'Carla Souza' })).toBeInTheDocument()
    expect(corpo).toEqual({ nome: 'Carla', sobrenome: 'Souza' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('troca a foto e atualiza o menu na hora', async () => {
    responder()
    servidor.use(http.patch(`${API}/meu-perfil-profissional/foto`, () => HttpResponse.json({ foto: 'data:image/png;base64,AAA' })))
    renderizar()
    await screen.findByRole('heading', { name: 'Carla Mendes' })

    await userEvent.upload(screen.getByLabelText('Selecionar foto do perfil'), arquivoPng())

    expect(await screen.findByRole('img', { name: 'Foto de Carla' })).toHaveAttribute('src', 'data:image/png;base64,AAA')
    expect(screen.getByText('Foto no menu: data:image/png;base64,AAA')).toBeInTheDocument()
  })

  it('recusa foto em formato inválido sem enviar', async () => {
    responder()
    renderizar()
    await screen.findByRole('heading', { name: 'Carla Mendes' })

    await userEvent.upload(screen.getByLabelText('Selecionar foto do perfil'), new File(['gif'], 'a.gif', { type: 'image/gif' }), {
      applyAccept: false,
    })

    expect(screen.getByRole('alert')).toHaveTextContent('A foto deve ser um arquivo JPG, PNG ou WebP válido.')
  })

  it('avisa quando a conta ainda não está vinculada a um estabelecimento', async () => {
    responder()
    servidor.use(http.get(`${API}/meu-perfil-profissional`, () => HttpResponse.json({}, { status: 404 })))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Sua conta ainda não está vinculada a um profissional e estabelecimento.')
  })

  it('sai da conta e vai para o login', async () => {
    responder()
    renderizar()
    await screen.findByRole('heading', { name: 'Carla Mendes' })

    await userEvent.click(screen.getByRole('button', { name: /Sair/ }))

    expect(screen.getByText('Login em /login')).toBeInTheDocument()
    expect(lerToken()).toBeNull()
  })
})
