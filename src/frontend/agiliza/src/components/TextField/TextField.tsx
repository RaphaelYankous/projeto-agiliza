import { useId, useState, type InputHTMLAttributes } from 'react'
import { Icone } from '../Icone'
import styles from './TextField.module.css'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function TextField({ label, error, type = 'text', id, className, ...rest }: TextFieldProps) {
  const idGerado = useId()
  const inputId = id ?? idGerado
  const erroId = `${inputId}-erro`
  const ehSenha = type === 'password'
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>

      <div className={`${styles.inputWrapper} ${error ? styles.hasError : ''}`}>
        <input
          id={inputId}
          type={ehSenha && senhaVisivel ? 'text' : type}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? erroId : undefined}
          {...rest}
        />

        {ehSenha && (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setSenhaVisivel((visivel) => !visivel)}
            aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={senhaVisivel}
          >
            <Icone nome={senhaVisivel ? 'olho-riscado' : 'olho'} />
          </button>
        )}
      </div>

      {error && (
        <span id={erroId} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}
