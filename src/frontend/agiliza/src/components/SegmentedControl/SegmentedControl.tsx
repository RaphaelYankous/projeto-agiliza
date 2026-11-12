import styles from './SegmentedControl.module.css'

type Opcao<T extends string> = {
  value: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  ariaLabel: string
  options: Opcao<T>[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opcao) => {
        const selecionada = opcao.value === value
        return (
          <button
            key={opcao.value}
            type="button"
            role="radio"
            aria-checked={selecionada}
            className={`${styles.option} ${selecionada ? styles.selected : ''}`}
            onClick={() => onChange(opcao.value)}
          >
            {opcao.label}
          </button>
        )
      })}
    </div>
  )
}
