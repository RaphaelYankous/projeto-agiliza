import type { ReactNode } from 'react'
import styles from './Cartao.module.css'

type CartaoProps = {
  midia: ReactNode
  titulo: ReactNode
  children?: ReactNode
  rodape?: ReactNode
  selecionado?: boolean
  aoSelecionar?: () => void
}

export function Cartao({ midia, titulo, children, rodape, selecionado = false, aoSelecionar }: CartaoProps) {
  if (aoSelecionar) {
    return (
      <button
        type="button"
        aria-pressed={selecionado}
        className={[styles.cartao, styles.selecionavel, selecionado ? styles.selecionado : ''].join(' ')}
        onClick={aoSelecionar}
      >
        {midia}
        <span className={styles.nome}>{titulo}</span>
        {children}
      </button>
    )
  }

  return (
    <article className={styles.cartao}>
      {midia}
      <h2 className={styles.nome}>{titulo}</h2>
      {children}
      {rodape && <div className={styles.rodape}>{rodape}</div>}
    </article>
  )
}
