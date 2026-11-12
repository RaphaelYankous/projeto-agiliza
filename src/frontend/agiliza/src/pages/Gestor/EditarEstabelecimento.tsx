import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import type { AvisoNavegacao } from '../../components/AppLayout'
import { CampoFoto } from '../../components/CampoFoto'
import { TextField } from '../../components/TextField'
import {
  AVISO_FOTO_NAO_SALVA,
  FotoEstabelecimentoError,
  atualizarEstabelecimento,
  cadastrarEstabelecimento,
  enviarFotoDoNovoEstabelecimento,
  enviarFotoEstabelecimento,
  urlFotoEstabelecimento,
} from '../../services/estabelecimentoService'
import { validarArquivoFoto, validarEmail, validarTelefone } from '../../utils/validacao'
import styles from './CriarEstabelecimento.module.css'

const DIAS_SEMANA = [
  { valor: 'domingo', rotulo: 'Domingo' },
  { valor: 'segunda', rotulo: 'Segunda' },
  { valor: 'terca', rotulo: 'Terça' },
  { valor: 'quarta', rotulo: 'Quarta' },
  { valor: 'quinta', rotulo: 'Quinta' },
  { valor: 'sexta', rotulo: 'Sexta' },
  { valor: 'sabado', rotulo: 'Sábado' },
] as const

type Campos = {
  nome: string
  razaoSocial: string
  cnpj: string
  email: string
  endereco: string
  latitude: string
  longitude: string
  telefone: string
  horarioAbertura: string
  horarioFechamento: string
  diasFuncionamento: string[]
}

type EstabelecimentoRecebido = {
  id: string | number
  nome?: string
  razaoSocial?: string
  cnpj?: string
  email?: string
  endereco?: string
  latitude?: number | string
  longitude?: number | string
  telefone?: string
  horarioAbertura?: string
  horarioFechamento?: string
  diasFuncionamento?: string[]
  fotoAtualizadaEm?: string | null
}

type Erros = Partial<Record<keyof Campos, string>>

function validarCoordenada(
  valor: string,
  rotulo: string,
  minimo: number,
  maximo: number,
): string | undefined {
  if (!valor.trim()) return `${rotulo} é obrigatória`

  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero < minimo || numero > maximo) {
    return `${rotulo} deve estar entre ${minimo} e ${maximo}`
  }

  return undefined
}

function validar(campos: Campos): Erros {
  const erros: Erros = {}

  if (!campos.nome.trim()) erros.nome = 'Nome é obrigatório'
  if (!campos.razaoSocial.trim()) erros.razaoSocial = 'Razão social é obrigatória'
  if (!campos.cnpj) erros.cnpj = 'CNPJ é obrigatório'

  const email = validarEmail(campos.email)
  if (email) erros.email = email

  if (!campos.endereco.trim()) erros.endereco = 'Endereço é obrigatório'

  const latitude = validarCoordenada(campos.latitude, 'Latitude', -90, 90)
  if (latitude) erros.latitude = latitude

  const longitude = validarCoordenada(campos.longitude, 'Longitude', -180, 180)
  if (longitude) erros.longitude = longitude

  const telefone = validarTelefone(campos.telefone)
  if (telefone) erros.telefone = telefone

  if (!campos.horarioAbertura) erros.horarioAbertura = 'Horário de abertura é obrigatório'
  if (!campos.horarioFechamento) erros.horarioFechamento = 'Horário de fechamento é obrigatório'

  return erros
}

