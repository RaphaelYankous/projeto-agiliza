import { useId } from 'react'
import { Chip } from '../Chip'
import styles from './SelecaoChips.module.css'

export type OpcaoChip = {
  valor: string
  rotulo: string
}

type SelecaoChipsProps = {
  rotulo: string
  opcoes: OpcaoChip[]
  selecionados: string[]
  onChange: (selecionados: string[]) => void
  erro?: string
  mensagemVazia?: string
}

export function SelecaoChips({
  rotulo,
  opcoes,
  selecionados,
  onChange,
  erro,
  mensagemVazia,
}: SelecaoChipsProps) {
  const id = useId()
  const rotuloId = `${id}-rotulo`
  const erroId = `${id}-erro`

  const alternar = (valor: string) => {
    onChange(
      selecionados.includes(valor)
        ? selecionados.filter((atual) => atual !== valor)
        : [...selecionados, valor],
    )
  }

  return (
    <div className={styles.campo}>
      <span id={rotuloId} className={styles.rotulo}>
        {rotulo}
      </span>

      {opcoes.length === 0 ? (
        <p className={styles.vazio}>{mensagemVazia}</p>
      ) : (
        <div
          role="group"
          aria-labelledby={rotuloId}
          aria-describedby={erro ? erroId : undefined}
          className={styles.opcoes}
        >
          {opcoes.map((opcao) => {
            const ativo = selecionados.includes(opcao.valor)
            return (
              <Chip
                key={opcao.valor}
                ativo={ativo}
                aria-pressed={ativo}
                onClick={() => alternar(opcao.valor)}
              >
                {opcao.rotulo}
              </Chip>
            )
          })}
        </div>
      )}

      {erro && (
        <span id={erroId} className={styles.erro}>
          {erro}
        </span>
      )}
    </div>
  )
}
