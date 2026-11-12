import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Alert } from '../../components/Alert'
import { api } from '../../services/api'
import { criarAgendamento } from '../../services/agendamentosService'
import { buscarEstabelecimentoPorId } from '../../services/estabelecimentoService'
import styles from './EscolhaHorarios.module.css'

const DURACAO_SLOT = 30

function dataLocal(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

function inicioDeHoje() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return hoje
}

function formatarHora(valor: string) {
  return valor.slice(0, 5)
}

function paraMinutos(horario: string) {
  const [horas, minutos] = horario.split(':').map(Number)
  return horas * 60 + minutos
}

function gerarGrade(abertura: string, fechamento: string) {
  const valores: string[] = []
  const inicio = Math.ceil(paraMinutos(abertura) / DURACAO_SLOT) * DURACAO_SLOT
  for (let minutos = inicio; minutos < paraMinutos(fechamento); minutos += DURACAO_SLOT) {
    valores.push(`${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`)
  }
  return valores
}

function criarDias(inicio: Date) {
  return Array.from({ length: 7 }, (_, indice) => {
    const data = new Date(inicio)
    data.setDate(inicio.getDate() + indice)
    return data
  })
}

function proximoInicioDaSemana(data: Date) {
  const inicio = new Date(data)
  inicio.setDate(data.getDate() - ((data.getDay() + 6) % 7))
  return inicio
}

function formatarPeriodo(dias: Date[]) {
  const primeiro = dias[0]
  const ultimo = dias[dias.length - 1]
  const formatoMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
  const mesInicial = formatoMes.format(primeiro)
  const mesFinal = formatoMes.format(ultimo)
  const anoInicial = primeiro.getFullYear()
  const anoFinal = ultimo.getFullYear()

  if (mesInicial === mesFinal && anoInicial === anoFinal) return `${mesInicial} de ${anoInicial}`
  if (anoInicial === anoFinal) return `${mesInicial}–${mesFinal} de ${anoInicial}`
  return `${mesInicial} de ${anoInicial}–${mesFinal} de ${anoFinal}`
}

