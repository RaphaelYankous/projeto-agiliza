import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ActionButton } from '../ActionButton'
import { Alert } from '../Alert'
import { CampoFoto } from '../CampoFoto'
import { SelecaoChips, type OpcaoChip } from '../SelecaoChips'
import { TextField } from '../TextField'
import {
  ProfissionalError,
  listarServicos,
  type DadosNovoProfissional,
} from '../../services/profissionaisService'
import { mascararCpf, mascararTelefone } from '../../utils/mascaras'
import {
  validarCpf,
  validarEmail,
  validarObrigatorio,
  validarSenha,
  validarArquivoFoto,
  validarTelefone,
} from '../../utils/validacao'
import styles from './FormularioProfissional.module.css'

export type ValoresProfissional = DadosNovoProfissional & { foto?: File }

type Campos = Omit<ValoresProfissional, 'servicoIds' | 'foto'>
type Erros = Partial<Record<keyof Campos | 'servicoIds' | 'foto', string>>

type EstadoServicos =
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'pronto'; opcoes: OpcaoChip[] }

type FormularioProfissionalProps = {
  modo: 'cadastro' | 'edicao'
  estabelecimentoId: string
  valoresIniciais?: ValoresProfissional
  fotoAtual?: string | null
  textoEnviar: string
  textoEnviando: string
  aoEnviar: (valores: ValoresProfissional) => Promise<void>
  aoCancelar: () => void
  secaoExtra?: ReactNode
}

const VALORES_VAZIOS: ValoresProfissional = {
  nome: '',
  sobrenome: '',
  email: '',
  cpf: '',
  telefone: '',
  senha: '',
  servicoIds: [],
}

function validar(modo: FormularioProfissionalProps['modo'], campos: Campos, servicoIds: string[]): Erros {
  const erros: Erros = {
    nome: validarObrigatorio(campos.nome),
    sobrenome: validarObrigatorio(campos.sobrenome),
    email: validarEmail(campos.email),
    cpf: modo === 'cadastro' ? validarCpf(campos.cpf) : undefined,
    telefone: validarTelefone(campos.telefone),
    senha: modo === 'cadastro' ? validarSenha(campos.senha) : undefined,
    servicoIds: servicoIds.length === 0 ? 'Selecione ao menos um serviço.' : undefined,
  }
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem)) as Erros
}

export function FormularioProfissional({
  modo,
  estabelecimentoId,
  valoresIniciais = VALORES_VAZIOS,
  fotoAtual = null,
  textoEnviar,
  textoEnviando,
  aoEnviar,
  aoCancelar,
  secaoExtra,
}: FormularioProfissionalProps) {
  const [campos, setCampos] = useState<Campos>(() => ({
    nome: valoresIniciais.nome,
    sobrenome: valoresIniciais.sobrenome,
    email: valoresIniciais.email,
    cpf: mascararCpf(valoresIniciais.cpf),
    telefone: mascararTelefone(valoresIniciais.telefone),
    senha: valoresIniciais.senha,
  }))
  const [servicoIds, setServicoIds] = useState<string[]>(valoresIniciais.servicoIds)
  const [foto, setFoto] = useState<File>()
  const [servicos, setServicos] = useState<EstadoServicos>({ status: 'carregando' })
  const [erros, setErros] = useState<Erros>({})
  const [erroServidor, setErroServidor] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const [tentativasComErro, setTentativasComErro] = useState(0)
  const formulario = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (tentativasComErro === 0) return
    const alvo = formulario.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [role="group"][aria-describedby], [role="alert"]',
    )
    alvo?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    alvo?.focus({ preventScroll: true })
  }, [tentativasComErro])

  useEffect(() => {
    let ativo = true

    listarServicos(estabelecimentoId)
      .then((lista) => {
        if (!ativo) return
        setServicos({
          status: 'pronto',
          opcoes: lista.map((servico) => ({ valor: servico.id, rotulo: servico.nome })),
        })
      })
      .catch(() => {
        if (ativo) setServicos({ status: 'erro' })
      })

    return () => {
      ativo = false
    }
  }, [estabelecimentoId])

  const edicao = modo === 'edicao'

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

  const aoSelecionarServicos = (selecionados: string[]) => {
    setServicoIds(selecionados)
    if (erros.servicoIds) setErros((atuais) => ({ ...atuais, servicoIds: undefined }))
  }

  const aoSubmeter = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setErroServidor(undefined)

    const novosErros = validar(modo, campos, servicoIds)
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) {
      setTentativasComErro((atual) => atual + 1)
      return
    }

    setEnviando(true)
    try {
      await aoEnviar({ ...campos, servicoIds, foto })
    } catch (erro) {
      if (erro instanceof ProfissionalError && erro.campo) {
        const campo = erro.campo
        setErros((atuais) => ({ ...atuais, [campo]: erro.message }))
      } else {
        setErroServidor(
          erro instanceof ProfissionalError ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.',
        )
      }
      setTentativasComErro((atual) => atual + 1)
      setEnviando(false)
    }
  }

  const semServicos = servicos.status === 'pronto' && servicos.opcoes.length === 0

  return (
    <form ref={formulario} className={styles.cartao} onSubmit={aoSubmeter} noValidate>
      {erroServidor && <Alert variant="error">{erroServidor}</Alert>}

      <CampoFoto
        rotulo={edicao ? 'Trocar foto' : 'Escolher foto'}
        descricao={edicao ? 'Foto do profissional' : 'Prévia da foto do profissional'}
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
          placeholder="000.000.000-00"
          value={campos.cpf}
          onChange={aoAlterar('cpf')}
          readOnly={edicao}
          error={erros.cpf}
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

      {!edicao && (
        <TextField
          label="Senha de acesso"
          name="senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo de 6 caracteres"
          value={campos.senha}
          onChange={aoAlterar('senha')}
          error={erros.senha}
        />
      )}

      {servicos.status === 'carregando' && <p className={styles.carregando}>Carregando serviços…</p>}
      {servicos.status === 'erro' && (
        <Alert variant="error">Não foi possível carregar os serviços do estabelecimento.</Alert>
      )}
      {servicos.status === 'pronto' && (
        <SelecaoChips
          rotulo="Serviços"
          opcoes={servicos.opcoes}
          selecionados={servicoIds}
          onChange={aoSelecionarServicos}
          erro={erros.servicoIds}
          mensagemVazia="Nenhum serviço cadastrado no estabelecimento."
        />
      )}

      {secaoExtra}

      <div className={styles.acoes}>
        <ActionButton variant="secondary" onClick={aoCancelar}>
          Cancelar
        </ActionButton>
        <ActionButton
          type="submit"
          loading={enviando}
          loadingText={textoEnviando}
          disabled={servicos.status !== 'pronto' || semServicos}
        >
          {textoEnviar}
        </ActionButton>
      </div>
    </form>
  )
}
