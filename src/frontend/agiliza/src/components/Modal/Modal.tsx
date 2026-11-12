import { type FormEvent, type ReactNode } from 'react'
import styles from './Modal.module.css'

type ModalProps = {
  titulo: string
  aoFechar: () => void
  children: ReactNode
  aoEnviar?: (evento: FormEvent<HTMLFormElement>) => void
  fechamentoBloqueado?: boolean
  className?: string
}

export function Modal({
  titulo,
  aoFechar,
  children,
  aoEnviar,
  fechamentoBloqueado = false,
  className,
}: ModalProps) {
  function fechar() {
    if (!fechamentoBloqueado) aoFechar()
  }

  const classes = [styles.caixa, className].filter(Boolean).join(' ')
  const conteudo = <>
    <h2>{titulo}</h2>
    {children}
  </>

  return (
    <div className={styles.sobreposicao} onClick={fechar}>
      {aoEnviar ? (
        <form
          className={classes}
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          onClick={(evento) => evento.stopPropagation()}
          onSubmit={aoEnviar}
        >
          {conteudo}
        </form>
      ) : (
        <section
          className={classes}
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          onClick={(evento) => evento.stopPropagation()}
        >
          {conteudo}
        </section>
      )}
    </div>
  )
}
