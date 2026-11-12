import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { AuthLayout } from '../../components/AuthLayout'
import { CampoFoto } from '../../components/CampoFoto'
import { SegmentedControl } from '../../components/SegmentedControl'
import { TextField } from '../../components/TextField'
import {
  CadastroError,
  cadastrarUsuario,
  type DadosCadastro,
  type PerfilCadastro,
} from '../../services/cadastroService'
import { mascararCpf, mascararTelefone } from '../../utils/mascaras'
import {
  validarConfirmacaoSenha,
  validarCpf,
  validarEmail,
  validarObrigatorio,
  validarSenha,
  validarArquivoFoto,
  validarTelefone,
} from '../../utils/validacao'
import styles from './Cadastro.module.css'

type Campos = Omit<DadosCadastro, 'foto'> & { confirmacaoSenha: string }
type Erros = Partial<Record<keyof Campos | 'foto', string>>

const CAMPOS_VAZIOS: Campos = {
  nome: '',
  sobrenome: '',
  email: '',
  cpf: '',
  telefone: '',
  senha: '',
  confirmacaoSenha: '',
}

const OPCOES_PERFIL: { value: PerfilCadastro; label: string }[] = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'gestor', label: 'Gestor de estabelecimento' },
]

function validar(campos: Campos): Erros {
  const erros: Erros = {
    nome: validarObrigatorio(campos.nome),
    sobrenome: validarObrigatorio(campos.sobrenome),
    email: validarEmail(campos.email),
    cpf: validarCpf(campos.cpf),
    telefone: validarTelefone(campos.telefone),
    senha: validarSenha(campos.senha),
    confirmacaoSenha: validarConfirmacaoSenha(campos.senha, campos.confirmacaoSenha),
  }
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem)) as Erros
}

export function Cadastro() {
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState<PerfilCadastro>('cliente')
  const [campos, setCampos] = useState<Campos>(CAMPOS_VAZIOS)
  const [foto, setFoto] = useState<File>()
  const [erros, setErros] = useState<Erros>({})
  const [erroServidor, setErroServidor] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const aoAlterar = (campo: keyof Campos) => (evento: ChangeEvent<HTMLInputElement>) => {
    let valor = evento.target.value
    if (campo === 'cpf') valor = mascararCpf(valor)
    if (campo === 'telefone') valor = mascararTelefone(valor)

    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  const aoEscolherFoto = (arquivo: File) => {
    const erro = validarArquivoFoto(arquivo)
    setErros((atuais) => ({ ...atuais, foto: erro }))
    if (!erro) setFoto(arquivo)
  }

  const aoRemoverFoto = () => {
    setFoto(undefined)
    setErros((atuais) => ({ ...atuais, foto: undefined }))
  }

  const aoEnviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setErroServidor(undefined)

    const novosErros = validar(campos)
    if (erros.foto) novosErros.foto = erros.foto
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      await cadastrarUsuario(perfil, { ...campos, foto })
      navigate('/login', { state: { cadastroOk: true } })
    } catch (erro) {
      if (erro instanceof CadastroError && erro.campo === 'foto') {
        setFoto(undefined)
        setErros((atuais) => ({ ...atuais, foto: erro.message }))
        return
      }
      setErroServidor(
        erro instanceof CadastroError ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout title="Criar conta">
      <form className={styles.form} onSubmit={aoEnviar} noValidate>
        <SegmentedControl
          ariaLabel="Tipo de conta"
          options={OPCOES_PERFIL}
          value={perfil}
          onChange={setPerfil}
        />

        {erroServidor && <Alert variant="error">{erroServidor}</Alert>}

        <CampoFoto
          rotulo={foto ? 'Trocar foto' : 'Escolher foto'}
          descricao="Prévia da sua foto"
          arquivo={foto}
          aoEscolher={aoEscolherFoto}
          aoRemover={aoRemoverFoto}
          erro={erros.foto}
        />

        <div className={styles.row}>
          <TextField
            label="Nome"
            name="nome"
            autoComplete="given-name"
            value={campos.nome}
            onChange={aoAlterar('nome')}
            error={erros.nome}
          />
          <TextField
            label="Sobrenome"
            name="sobrenome"
            autoComplete="family-name"
            value={campos.sobrenome}
            onChange={aoAlterar('sobrenome')}
            error={erros.sobrenome}
          />
        </div>

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

        <div className={styles.row}>
          <TextField
            label="CPF"
            name="cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={campos.cpf}
            onChange={aoAlterar('cpf')}
            error={erros.cpf}
          />
          <TextField
            label="Telefone"
            name="telefone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(00) 00000-0000"
            value={campos.telefone}
            onChange={aoAlterar('telefone')}
            error={erros.telefone}
          />
        </div>

        <TextField
          label="Senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo de 6 caracteres"
          value={campos.senha}
          onChange={aoAlterar('senha')}
          error={erros.senha}
        />
        <TextField
          label="Confirmar senha"
          name="confirmacaoSenha"
          type="password"
          autoComplete="new-password"
          value={campos.confirmacaoSenha}
          onChange={aoAlterar('confirmacaoSenha')}
          error={erros.confirmacaoSenha}
        />

        <ActionButton type="submit" fullWidth loading={enviando} loadingText="Criando conta…">
          Criar conta
        </ActionButton>

        <p className={styles.footer}>
          Já tem uma conta?{' '}
          <Link to="/login" className={styles.link}>
            Realizar login
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
