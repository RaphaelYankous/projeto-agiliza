import type { ReactNode } from 'react'
import styles from './Alert.module.css'

type AlertProps = {
  variant: 'error' | 'success'
  children: ReactNode
}

export function Alert({ variant, children }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[variant]}`} role={variant === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
