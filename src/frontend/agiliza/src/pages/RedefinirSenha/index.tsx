import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { AuthLayout } from '../../components/AuthLayout'
import { TextField } from '../../components/TextField'
import { RedefinirSenhaError, redefinirSenha } from '../../services/authService'
import { validarObrigatorio } from '../../utils/validacao'
import styles from './RedefinirSenha.module.css'

type Campos = {
  novaSenha: string
  confirmarSenha: string
}

type Erros = Partial<Record<keyof Campos, string>>

export function RedefinirSenha() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [campos, setCampos] = useState<Campos>({ novaSenha: '', confirmarSenha: '' })
  const [erros, setErros] = useState<Erros>({})
  const [erroServidor, setErroServidor] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const aoAlterar = (campo: keyof Campos) => (evento: ChangeEvent<HTMLInputElement>) => {
    const valor = evento.target.value
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  const validar = (): Erros => {
    const novosErros: Erros = {}

    const erroObrigatorio = validarObrigatorio(campos.novaSenha)
    if (erroObrigatorio) {
      novosErros.novaSenha = erroObrigatorio
    } else if (campos.novaSenha.length < 6) {
      novosErros.novaSenha = 'A senha deve ter pelo menos 6 caracteres.'
    }

    if (!campos.confirmarSenha) {
      novosErros.confirmarSenha = 'Confirme sua nova senha.'
    } else if (campos.novaSenha !== campos.confirmarSenha) {
      novosErros.confirmarSenha = 'As senhas não coincidem.'
    }

    return novosErros
  }

  const aoEnviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setErroServidor(undefined)

    if (!token) {
      setErroServidor('Token de recuperação não encontrado. Solicite um novo link.')
      return
    }

    const novosErros = validar()
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      await redefinirSenha(token, campos.novaSenha)
      navigate('/login', { state: { senhaRedefinida: true }, replace: true })
    } catch (err) {
      setErroServidor(
        err instanceof RedefinirSenhaError
          ? err.message
          : 'Ocorreu um erro ao redefinir a senha. Tente novamente.',
      )
      setEnviando(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Redefinir senha">
        <div className={styles.form}>
          <Alert variant="error">
            Link de recuperação inválido ou incompleto. Solicite um novo link para continuar.
          </Alert>
          <p className={styles.footer}>
            <Link to="/recuperar-senha" className={styles.link}>
              Solicitar nova recuperação
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Redefinir senha">
      <form className={styles.form} onSubmit={aoEnviar} noValidate>
        <p className={styles.instrucao}>
          Digite sua nova senha abaixo. Ela deve conter no mínimo 6 caracteres.
        </p>

        {erroServidor && <Alert variant="error">{erroServidor}</Alert>}

        <TextField
          label="Nova Senha"
          name="novaSenha"
          type="password"
          autoComplete="new-password"
          value={campos.novaSenha}
          onChange={aoAlterar('novaSenha')}
          error={erros.novaSenha}
        />

        <TextField
          label="Confirmar Nova Senha"
          name="confirmarSenha"
          type="password"
          autoComplete="new-password"
          value={campos.confirmarSenha}
          onChange={aoAlterar('confirmarSenha')}
          error={erros.confirmarSenha}
        />

        <ActionButton type="submit" fullWidth loading={enviando} loadingText="Salvando…">
          Salvar nova senha
        </ActionButton>

        <p className={styles.footer}>
          Lembrou a senha?{' '}
          <Link to="/login" className={styles.link}>
            Voltar para o login
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}