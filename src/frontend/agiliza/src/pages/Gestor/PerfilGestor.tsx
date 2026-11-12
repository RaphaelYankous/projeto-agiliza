import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Icone } from '../../components/Icone'
import { useFotoPerfil } from '../../contexts/FotoPerfilContext'
import { consultarPerfilGestor, type PerfilGestor as PerfilGestorDados } from '../../services/gestorService'
import styles from './PerfilGestor.module.css'

const OPCOES_SEM_LINK = ['Notificações', 'Convidar amigos', 'Ajuda']

export function PerfilGestor() {
  const { foto } = useFotoPerfil()
  const [perfil, setPerfil] = useState<PerfilGestorDados | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let cancelado = false

    consultarPerfilGestor()
      .then((dados) => {
        if (!cancelado) setPerfil(dados)
      })
      .catch(() => {
        if (!cancelado) setErro(true)
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  return (
    <section className={styles.perfil}>
      <h1 className={styles.titulo}>Perfil</h1>

      {carregando && (
        <p role="status" className={styles.aviso}>
          Carregando perfil...
        </p>
      )}

      {erro && (
        <p role="alert" className={styles.erro}>
          Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.
        </p>
      )}

      {perfil && (
        <div className={styles.resumo}>
          {foto ? (
            <img className={styles.avatar} src={foto} alt="Sua foto de perfil" />
          ) : (
            <span className={styles.avatar} aria-hidden="true">
              <Icone nome="pessoa" tamanho={32} />
            </span>
          )}
          <div className={styles.dados}>
            <h2 className={styles.nome}>
              {perfil.nome} {perfil.sobrenome}
            </h2>
            <p className={styles.email}>{perfil.email}</p>
            <p className={styles.tipo}>Gestor Agiliza</p>
          </div>
        </div>
      )}

      <section className={styles.conta} aria-labelledby="titulo-conta">
        <h2 id="titulo-conta" className={styles.contaTitulo}>
          Configurações da conta
        </h2>
        <ul className={styles.opcoes}>
          <li>
            <Link
              to="/gestor/meus-dados"
              className={styles.opcao}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span>Meus dados</span>
              <Icone nome="seta-direita" tamanho={18} />
            </Link>
          </li>
          <li>
            <Link
              to="/gestor"
              className={styles.opcao}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span>Meus estabelecimentos</span>
              <Icone nome="seta-direita" tamanho={18} />
            </Link>
          </li>
          {OPCOES_SEM_LINK.map((opcao) => (
            <li key={opcao} className={styles.opcao}>
              <span>{opcao}</span>
              <Icone nome="seta-direita" tamanho={18} />
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}