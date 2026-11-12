import type { ButtonHTMLAttributes } from 'react'
import styles from './ActionButton.module.css'

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'dangerOutline'
  loading?: boolean
  loadingText?: string
  fullWidth?: boolean
}

export function ActionButton({
  variant = 'primary',
  loading = false,
  loadingText = 'Enviando…',
  fullWidth = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ActionButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ].join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  )
}
