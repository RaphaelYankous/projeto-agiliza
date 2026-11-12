import { useEffect, useId, useMemo, useRef, type ChangeEvent } from 'react'
import { Icone, type NomeIcone } from '../Icone'
import styles from './CampoFoto.module.css'

type CampoFotoProps = {
  rotulo: string
  descricao: string
  fotoAtual?: string | null
  arquivo?: File
  aoEscolher: (arquivo: File) => void
  aoRemover: () => void
  erro?: string
  dica?: string
  legenda?: string
  icone?: NomeIcone
}

export function CampoFoto({
  rotulo,
  descricao,
  fotoAtual,
  arquivo,
  aoEscolher,
  aoRemover,
  erro,
  dica,
  legenda = 'Foto (opcional)',
  icone = 'pessoa',
}: CampoFotoProps) {
  const entradaRef = useRef<HTMLInputElement>(null)
  const erroId = useId()
  const dicaId = useId()
  const previa = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : undefined), [arquivo])

  useEffect(() => {
    if (!previa) return
    return () => URL.revokeObjectURL(previa)
  }, [previa])

  const aoSelecionar = (evento: ChangeEvent<HTMLInputElement>) => {
    const escolhido = evento.target.files?.[0]
    evento.target.value = ''
    if (escolhido) aoEscolher(escolhido)
  }

  const imagem = previa ?? fotoAtual
  const rotuloRemover = fotoAtual ? 'Manter foto atual' : 'Remover foto'
  const descritores = [erro && erroId, dica && dicaId].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.campo}>
      {imagem ? (
        <img className={styles.foto} src={imagem} alt={descricao} />
      ) : (
        <span className={styles.semFoto} aria-hidden="true">
          <Icone nome={icone} tamanho={36} />
        </span>
      )}
      <div className={styles.acoes}>
        <button
          type="button"
          className={styles.icone}
          aria-label={rotulo}
          title={rotulo}
          aria-describedby={descritores}
          onClick={() => entradaRef.current?.click()}
        >
          <Icone nome="lapis" tamanho={18} />
        </button>
        {arquivo && (
          <button
            type="button"
            className={fotoAtual ? styles.icone : `${styles.icone} ${styles.perigo}`}
            aria-label={rotuloRemover}
            title={rotuloRemover}
            onClick={aoRemover}
          >
            <Icone nome={fotoAtual ? 'desfazer' : 'lixeira'} tamanho={18} />
          </button>
        )}
      </div>
      {!imagem && <span className={styles.legenda}>{legenda}</span>}
      {dica && (
        <span id={dicaId} className={styles.dica}>
          {dica}
        </span>
      )}
      <input
        ref={entradaRef}
        className={styles.entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={rotulo}
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
