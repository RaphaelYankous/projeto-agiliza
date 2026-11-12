import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Chip.module.css'

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ativo?: boolean
  estatico?: boolean
  children: ReactNode
}

export function Chip({ ativo = false, estatico = false, type = 'button', className, children, ...rest }: ChipProps) {
  if (estatico) {
    return (
      <span className={[styles.chip, styles.chipEstatico, className ?? ''].join(' ')} title={rest.title}>
        {children}
      </span>
    )
  }

  const classes = [styles.chip, ativo ? styles.chipAtivo : '', className ?? ''].join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}
