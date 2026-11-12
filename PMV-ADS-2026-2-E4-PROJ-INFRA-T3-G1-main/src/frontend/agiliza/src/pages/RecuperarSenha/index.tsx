import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { AuthLayout } from '../../components/AuthLayout'
import { TextField } from '../../components/TextField'
import { RecuperarSenhaError, solicitarRecuperacaoSenha } from '../../services/authService'
import { validarEmail } from '../../utils/validacao'
import styles from './RecuperarSenha.module.css'


export function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [erroEmail, setErroEmail] = useState<string>()
  const [erroServidor, setErroServidor] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const aoAlterar = (evento: ChangeEvent<HTMLInputElement>) => {
    setEmail(evento.target.value)
    if (erroEmail) setErroEmail(undefined)
  }

  const aoEnviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setErroServidor(undefined)

    const erro = validarEmail(email)
    if (erro) {
      setErroEmail(erro)
      return
    }

    setEnviando(true)
    try {
      await solicitarRecuperacaoSenha(email)
      setSucesso(true)
    } catch (err) {
      setErroServidor(
        err instanceof RecuperarSenhaError
          ? err.message
          : 'Ocorreu um erro inesperado. Tente novamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout title="Recuperar senha">
      <form className={styles.form} onSubmit={aoEnviar} noValidate>
        {sucesso ? (
          <>
            <Alert variant="success">
              Se o e-mail informado estiver cadastrado, enviamos as instruções para redefinir sua senha. Verifique também a pasta de spam.
            </Alert>
            <p className={styles.footer}>
              Lembrou a senha?{' '}
              <Link to="/login" className={styles.link}>
                Voltar para o login
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className={styles.instrucao}>
              Informe o e-mail associado à sua conta para receber o link de redefinição de senha.
            </p>

            {erroServidor && <Alert variant="error">{erroServidor}</Alert>}

            <TextField
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={aoAlterar}
              error={erroEmail}
            />

            <ActionButton type="submit" fullWidth loading={enviando} loadingText="Enviando…">
              Enviar link de recuperação
            </ActionButton>

            <p className={styles.footer}>
              Lembrou a senha?{' '}
              <Link to="/login" className={styles.link}>
                Voltar para o login
              </Link>
            </p>
          </>
        )}
      </form>
    </AuthLayout>
  )
}