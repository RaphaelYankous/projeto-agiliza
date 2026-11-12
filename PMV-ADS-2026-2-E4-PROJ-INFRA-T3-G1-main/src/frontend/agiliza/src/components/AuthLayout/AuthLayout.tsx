import type { ReactNode } from 'react'
import logoAgiliza from '../../assets/logo-agiliza.png'
import styles from './AuthLayout.module.css'

type AuthLayoutProps = {
  title?: string
  children: ReactNode
}

export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.topBar} />

      <main className={styles.content}>
        <div className={styles.brand}>
          <img src={logoAgiliza} alt="Agiliza" className={styles.logo} />
          <p className={styles.tagline}>Agende seu horário em segundos</p>
        </div>

        <section className={styles.card}>
          {title && <h1 className={styles.title}>{title}</h1>}
          {children}
        </section>
      </main>
    </div>
  )
}
