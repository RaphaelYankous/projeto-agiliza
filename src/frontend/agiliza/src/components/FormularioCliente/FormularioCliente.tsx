import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ActionButton } from '../ActionButton'
import { Alert } from '../Alert'
import { CampoFoto } from '../CampoFoto'
import { TextField } from '../TextField'
import { ClienteError, type DadosEdicaoCliente } from '../../services/clientesService'
import { mascararCpf, mascararTelefone } from '../../utils/mascaras'
import {
  validarEmail,
  validarObrigatorio,
  validarArquivoFoto,
  validarTelefone,
} from '../../utils/validacao'
import styles from './FormularioCliente.module.css'

type Erros = Partial<Record<keyof DadosEdicaoCliente, string>>

type FormularioClienteProps = {
  valoresIniciais: DadosEdicaoCliente
  fotoAtual?: string | null
  aoEnviar: (valores: DadosEdicaoCliente) => Promise<void>
  aoCancelar: () => void
}

function validar(campos: DadosEdicaoCliente): Erros {
  const erros: Erros = {
    nome: validarObrigatorio(campos.nome),
    sobrenome: validarObrigatorio(campos.sobrenome),
    email: validarEmail(campos.email),
    telefone: validarTelefone(campos.telefone),
  }
  return Object.fromEntries(Object.entries(erros).filter(([, msg]) => msg)) as Erros
}

export function FormularioCliente({
  valoresIniciais,
  fotoAtual = null,
  aoEnviar,
  aoCancelar,
}: FormularioClienteProps) {
  const [campos, setCampos] = useState<DadosEdicaoCliente>(() => ({
    ...valoresIniciais,
    cpf: mascararCpf(valoresIniciais.cpf),
    telefone: mascararTelefone(valoresIniciais.telefone),
  }))
  const [foto, setFoto] = useState<File>()
  const [erros, setErros] = useState<Erros>({})
  const [erroServidor, setErroServidor] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const aoAlterar = (campo: keyof DadosEdicaoCliente) => (evento: ChangeEvent<HTMLInputElement>) => {
    let valor = evento.target.value
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

  const aoSubmeter = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setErroServidor(undefined)

    const novosErros = validar(campos)
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      await aoEnviar({ ...campos, foto })
    } catch (erro) {
      if (erro instanceof ClienteError && erro.campo) {
        setErros((atuais) => ({ ...atuais, [erro.campo!]: erro.message }))
      } else {
        setErroServidor(
          erro instanceof ClienteError ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.',
        )
      }
      setEnviando(false)
    }
  }

  return (
    <form className={styles.cartao} onSubmit={aoSubmeter} noValidate>
      {erroServidor && <Alert variant="error">{erroServidor}</Alert>}

      <CampoFoto
        rotulo="Trocar foto"
        descricao="Foto de perfil"
        fotoAtual={fotoAtual}
        arquivo={foto}
        aoEscolher={aoEscolherFoto}
        aoRemover={aoRemoverFoto}
        erro={erros.foto}
      />

      <div className={styles.linha}>
        <TextField
          label="Nome"
          name="nome"
          autoComplete="off"
          value={campos.nome}
          onChange={aoAlterar('nome')}
          error={erros.nome}
        />
        <TextField
          label="Sobrenome"
          name="sobrenome"
          autoComplete="off"
          value={campos.sobrenome}
          onChange={aoAlterar('sobrenome')}
          error={erros.sobrenome}
        />
      </div>

      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="off"
        value={campos.email}
        onChange={aoAlterar('email')}
        error={erros.email}
      />

      <div className={styles.linha}>
        <TextField
          label="CPF"
          name="cpf"
          inputMode="numeric"
          value={campos.cpf}
          readOnly
        />
        <TextField
          label="Telefone"
          name="telefone"
          type="tel"
          inputMode="numeric"
          placeholder="(00) 00000-0000"
          value={campos.telefone}
          onChange={aoAlterar('telefone')}
          error={erros.telefone}
        />
      </div>

      <div className={styles.acoes}>
        <ActionButton variant="secondary" onClick={aoCancelar} disabled={enviando}>
          Voltar
        </ActionButton>
        <ActionButton
          type="submit"
          loading={enviando}
          loadingText="Salvando…"
        >
          Salvar alterações
        </ActionButton>
      </div>
    </form>
  )
}