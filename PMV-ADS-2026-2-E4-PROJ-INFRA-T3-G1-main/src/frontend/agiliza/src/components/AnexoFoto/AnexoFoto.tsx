import { useEffect, useId, useMemo, useRef, type ChangeEvent } from 'react'
import { ActionButton } from '../ActionButton'
import { Icone } from '../Icone'
import styles from './AnexoFoto.module.css'

type AnexoFotoProps = {
  arquivo?: File
  aoEscolher: (arquivo: File) => void
  aoRemover: () => void
  erro?: string
  desabilitado?: boolean
}

export function AnexoFoto({ arquivo, aoEscolher, aoRemover, erro, desabilitado = false }: AnexoFotoProps) {
  const entradaRef = useRef<HTMLInputElement>(null)
  const erroId = useId()
  const previa = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : undefined), [arquivo])

  useEffect(() => {
    if (!previa) return
    return () => URL.revokeObjectURL(previa)
  }, [previa])

  const aoSelecionar = (evento: ChangeEvent<HTMLInputElement>) => {
    const escolhido = evento.target.files?.[0]
    // Limpa o input para permitir escolher o mesmo arquivo de novo depois de remover.
    evento.target.value = ''
    if (escolhido) aoEscolher(escolhido)
  }

  return (
    <div className={styles.campo}>
      {previa ? (
        <div className={styles.anexada}>
          <img className={styles.previa} src={previa} alt="Prévia da foto anexada" />
          <span className={styles.nome}>{arquivo?.name}</span>
          <button
            type="button"
            className={styles.remover}
            aria-label="Remover foto"
            title="Remover foto"
            disabled={desabilitado}
            onClick={aoRemover}
          >
            <Icone nome="lixeira" tamanho={18} />
          </button>
        </div>
      ) : (
        <ActionButton
          variant="secondary"
          className={styles.botao}
          disabled={desabilitado}
          aria-describedby={erro ? erroId : undefined}
          onClick={() => entradaRef.current?.click()}
        >
          + foto
        </ActionButton>
      )}
      <input
        ref={entradaRef}
        className={styles.entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Anexar foto"
        tabIndex={-1}
        onChange={aoSelecionar}
      />
      {erro && (
        <span id={erroId} className={styles.erro} role="alert">
          {erro}
        </span>
      )}
    </div>
  )
}
