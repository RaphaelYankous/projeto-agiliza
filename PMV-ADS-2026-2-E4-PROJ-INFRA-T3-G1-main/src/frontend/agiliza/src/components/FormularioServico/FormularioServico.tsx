import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ActionButton } from '../ActionButton'
import { Alert } from '../Alert'
import { TextField } from '../TextField'
import { ServicoError, type DadosNovoServico } from '../../services/servicosService'
import { mascararInteiro, mascararMoeda, somenteDigitos } from '../../utils/mascaras'
import { validarObrigatorio } from '../../utils/validacao'
import styles from './FormularioServico.module.css'

export type ValoresServico = DadosNovoServico

type Campos = {
  nome: string
  preco: string
  duracao: string
  descricao: string
  pontoFidelidade: string
}

const CAMPOS_VAZIOS: Campos = {
  nome: '',
  preco: '',
  duracao: '',
  descricao: '',
  pontoFidelidade: '0',
}

type Erros = Partial<Record<keyof Campos, string>>

type FormularioServicoProps = {
  valoresIniciais?: ValoresServico
  textoEnviar: string
  textoEnviando: string
  aoEnviar: (valores: ValoresServico) => Promise<void>
  aoCancelar: () => void
}

function validarPositivo(valor: string, mensagemVazio: string, mensagemInvalido: string): string | undefined {
  if (valor.trim() === '') return mensagemVazio
  return Number(somenteDigitos(valor)) > 0 ? undefined : mensagemInvalido
}

function validar(campos: Campos): Erros {
  const erros: Erros = {
    nome: validarObrigatorio(campos.nome),
    preco: validarPositivo(campos.preco, 'Campo obrigatório.', 'Informe um preço maior que zero.'),
    duracao: validarPositivo(campos.duracao, 'Campo obrigatório.', 'Informe a duração em minutos.'),
    descricao: validarObrigatorio(campos.descricao),
  }
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem)) as Erros
}

function camposIniciais(valoresIniciais?: ValoresServico): Campos {
  if (!valoresIniciais) return CAMPOS_VAZIOS
  return {
    nome: valoresIniciais.nome,
    preco: valoresIniciais.preco > 0 ? mascararMoeda(String(valoresIniciais.preco)) : '',
    duracao: valoresIniciais.duracao > 0 ? String(valoresIniciais.duracao) : '',
    descricao: valoresIniciais.descricao,
    pontoFidelidade: String(valoresIniciais.pontoFidelidade),
  }
}

export function FormularioServico({
  valoresIniciais,
  textoEnviar,
  textoEnviando,
  aoEnviar,
  aoCancelar,
}: FormularioServicoProps) {
  const [campos, setCampos] = useState<Campos>(() => camposIniciais(valoresIniciais))
  const [erros, setErros] = useState<Erros>({})
  const [erroServidor, setErroServidor] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const aoAlterar = (campo: keyof Campos) => (evento: ChangeEvent<HTMLInputElement>) => {
    let valor = evento.target.value
    if (campo === 'preco') valor = mascararMoeda(valor)
    if (campo === 'duracao' || campo === 'pontoFidelidade') valor = mascararInteiro(valor)

    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  const aoSubmeter = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setErroServidor(undefined)

    const novosErros = validar(campos)
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      await aoEnviar({
        nome: campos.nome,
        preco: Number(somenteDigitos(campos.preco)),
        descricao: campos.descricao,
        duracao: Number(somenteDigitos(campos.duracao)),
        pontoFidelidade:
          campos.pontoFidelidade.trim() === '' ? 0 : Number(somenteDigitos(campos.pontoFidelidade)),
      })
    } catch (erro) {
      setErroServidor(
        erro instanceof ServicoError ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.',
      )
      setEnviando(false)
    }
  }

  return (
    <form className={styles.cartao} onSubmit={aoSubmeter} noValidate>
      {erroServidor && <Alert variant="error">{erroServidor}</Alert>}

      <TextField
        label="Nome"
        name="nome"
        autoComplete="off"
        value={campos.nome}
        onChange={aoAlterar('nome')}
        error={erros.nome}
      />

      <div className={styles.linha}>
        <TextField
          label="Preço (R$)"
          name="preco"
          inputMode="numeric"
          placeholder="0,00"
          value={campos.preco}
          onChange={aoAlterar('preco')}
          error={erros.preco}
        />
        <TextField
          label="Duração (minutos)"
          name="duracao"
          inputMode="numeric"
          placeholder="0"
          value={campos.duracao}
          onChange={aoAlterar('duracao')}
          error={erros.duracao}
        />
      </div>

      <TextField
        label="Descrição"
        name="descricao"
        autoComplete="off"
        value={campos.descricao}
        onChange={aoAlterar('descricao')}
        error={erros.descricao}
      />

      <TextField
        label="Pontos de fidelidade"
        name="pontoFidelidade"
        inputMode="numeric"
        placeholder="0"
        value={campos.pontoFidelidade}
        onChange={aoAlterar('pontoFidelidade')}
        error={erros.pontoFidelidade}
      />

      <div className={styles.acoes}>
        <ActionButton variant="secondary" disabled={enviando} onClick={aoCancelar}>
          Cancelar
        </ActionButton>
        <ActionButton type="submit" loading={enviando} loadingText={textoEnviando}>
          {textoEnviar}
        </ActionButton>
      </div>
    </form>
  )
}
