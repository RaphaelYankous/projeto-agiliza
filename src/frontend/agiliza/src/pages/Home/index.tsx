import { Link, Navigate } from 'react-router'
import { Icone } from '../../components/Icone'
import { useAuth } from '../../contexts/AuthContext'
import { MENU_POR_PERFIL } from '../../routes/menuPorPerfil'
import { HomeCliente } from './HomeCliente'
import styles from './Home.module.css'

function HomePadrao() {
  const { usuario } = useAuth()
  const funcionalidades = usuario
    ? MENU_POR_PERFIL[usuario.perfil].filter((item) => item.descricao)
    : []

  return (
    <section className={styles.home}>
      <h1 className={styles.titulo}>Início</h1>
      <p className={styles.saudacao}>Olá! Boas-vindas ao Agiliza.</p>

      <ul className={styles.cartoes}>
        {funcionalidades.map((item) => {
          const conteudo = (
            <>
              <span className={styles.icone}>
                <Icone nome={item.icone} tamanho={24} />
              </span>
              <div className={styles.texto}>
                <h2 className={styles.rotulo}>{item.rotulo}</h2>
                <p className={styles.descricao}>{item.descricao}</p>
              </div>
              <span className={item.caminho ? styles.seloAtivo : styles.selo}>
                {item.caminho ? 'Acessar' : 'Em breve'}
              </span>
            </>
          )

          return (
            <li key={item.rotulo} className={styles.item}>
              {item.caminho ? (
                <Link to={item.caminho} className={`${styles.cartao} ${styles.link}`}>
                  {conteudo}
                </Link>
              ) : (
                <div className={styles.cartao}>{conteudo}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Home() {
  const { usuario } = useAuth()

  if (usuario?.perfil === 'cliente') return <HomeCliente />
  if (usuario?.perfil === 'gestor') return <Navigate to="/gestor" replace />

  return <HomePadrao />
}
