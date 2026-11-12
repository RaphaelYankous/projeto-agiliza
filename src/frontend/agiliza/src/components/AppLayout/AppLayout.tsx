import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import logoEscuro from '../../assets/logo-agiliza-escuro.png'
import { useAuth } from '../../contexts/AuthContext'
import { useFecharAoInteragirFora } from '../../hooks/useFecharAoInteragirFora'
import { MENU_POR_PERFIL } from '../../routes/menuPorPerfil'
import { Alert } from '../Alert'
import { Icone } from '../Icone'
import { MenuUsuario } from '../MenuUsuario'
import { listarNotificacoes, marcarNotificacaoComoLida, type Notificacao } from '../../services/notificacoesService'
import styles from './AppLayout.module.css'

const CONSULTA_CELULAR = '(max-width: 768px)'

export type AvisoNavegacao = {
  tipo: 'success' | 'error'
  mensagem: string
}

function ehCelular() {
  return window.matchMedia(CONSULTA_CELULAR).matches
}

export function AppLayout() {
  const { usuario } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [celular, setCelular] = useState(ehCelular)
  const [painelAberto, setPainelAberto] = useState(() => !ehCelular())
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const painelRef = useRef<HTMLElement>(null)
  const painelId = useId()

  const [avisoVisivel, setAvisoVisivel] = useState<AvisoNavegacao | null>(null)
  const timerAvisoRef = useRef<number | null>(null)

  useEffect(() => {
    const estado = location.state as { aviso?: AvisoNavegacao } | null
    if (estado?.aviso) {
      setAvisoVisivel(estado.aviso)

      if (timerAvisoRef.current) {
        window.clearTimeout(timerAvisoRef.current)
      }

      // Limpa o state na URL imediatamente sem rearmar o timeout
      navigate(location.pathname, { replace: true, state: null })

      timerAvisoRef.current = window.setTimeout(() => {
        setAvisoVisivel(null)
        timerAvisoRef.current = null
      }, 3000)
    }
  }, [location.state]) // Depende apenas de novas chegadas de state

  useEffect(() => {
    return () => {
      if (timerAvisoRef.current) {
        window.clearTimeout(timerAvisoRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_CELULAR)
    const aoMudar = (evento: MediaQueryListEvent) => {
      setCelular(evento.matches)
      setPainelAberto(!evento.matches)
    }
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  useEffect(() => {
    let ativo = true
    listarNotificacoes().then((lista) => {
      if (ativo) setNotificacoes(lista)
    }).catch(() => {
      if (ativo) setNotificacoes([])
    })
    return () => { ativo = false }
  }, [usuario])

  const fecharPainel = useCallback(() => setPainelAberto(false), [])
  useFecharAoInteragirFora(painelRef, celular && painelAberto, fecharPainel)

  const itens = usuario ? MENU_POR_PERFIL[usuario.perfil] : []
  const classesContainer = [styles.container, painelAberto ? '' : styles.painelFechado].join(' ')

  return (
    <div className={classesContainer}>
      {celular && painelAberto && <div className={styles.fundo} aria-hidden="true" />}

      <aside id={painelId} ref={painelRef} className={styles.painel}>
        <img src={logoEscuro} alt="Agiliza" className={styles.logo} />

        <nav aria-label="Menu principal">
          <ul className={styles.itens}>
            {itens.map((item) => (
              <li key={item.rotulo}>
                {item.caminho ? (
                  <NavLink
                    to={item.caminho}
                    end
                    className={({ isActive }) => [styles.item, isActive ? styles.ativo : ''].join(' ')}
                    onClick={() => celular && fecharPainel()}
                  >
                    <Icone nome={item.icone} />
                    {item.rotulo}
                  </NavLink>
                ) : (
                  <span className={styles.item}>
                    <Icone nome={item.icone} />
                    {item.rotulo}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className={styles.principal}>
        <header className={styles.barraSuperior}>
          <button
            type="button"
            className={styles.botaoMenu}
            aria-label={painelAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={painelAberto}
            aria-controls={painelId}
            onClick={() => setPainelAberto((atual) => !atual)}
          >
            <Icone nome="menu" tamanho={24} />
          </button>
          <div className={styles.acoes}>
            <div className={styles.notificacoes}>
              <button
              type="button"
              className={styles.botaoIcone}
              aria-label="Notificações"
              aria-expanded={notificacoesAbertas}
              onClick={() => setNotificacoesAbertas((abertas) => !abertas)}
            >
              <Icone nome="sino" tamanho={24} />
              {notificacoes.some((item) => !item.lida) && <span className={styles.pontoNotificacao} aria-hidden="true" />}
              </button>
              {notificacoesAbertas && (
                <div className={styles.painelNotificacoes} role="status">
                  <strong>Notificações</strong>
                  {notificacoes.length === 0 ? <p>Você não tem notificações novas.</p> : <ul>
                    {notificacoes.map((item) => <li key={item.id} className={item.lida ? styles.notificacaoLida : ''}>
                      <button type="button" onClick={() => {
                        if (!item.lida) {
                          void marcarNotificacaoComoLida(item.id)
                          setNotificacoes((atuais) => atuais.map((atual) => atual.id === item.id ? { ...atual, lida: true } : atual))
                        }
                      }}>
                        <strong>{item.titulo}</strong>
                        <span>{item.mensagem}</span>
                      </button>
                    </li>)}
                  </ul>}
                </div>
              )}
            </div>
            <MenuUsuario />
          </div>
        </header>

        <main className={styles.conteudo}>
          {avisoVisivel && (
            <div className={styles.alerta}>
              <Alert variant={avisoVisivel.tipo}>{avisoVisivel.mensagem}</Alert>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}