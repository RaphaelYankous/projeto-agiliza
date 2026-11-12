import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { AuthLayout } from '../../components/AuthLayout'
import { TextField } from '../../components/TextField'
import { useAuth } from '../../contexts/AuthContext'
import { LoginError, entrar } from '../../services/authService'
import { validarEmail, validarObrigatorio } from '../../utils/validacao'
import styles from './Login.module.css'

type Campos = { email: string; senha: string }
type Erros = Partial<Record<keyof Campos, string>>

type EstadoNavegacao = {
  cadastroOk?: boolean
  sessaoExpirada?: boolean
  senhaRedefinida?: boolean
} | null

function validar(campos: Campos): Erros {
  const erros: Erros = {
    email: validarEmail(campos.email),
    senha: validarObrigatorio(campos.senha),
  }
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem)) as Erros
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const recado = location.state as EstadoNavegacao

  const [campos, setCampos] = useState<Campos>({ email: '', senha: '' })
  const [erros, setErros] = useState<Erros>({})
  const [erroServidor, setErroServidor] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const aoAlterar = (campo: keyof Campos) => (evento: ChangeEvent<HTMLInputElement>) => {
    const valor = evento.target.value
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  const aoEnviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setErroServidor(undefined)

    const novosErros = validar(campos)
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      const token = await entrar(campos.email, campos.senha)
      auth.entrar(token)
      navigate('/', { replace: true })
    } catch (erro) {
      setErroServidor(
        erro instanceof LoginError ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.',
      )
      setCampos((atuais) => ({ ...atuais, senha: '' }))
      setEnviando(false)
    }
  }

  const mostrarRecado = !erroServidor

  return (
    <AuthLayout title="Entrar">
      <form className={styles.form} onSubmit={aoEnviar} noValidate>
        {mostrarRecado && recado?.cadastroOk && (
          <Alert variant="success">Conta criada com sucesso! Entre com seu e-mail e senha.</Alert>
        )}
        {mostrarRecado && recado?.senhaRedefinida && (
          <Alert variant="success">Sua senha foi redefinida com sucesso. Faça login com a nova senha.</Alert>
        )}
        {mostrarRecado && recado?.sessaoExpirada && (
          <Alert variant="error">Sua sessão expirou. Entre novamente.</Alert>
        )}
        {erroServidor && <Alert variant="error">{erroServidor}</Alert>}

        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          value={campos.email}
          onChange={aoAlterar('email')}
          error={erros.email}
        />
        <TextField
          label="Senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={campos.senha}
          onChange={aoAlterar('senha')}
          error={erros.senha}
        />

        <div className={styles.esqueceuSenhaContainer}>
          <Link to="/recuperar-senha" className={styles.link}>
            Esqueceu a senha?
          </Link>
        </div>

        <ActionButton type="submit" fullWidth loading={enviando} loadingText="Entrando…">
          Entrar
        </ActionButton>

        <p className={styles.separador}>ou</p>

        <p className={styles.footer}>
          Novo por aqui?{' '}
          <Link to="/cadastro" className={styles.link}>
            Criar conta
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}