export function EscolhaHorarios() {
  const navigate = useNavigate()
  const location = useLocation()
  const [parametros] = useSearchParams()
  const profissionalId = parametros.get('profissionalId') ?? ''
  const servicoId = parametros.get('servicoId') ?? ''
  const estabelecimentoId = parametros.get('estabelecimentoId') ?? ''
  const parametrosInvalidos = !profissionalId || !servicoId || !estabelecimentoId
  const [semana, setSemana] = useState(() => proximoInicioDaSemana(new Date()))
  const [mesAtual, setMesAtual] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [dia, setDia] = useState(() => dataLocal(new Date()))
  const [horarios, setHorarios] = useState<string[]>([])
  const [funcionamento, setFuncionamento] = useState<{ abertura: string; fechamento: string } | null>(null)
  const [erroFuncionamento, setErroFuncionamento] = useState('')
  const [selecionado, setSelecionado] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const primeiraConsulta = useRef(true)

  const dias = useMemo(() => criarDias(semana), [semana])
  const slots = useMemo(
    () => (funcionamento ? gerarGrade(funcionamento.abertura, funcionamento.fechamento) : []),
    [funcionamento],
  )

  useEffect(() => {
    if (parametrosInvalidos) return
    let cancelado = false
    buscarEstabelecimentoPorId(estabelecimentoId)
      .then((estabelecimento) => {
        if (!cancelado) setFuncionamento({ abertura: estabelecimento.horarioAbertura, fechamento: estabelecimento.horarioFechamento })
      })
      .catch(() => {
        if (!cancelado) setErroFuncionamento('Não foi possível carregar os horários. Tente novamente.')
      })
    return () => { cancelado = true }
  }, [estabelecimentoId, parametrosInvalidos])

  useEffect(() => {
    if (parametrosInvalidos) return
    let cancelado = false

    async function consultar(data: string) {
      const resposta = await api.get<string[]>(`/profissionais/${profissionalId}/horarios-disponiveis`, {
        params: { data, servicoId },
      })
      return resposta.data.map(formatarHora)
    }

    async function carregar() {
      setCarregando(true)
      setErro('')
      setHorarios([])

      try {
        if (primeiraConsulta.current) {
          primeiraConsulta.current = false
          const hoje = inicioDeHoje()
          for (let deslocamento = 0; deslocamento < 60; deslocamento += 1) {
            const data = new Date(hoje)
            data.setDate(hoje.getDate() + deslocamento)
            const valor = dataLocal(data)
            const disponiveis = await consultar(valor)
            if (disponiveis.length > 0) {
              setMesAtual(new Date(data.getFullYear(), data.getMonth(), 1))
              setSemana(proximoInicioDaSemana(data))
              setDia(valor)
              setHorarios(disponiveis)
              return
            }
          }
          setErro('Não há horários disponíveis nos próximos 60 dias.')
          return
        }

        setHorarios(await consultar(dia))
      } catch {
        if (!cancelado) setErro('Não foi possível carregar os horários. Tente novamente.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    void carregar()
    return () => { cancelado = true }
  }, [dia, parametrosInvalidos, profissionalId, servicoId])

  function escolherDia(data: Date) {
    if (data < inicioDeHoje()) return
    setCarregando(true)
    setErro('')
    setSelecionado('')
    setDia(dataLocal(data))
  }

  function mudarSemana(deslocamento: number) {
    const novoMes = new Date(mesAtual)
    novoMes.setMonth(novoMes.getMonth() + deslocamento)
    const primeiroDia = new Date(novoMes.getFullYear(), novoMes.getMonth(), 1)
    const primeiroDiaSelecionavel = primeiroDia < inicioDeHoje() ? inicioDeHoje() : primeiroDia
    setMesAtual(primeiroDia)
    setSemana(proximoInicioDaSemana(primeiroDia))
    escolherDia(primeiroDiaSelecionavel)
  }

  function mudarDias(deslocamento: number) {
    const novaSemana = new Date(semana)
    novaSemana.setDate(novaSemana.getDate() + deslocamento * 7)
    if (novaSemana < proximoInicioDaSemana(inicioDeHoje())) return
    const primeiroDia = novaSemana < inicioDeHoje() ? inicioDeHoje() : novaSemana
    setSemana(novaSemana)
    setMesAtual(new Date(novaSemana.getFullYear(), novaSemana.getMonth(), 1))
    escolherDia(primeiroDia)
  }

  async function confirmar() {
    if (!selecionado || salvando) return
    setSalvando(true)
    try {
      await criarAgendamento({ profissionalId, servicoId, dataHoraInicio: `${dia}T${selecionado}:00` })
      navigate('/cliente/agendamentos', { state: { aviso: { tipo: 'success', mensagem: 'Agendamento confirmado com sucesso.' } } })
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível confirmar o agendamento.')
      setSelecionado('')
      try {
        const resposta = await api.get<string[]>(`/profissionais/${profissionalId}/horarios-disponiveis`, {
          params: { data: dia, servicoId },
        })
        setHorarios(resposta.data.map(formatarHora))
      } catch {
        setHorarios([])
      }
    } finally {
      setSalvando(false)
    }
  }

  const mes = formatarPeriodo(dias)

  return (
    <section className={styles.pagina}>
      <Link to={location.state?.origem ?? '/'} className={styles.voltar}>← Voltar</Link>
      <header className={styles.cabecalho}>
        <div>
          <p className={styles.eyebrow}>Agendamento</p>
          <h1>Escolha um horário</h1>
        </div>
        <div className={styles.mes}>
          <button type="button" onClick={() => mudarSemana(-1)} aria-label="Mês anterior" disabled={mesAtual <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)}>‹</button>
          <strong>{mes}</strong>
          <button type="button" onClick={() => mudarSemana(1)} aria-label="Próximo mês">›</button>
        </div>
      </header>

      <div className={styles.navegacaoDias}>
        <button type="button" onClick={() => mudarDias(-1)} aria-label="Dias anteriores" disabled={semana <= proximoInicioDaSemana(inicioDeHoje())}>‹</button>
        <div className={styles.dias} aria-label="Escolha uma data">
          {dias.map((data) => {
            const valor = dataLocal(data)
            const ativo = valor === dia
            const passado = data < inicioDeHoje()
            return <button key={valor} type="button" disabled={passado} className={`${styles.dia} ${ativo ? styles.diaAtivo : ''}`} aria-pressed={ativo} onClick={() => escolherDia(data)}>
              <span>{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(data).replace('.', '')}</span>
              <strong>{data.getDate()}</strong>
            </button>
          })}
        </div>
        <button type="button" onClick={() => mudarDias(1)} aria-label="Próximos dias">›</button>
      </div>

      <div className={styles.separador} />
      <div className={styles.tituloGrade}>
        <h2>Horários disponíveis</h2>
        <span>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(`${dia}T12:00:00`))}</span>
      </div>
      {(parametrosInvalidos || erro || erroFuncionamento) && <Alert variant="error">{parametrosInvalidos ? 'Selecione um profissional e um serviço antes de escolher o horário.' : erroFuncionamento || erro}</Alert>}
      {parametrosInvalidos ? <p className={styles.aviso} role="status">Escolha um profissional e um serviço para ver os horários.</p> : erroFuncionamento ? null : carregando || !funcionamento ? <p className={styles.aviso} role="status">Carregando horários...</p> : horarios.length === 0 ? (erro ? null : <p className={styles.aviso} role="status">Não há horários disponíveis neste dia.</p>) :
        <div className={styles.grade} aria-label="Horários do dia">
          {slots.map((slot) => {
            const disponivel = horarios.includes(slot)
            const ativo = selecionado === slot
            return <button key={slot} type="button" disabled={!disponivel} aria-pressed={ativo} className={`${styles.horario} ${!disponivel ? styles.indisponivel : ''} ${ativo ? styles.horarioAtivo : ''}`} onClick={() => setSelecionado(slot)}>
              <span>{slot}</span>{!disponivel && <small>indisp.</small>}
            </button>
          })}
        </div>}

      <div className={styles.legenda}>
        <span><i className={styles.pontoDisponivel} />Disponível</span>
        <span><i className={styles.pontoSelecionado} />Selecionado</span>
        <span><i className={styles.pontoIndisponivel} />Indisponível</span>
      </div>
      <button type="button" className={styles.confirmar} disabled={!selecionado || salvando} onClick={() => void confirmar()}>
        {salvando ? 'Confirmando...' : selecionado ? `Confirmar as ${selecionado}` : 'Selecione um horário'}
      </button>
    </section>
  )
}