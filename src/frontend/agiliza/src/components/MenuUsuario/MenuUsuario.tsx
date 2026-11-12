import { useCallback, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import { useFotoPerfil } from '../../contexts/FotoPerfilContext'
import { useFecharAoInteragirFora } from '../../hooks/useFecharAoInteragirFora'
import type { Perfil } from '../../services/sessao'
import { Icone } from '../Icone'
import styles from './MenuUsuario.module.css'

// Perfis sem tela de perfil ficam com o item "Perfil" desabilitado.
const CAMINHO_PERFIL: Partial<Record<Perfil, string>> = {
  profissional: '/perfil',
  cliente: '/cliente/perfil',
  gestor: '/gestor/perfil',
}

export function MenuUsuario() {
  const { usuario, sair } = useAuth()
  const { foto } = useFotoPerfil()
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const fechar = useCallback(() => setAberto(false), [])
  useFecharAoInteragirFora(containerRef, aberto, fechar)

  if (!usuario) return null

  const caminhoPerfil = CAMINHO_PERFIL[usuario.perfil]

  const aoSair = () => {
    fechar()
    sair()
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.gatilho}
        aria-label="Menu do usuário"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={menuId}
        onClick={() => setAberto((atual) => !atual)}
      >
        {foto ? <img className={styles.foto} src={foto} alt="" /> : <Icone nome="usuario" tamanho={32} />}
      </button>

      {aberto && (
        <div id={menuId} className={styles.menu} role="menu" aria-label="Menu do usuário">
          <p className={styles.email} title={usuario.email}>
            {usuario.email}
          </p>
          {caminhoPerfil ? (
            <Link to={caminhoPerfil} role="menuitem" className={styles.item} onClick={fechar}>
              <Icone nome="pessoa" tamanho={18} />
              Perfil
            </Link>
          ) : (
            <button type="button" role="menuitem" className={styles.item} aria-disabled="true">
              <Icone nome="pessoa" tamanho={18} />
              Perfil
            </button>
          )}
          <button type="button" role="menuitem" className={styles.item} onClick={aoSair}>
            <Icone nome="sair" tamanho={18} />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}