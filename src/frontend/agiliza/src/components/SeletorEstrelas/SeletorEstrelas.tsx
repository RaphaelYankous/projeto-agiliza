import { useState, type KeyboardEvent } from 'react'
import { Icone } from '../Icone'
import styles from './SeletorEstrelas.module.css'

const ESTRELAS = [1, 2, 3, 4, 5]

type SeletorEstrelasProps = {
  rotulo: string
  valor: number
  aoMudar?: (nota: number) => void
  somenteLeitura?: boolean
  erro?: string
}

export function SeletorEstrelas({ rotulo, valor, aoMudar, somenteLeitura = false, erro }: SeletorEstrelasProps) {
  const [sobre, setSobre] = useState(0)

  if (somenteLeitura) {
    return (
      <div className={styles.estrelas} role="img" aria-label={`${rotulo}: ${valor} de 5 estrelas`}>
        {ESTRELAS.map((nota) => (
          <span key={nota} className={`${styles.estrela} ${nota <= valor ? styles.cheia : ''}`}>
            <Icone nome="estrela" tamanho={28} preenchido={nota <= valor} />
          </span>
        ))}
      </div>
    )
  }

  const exibida = sobre || valor

  const aoTeclar = (evento: KeyboardEvent<HTMLButtonElement>, nota: number) => {
    const proxima =
      evento.key === 'ArrowRight' || evento.key === 'ArrowUp'
        ? Math.min(5, nota + 1)
        : evento.key === 'ArrowLeft' || evento.key === 'ArrowDown'
          ? Math.max(1, nota - 1)
          : undefined
    if (!proxima) return
    evento.preventDefault()
    aoMudar?.(proxima)
    const botoes = evento.currentTarget.parentElement?.querySelectorAll('button')
    botoes?.[proxima - 1]?.focus()
  }

  return (
    <div className={styles.campo}>
      <div
        className={styles.estrelas}
        role="radiogroup"
        aria-label={rotulo}
        aria-invalid={erro ? true : undefined}
        onMouseLeave={() => setSobre(0)}
      >
        {ESTRELAS.map((nota) => (
          <button
            key={nota}
            type="button"
            role="radio"
            aria-checked={nota === valor}
            aria-label={`${nota} ${nota === 1 ? 'estrela' : 'estrelas'}`}
            // Só uma estrela fica na ordem do Tab; as setas trocam a nota (padrão de radiogroup).
            tabIndex={nota === (valor || 1) ? 0 : -1}
            className={`${styles.estrela} ${nota <= exibida ? styles.cheia : ''}`}
            onClick={() => aoMudar?.(nota)}
            onMouseEnter={() => setSobre(nota)}
            onKeyDown={(evento) => aoTeclar(evento, nota)}
          >
            <Icone nome="estrela" tamanho={28} preenchido={nota <= exibida} />
          </button>
        ))}
      </div>
      {erro && (
        <span className={styles.erro} role="alert">
          {erro}
        </span>
      )}
    </div>
  )
}