export function EditarEstabelecimento() {
  const location = useLocation()
  const navigate = useNavigate()
  const estabelecimento = (location.state?.estabelecimento ??
    null) as EstabelecimentoRecebido | null
  const modo: 'criar' | 'editar' = estabelecimento ? 'editar' : 'criar'

  const [campos, setCampos] = useState<Campos>(() => {
    const base: Campos = {
      nome: '',
      razaoSocial: '',
      cnpj: '',
      email: '',
      endereco: '',
      latitude: '',
      longitude: '',
      telefone: '',
      horarioAbertura: '',
      horarioFechamento: '',
      diasFuncionamento: [],
    }

    if (estabelecimento) {
      return {
        nome: estabelecimento.nome ?? '',
        razaoSocial: estabelecimento.razaoSocial ?? '',
        cnpj: estabelecimento.cnpj ?? '',
        email: estabelecimento.email ?? '',
        endereco: estabelecimento.endereco ?? '',
        latitude: estabelecimento.latitude != null ? String(estabelecimento.latitude) : '',
        longitude: estabelecimento.longitude != null ? String(estabelecimento.longitude) : '',
        telefone: estabelecimento.telefone ?? '',
        horarioAbertura: estabelecimento.horarioAbertura ?? '',
        horarioFechamento: estabelecimento.horarioFechamento ?? '',
        diasFuncionamento: estabelecimento.diasFuncionamento ?? [],
      }
    }

    return base
  })

  const [erros, setErros] = useState<Record<string, string>>({})
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [foto, setFoto] = useState<File>()
  const [erroFoto, setErroFoto] = useState<string>()
  const fotoAtual = estabelecimento
    ? urlFotoEstabelecimento(String(estabelecimento.id), estabelecimento.fotoAtualizadaEm)
    : null

  const escolherFoto = (arquivo: File) => {
    const erro = validarArquivoFoto(arquivo)
    setErroFoto(erro)
    if (!erro) setFoto(arquivo)
  }

  const descartarFoto = () => {
    setFoto(undefined)
    setErroFoto(undefined)
  }

  const aoAlterar =
    (campo: keyof Campos) => (evento: ChangeEvent<HTMLInputElement>) => {
      let valor = evento.target.value

      if (campo === 'cnpj') valor = valor.replace(/\D/g, '')
      if (campo === 'telefone') valor = valor.replace(/\D/g, '')

      setCampos((atuais) => ({ ...atuais, [campo]: valor }))
      if (erros[campo]) {
        setErros((atuais) => {
          const novo = { ...atuais }
          delete novo[campo]
          return novo
        })
      }
    }

  const alternarDia = (dia: string) => {
    setCampos((atuais) => {
      const jaTem = atuais.diasFuncionamento.includes(dia)
      return {
        ...atuais,
        diasFuncionamento: jaTem
          ? atuais.diasFuncionamento.filter((d) => d !== dia)
          : [...atuais.diasFuncionamento, dia],
      }
    })
  }

  const aoEnviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setErros({})

    const errosValidacao = validar(campos)
    if (Object.keys(errosValidacao).length > 0) {
      setErros(errosValidacao)
      return
    }

    setEnviando(true)
    try {
      const dados = {
        nome: campos.nome,
        razaoSocial: campos.razaoSocial,
        cnpj: campos.cnpj,
        email: campos.email,
        endereco: campos.endereco,
        latitude: Number(campos.latitude),
        longitude: Number(campos.longitude),
        telefone: campos.telefone,
        horarioAbertura: campos.horarioAbertura,
        horarioFechamento: campos.horarioFechamento,
        diasFuncionamento: campos.diasFuncionamento,
      }

      if (modo === 'editar' && estabelecimento) {
        const id = String(estabelecimento.id)
        if (foto) {
          try {
            await enviarFotoEstabelecimento(id, foto)
          } catch (erro) {
            setFoto(undefined)
            setErroFoto(
              erro instanceof FotoEstabelecimentoError
                ? erro.message
                : 'Não foi possível enviar a foto. Tente novamente.',
            )
            return
          }
        }
        await atualizarEstabelecimento(id, dados)
      } else {
        const criado = await cadastrarEstabelecimento(dados)
        const fotoSalva = await enviarFotoDoNovoEstabelecimento(criado.id, foto)
        if (!fotoSalva) {
          const aviso: AvisoNavegacao = { tipo: 'success', mensagem: AVISO_FOTO_NAO_SALVA }
          navigate('/gestor', { replace: true, state: { aviso } })
          return
        }
      }

      setSucesso(true)
      navigate('/gestor', { replace: true })
    } catch {
      setErros({ submit: 'Não foi possível salvar o estabelecimento. Tente novamente.' })
    } finally {
      setEnviando(false)
    }
  }

  if (sucesso) {
    return (
      <div className={styles.telaSucesso}>
        <h2>Estabelecimento salvo com sucesso!</h2>
        <p>
          {modo === 'editar'
            ? 'As informações foram atualizadas.'
            : 'Seu estabelecimento agora está cadastrado no sistema.'}
        </p>
        <ActionButton onClick={() => navigate('/gestor')}>
          Voltar ao painel
        </ActionButton>
      </div>
    )
  }

  return (
    <div className={styles.tela}>
      <h2>
        {modo === 'editar' ? 'Editar Estabelecimento' : 'Criar Estabelecimento'}
      </h2>

      {Object.keys(erros).length > 0 && (
        <Alert variant="error">
          <strong>{erros.submit ?? 'Por favor, corrija os erros abaixo:'}</strong>
        </Alert>
      )}

      <form className={styles.form} onSubmit={aoEnviar} noValidate>
        <CampoFoto
          rotulo={foto || fotoAtual ? 'Trocar foto principal' : 'Escolher foto principal (opcional)'}
          descricao="Prévia da foto principal do estabelecimento"
          legenda="Foto principal (opcional)"
          dica="Aparece nos cards e no topo da página do estabelecimento."
          icone="loja"
          fotoAtual={fotoAtual}
          arquivo={foto}
          aoEscolher={escolherFoto}
          aoRemover={descartarFoto}
          erro={erroFoto}
        />
        <TextField
          label="Nome fantasia"
          name="nome"
          value={campos.nome}
          onChange={aoAlterar('nome')}
          error={erros.nome}
        />
        <TextField
          label="Razão social"
          name="razaoSocial"
          value={campos.razaoSocial}
          onChange={aoAlterar('razaoSocial')}
          error={erros.razaoSocial}
        />
        <TextField
          label="CNPJ"
          name="cnpj"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          value={campos.cnpj}
          onChange={aoAlterar('cnpj')}
          error={erros.cnpj}
        />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="contato@exemplo.com"
          value={campos.email}
          onChange={aoAlterar('email')}
          error={erros.email}
        />
        <TextField
          label="Endereço"
          name="endereco"
          value={campos.endereco}
          onChange={aoAlterar('endereco')}
          error={erros.endereco}
        />
        <TextField
          label="Latitude"
          name="latitude"
          inputMode="decimal"
          placeholder="-19.920382"
          value={campos.latitude}
          onChange={aoAlterar('latitude')}
          error={erros.latitude}
        />
        <TextField
          label="Longitude"
          name="longitude"
          inputMode="decimal"
          placeholder="-43.938004"
          value={campos.longitude}
          onChange={aoAlterar('longitude')}
          error={erros.longitude}
        />
        <TextField
          label="Telefone"
          name="telefone"
          inputMode="numeric"
          placeholder="(00) 00000-0000"
          value={campos.telefone}
          onChange={aoAlterar('telefone')}
          error={erros.telefone}
        />
        <TextField
          label="Horário de abertura"
          name="horarioAbertura"
          placeholder="09:00"
          value={campos.horarioAbertura}
          onChange={aoAlterar('horarioAbertura')}
          error={erros.horarioAbertura}
        />
        <TextField
          label="Horário de fechamento"
          name="horarioFechamento"
          placeholder="20:00"
          value={campos.horarioFechamento}
          onChange={aoAlterar('horarioFechamento')}
          error={erros.horarioFechamento}
        />

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Dias de funcionamento</legend>
          <div className={styles.diasGrid}>
            {DIAS_SEMANA.map(({ valor, rotulo }) => (
              <label key={valor} className={styles.diaCheckbox}>
                <input
                  type="checkbox"
                  checked={campos.diasFuncionamento.includes(valor)}
                  onChange={() => alternarDia(valor)}
                />
                <span>{rotulo}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <ActionButton
          type="submit"
          fullWidth
          loading={enviando}
          loadingText={
            modo === 'editar'
              ? 'Salvando alterações…'
              : 'Criando estabelecimento…'
          }
        >
          {modo === 'editar' ? 'Salvar alterações' : 'Criar estabelecimento'}
        </ActionButton>
      </form>
    </div>
  )
}