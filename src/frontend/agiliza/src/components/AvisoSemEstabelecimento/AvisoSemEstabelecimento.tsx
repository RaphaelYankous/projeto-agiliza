import { Link } from 'react-router'
import styles from './AvisoSemEstabelecimento.module.css'

type AvisoSemEstabelecimentoProps = {
  acao?: string
}

export function AvisoSemEstabelecimento({ acao = 'cadastrar profissionais' }: AvisoSemEstabelecimentoProps) {
  return (
    <div className={styles.aviso} role="status">
      <p className={styles.mensagem}>
        Você ainda não possui um estabelecimento. Cadastre um estabelecimento antes de {acao}.
      </p>
      <Link to="/gestor/criar-estabelecimento" className={styles.link}>
        Cadastrar estabelecimento
      </Link>
    </div>
  )
}
