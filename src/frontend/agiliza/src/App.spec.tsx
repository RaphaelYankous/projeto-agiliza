import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { lerToken } from './services/sessao'
import { API, servidor } from './test/servidor'
import { simularTela } from './test/tela'
import { criarToken } from './test/token'

vi.mock('react-leaflet', () => ({ MapContainer: () => null, TileLayer: () => null, Marker: () => null, Popup: () => null }))

function abrir(
  rota: string,
  perfil?: string,
  { foto = null as string | null, notificacoes = [] as object[] } = {},
) {
  if (perfil) localStorage.setItem('agiliza.token', criarToken({ perfil, email: `${perfil}@email.com` }))
  servidor.use(
    http.get(`${API}/usuarios/me/foto`, () => HttpResponse.json({ foto })),
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json([])),
    http.get(`${API}/estabelecimentos/busca`, () => HttpResponse.json([])),
    http.get(`${API}/notificacoes`, () => HttpResponse.json(notificacoes)),
  )
  window.history.pushState({}, '', rota)
  return render(<App />)
}

const menuPrincipal = () => within(screen.getByRole('navigation', { name: 'Menu principal' }))

describe('Aplicação: rotas e layout', () => {
  beforeEach(() => {
    simularTela({ celular: false })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('manda quem não está logado para o login', () => {
    abrir('/cliente/agendamentos')

    expect(window.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('avisa quando o token salvo já venceu', () => {
    localStorage.setItem('agiliza.token', criarToken({ perfil: 'cliente', expiraEmSegundos: -60 }))
    abrir('/buscar')

    expect(window.location.pathname).toBe('/login')
    expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou. Entre novamente.')
    expect(lerToken()).toBeNull()
  })

  it('mostra o menu de cada perfil e marca a página atual', async () => {
    const { unmount } = abrir('/buscar', 'cliente')
    expect(menuPrincipal().getAllByRole('link').map((link) => link.textContent)).toEqual(['Início', 'Buscar', 'Agenda'])
    expect(menuPrincipal().getByRole('link', { name: 'Buscar' })).toHaveAttribute('aria-current', 'page')
    await screen.findByText('0 estabelecimento(s) encontrado(s)')
    unmount()
    localStorage.clear()

    const segundo = abrir('/', 'profissional')
    expect(menuPrincipal().getAllByRole('link').map((link) => link.textContent)).toEqual(['Início', 'Agenda', 'Disponibilidade', 'Bloqueios'])
    segundo.unmount()
    localStorage.clear()

    abrir('/gestor', 'gestor')
    expect(menuPrincipal().getAllByRole('link').map((link) => link.textContent)).toEqual(['Painel', 'Agenda da equipe', 'Profissionais', 'Serviços'])
    expect(await screen.findByRole('heading', { name: 'Nenhum estabelecimento vinculado' })).toBeInTheDocument()
  })

  it('impede o cliente de abrir telas do gestor e avisa no início', async () => {
    servidor.use(http.get(`${API}/estabelecimentos`, () => HttpResponse.json([])))
    abrir('/gestor/servicos', 'cliente')

    expect(window.location.pathname).toBe('/')
    expect(screen.getByRole('alert')).toHaveTextContent('Você não tem permissão para acessar essa página.')
    await screen.findByText('Nenhum estabelecimento cadastrado ainda.')
  })

  it('abre os horários de um profissional só para o gestor', async () => {
    servidor.use(
      http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json([])),
      http.get(`${API}/estabelecimentos`, () => HttpResponse.json([])),
    )
    const { unmount } = abrir('/gestor/profissionais/p1/horarios', 'gestor')
    expect(await screen.findByRole('heading', { name: 'Horários do profissional' })).toBeInTheDocument()
    unmount()

    abrir('/gestor/profissionais/p1/horarios', 'cliente')
    expect(window.location.pathname).toBe('/')
    await screen.findByText('Nenhum estabelecimento cadastrado ainda.')
  })

  it('impede quem não é profissional de abrir a agenda do profissional', async () => {
    abrir('/agenda', 'gestor')

    expect(window.location.pathname).toBe('/gestor')
    await screen.findByRole('heading', { name: 'Nenhum estabelecimento vinculado' })
  })

  it('manda quem já está logado do login para o início', () => {
    abrir('/login', 'profissional')

    expect(window.location.pathname).toBe('/')
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument()
  })

  it('volta para o login com aviso quando a API responde 401 durante o uso', async () => {
    servidor.use(http.get(`${API}/minha-agenda`, () => HttpResponse.json({}, { status: 401 })))
    abrir('/', 'profissional')

    await userEvent.click(menuPrincipal().getByRole('link', { name: 'Agenda' }))

    expect(await screen.findByText('Sua sessão expirou. Entre novamente.')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(lerToken()).toBeNull()
  })

  it('abre o menu do usuário com o e-mail, o perfil e a opção de sair', async () => {
    abrir('/', 'profissional')

    await userEvent.click(screen.getByRole('button', { name: 'Menu do usuário' }))
    const menu = screen.getByRole('menu', { name: 'Menu do usuário' })
    expect(menu).toHaveTextContent('profissional@email.com')
    expect(within(menu).getByRole('menuitem', { name: 'Perfil' })).toHaveAttribute('href', '/perfil')

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Menu do usuário' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }))
    expect(window.location.pathname).toBe('/login')
    expect(lerToken()).toBeNull()
  })

  it('mostra a foto do usuário no menu e direciona para o perfil do gestor', async () => {
    abrir('/gestor', 'gestor', { foto: 'data:image/png;base64,AAA' })

    const gatilho = screen.getByRole('button', { name: 'Menu do usuário' })
    await vi.waitFor(() => expect(gatilho.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,AAA'))
    await userEvent.click(gatilho)

    const menu = screen.getByRole('menu', { name: 'Menu do usuário' })
    const itemPerfil = within(menu).getByRole('menuitem', { name: 'Perfil' })
    expect(itemPerfil).toHaveAttribute('href', '/gestor/perfil')
    expect(itemPerfil).not.toHaveAttribute('aria-disabled')

    await userEvent.click(screen.getByRole('heading', { name: 'Painel do Gestor' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('no celular, o menu lateral começa fechado e fecha ao escolher um item', async () => {
    simularTela({ celular: true })
    abrir('/', 'profissional')

    const botao = screen.getByRole('button', { name: 'Abrir menu' })
    expect(botao).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(botao)
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true')

    servidor.use(http.get(`${API}/minha-agenda/bloqueios`, () => HttpResponse.json([])))
    await userEvent.click(menuPrincipal().getByRole('link', { name: 'Bloqueios' }))
    expect(window.location.pathname).toBe('/bloqueios')
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeInTheDocument()
    await screen.findByText('Nenhum bloqueio registrado.')
  })

  describe('notificações', () => {
    const NOVA = {
      id: 'n1',
      tipo: 'agendamento_criado',
      titulo: 'Novo agendamento',
      mensagem: 'Corte em 21/10/2030 10:00 foi criado.',
      lida: false,
      criadaEm: '2030-10-20T08:00:00.000Z',
    }
    const LIDA = { ...NOVA, id: 'n2', titulo: 'Agendamento cancelado', mensagem: 'Barba foi cancelado.', lida: true }

    it('mostra o ponto de não lida e lista as notificações ao abrir o sino', async () => {
      abrir('/buscar', 'cliente', { notificacoes: [NOVA, LIDA] })

      const sino = screen.getByRole('button', { name: 'Notificações' })
      await vi.waitFor(() => expect(sino.querySelector('.pontoNotificacao')).toBeInTheDocument())
      expect(sino).toHaveAttribute('aria-expanded', 'false')

      await userEvent.click(sino)

      expect(sino).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('button', { name: /Novo agendamento/ })).toHaveTextContent(NOVA.mensagem)
      expect(screen.getByRole('button', { name: /Agendamento cancelado/ }).closest('li')).toHaveClass('notificacaoLida')
    })

    it('marca como lida ao clicar e tira o ponto quando não sobra nenhuma não lida', async () => {
      const marcadas: string[] = []
      servidor.use(
        http.patch(`${API}/notificacoes/:id/lida`, ({ params }) => {
          marcadas.push(String(params.id))
          return new HttpResponse(null, { status: 204 })
        }),
      )
      abrir('/buscar', 'cliente', { notificacoes: [NOVA, LIDA] })
      const sino = screen.getByRole('button', { name: 'Notificações' })
      await vi.waitFor(() => expect(sino.querySelector('.pontoNotificacao')).toBeInTheDocument())

      await userEvent.click(sino)
      await userEvent.click(screen.getByRole('button', { name: /Agendamento cancelado/ }))
      await userEvent.click(screen.getByRole('button', { name: /Novo agendamento/ }))

      await vi.waitFor(() => expect(marcadas).toEqual(['n1']))
      expect(sino.querySelector('.pontoNotificacao')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Novo agendamento/ }).closest('li')).toHaveClass('notificacaoLida')
    })

    it('avisa quando não há notificações', async () => {
      abrir('/buscar', 'cliente')

      await userEvent.click(screen.getByRole('button', { name: 'Notificações' }))

      expect(await screen.findByText('Você não tem notificações novas.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Notificações' }).querySelector('.pontoNotificacao')).not.toBeInTheDocument()
    })
  })
})
