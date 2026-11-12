import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link } from 'react-router'
import {
  consultarMinhaAgenda, criarBloqueio, removerBloqueio,
  type AgendaDoDia, type Agendamento, type Bloqueio,
} from '../../services/agendaProfissionalService'
import { Icone } from '../../components/Icone'
import { Modal } from '../../components/Modal'
import styles from './AgendaProfissional.module.css'

type Horario = { inicio: number; fim: number; tipo: 'livre' | 'agendado' | 'bloqueado'; agendamento?: Agendamento; bloqueio?: Bloqueio }

function dataLocal(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

function minutos(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function hora(minutosDoDia: number) {
  return `${String(Math.floor(minutosDoDia / 60)).padStart(2, '0')}:${String(minutosDoDia % 60).padStart(2, '0')}`
}

function minutosDaData(data: string, dia: string) {
  const instante = new Date(data)
  return (instante.getTime() - new Date(`${dia}T00:00:00`).getTime()) / 60_000
}

function grade(agenda: AgendaDoDia): Horario[] {
  const janelas = agenda.disponibilidades
    .map((d) => ({ inicio: minutos(d.horaInicio), fim: minutos(d.horaFim) }))
    .filter((d) => d.fim > d.inicio)
  if (!janelas.length) return []

  const pontos = new Set<number>()
  for (const janela of janelas) {
    pontos.add(janela.inicio)
    pontos.add(janela.fim)
    for (let p = janela.inicio + 30; p < janela.fim; p += 30) pontos.add(p)
  }
  for (const a of agenda.agendamentos) {
    pontos.add(minutosDaData(a.horaInicio, agenda.data))
    pontos.add(minutosDaData(a.horaFim, agenda.data))
  }
  for (const b of agenda.bloqueios) {
    if (b.horaInicio) pontos.add(minutos(b.horaInicio))
    if (b.horaFim) pontos.add(minutos(b.horaFim))
  }

  const limites = [...pontos].filter((p) => p >= 0 && p <= 1440).sort((a, b) => a - b)
  const linhas: Horario[] = []
  for (let i = 0; i < limites.length - 1; i++) {
    const inicio = limites[i]
    const fim = limites[i + 1]
    if (!janelas.some((janela) => inicio >= janela.inicio && fim <= janela.fim)) continue
    const bloqueio = agenda.bloqueios.find((b) =>
      !b.horaInicio || !b.horaFim || (inicio < minutos(b.horaFim) && fim > minutos(b.horaInicio)))
    const agendamento = agenda.agendamentos.find((a) =>
      inicio < minutosDaData(a.horaFim, agenda.data) && fim > minutosDaData(a.horaInicio, agenda.data))
    const tipo = bloqueio ? 'bloqueado' : agendamento ? 'agendado' : 'livre'
    const anterior = linhas[linhas.length - 1]
    if (tipo !== 'livre' && anterior?.fim === inicio && anterior.tipo === tipo &&
      (tipo === 'bloqueado' ? anterior.bloqueio?.id === bloqueio?.id : anterior.agendamento?.id === agendamento?.id)) {
      anterior.fim = fim
    } else {
      linhas.push({ inicio, fim, tipo, bloqueio, agendamento })
    }
  }
  return linhas
}

function mensagemErro(erro: unknown) {
  if (isAxiosError(erro)) {
    if (erro.response?.status === 404) return 'Seu perfil profissional ainda não está vinculado a um estabelecimento.'
    if (erro.response?.status === 409) return 'Este horário acabou de ser ocupado. A agenda foi atualizada.'
    if (erro.response?.status === 400) return 'Horário indisponível para bloqueio. A agenda foi atualizada.'
  }
  return 'Não foi possível acessar a agenda. Tente novamente.'
}

export function AgendaProfissional() {
  const [dia, setDia] = useState(() => dataLocal(new Date()))
  const [agenda, setAgenda] = useState<AgendaDoDia | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [erroOperacao, setErroOperacao] = useState('')
  const [selecionado, setSelecionado] = useState<Horario | null>(null)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [atualizacao, setAtualizacao] = useState(0)

  useEffect(() => {
    let cancelado = false
    consultarMinhaAgenda(dia).then((resposta) => {
      if (!cancelado) { setAgenda(resposta); setErro(''); setCarregando(false) }
    }).catch((falha: unknown) => {
      if (!cancelado) { setAgenda(null); setErro(mensagemErro(falha)); setCarregando(false) }
    })
    return () => { cancelado = true }
  }, [dia, atualizacao])

  const diasSemana = useMemo(() => {
    const [ano, mes, diaDoMes] = dia.split('-').map(Number)
    const inicio = new Date(ano, mes - 1, diaDoMes)
    inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, indice) => {
      const data = new Date(inicio)
      data.setDate(inicio.getDate() + indice)
      return data
    })
  }, [dia])

  const horarios = useMemo(() => agenda ? grade(agenda) : [], [agenda])
  const hoje = dataLocal(new Date())

  function escolherDia(proximo: string) {
    if (proximo === dia) return
    setDia(proximo)
    setAgenda(null)
    setSelecionado(null)
    setCarregando(true)
    setErro('')
    setErroOperacao('')
  }

  function navegarSemana(deslocamento: number) {
    const destino = new Date(diasSemana[0])
    destino.setDate(destino.getDate() + deslocamento * 7)
    escolherDia(dataLocal(destino))
  }

  async function confirmar() {
    if (!selecionado || salvando) return
    setSalvando(true)
    try {
      if (selecionado.tipo === 'livre') {
        await criarBloqueio(dia, hora(selecionado.inicio), hora(selecionado.fim), motivo.trim())
      } else if (selecionado.tipo === 'bloqueado' && selecionado.bloqueio) {
        await removerBloqueio(selecionado.bloqueio.id)
      }
      setSelecionado(null)
      setMotivo('')
      setErroOperacao('')
      setCarregando(true)
      setAtualizacao((valor) => valor + 1)
    } catch (falha) {
      setErroOperacao(mensagemErro(falha))
      setSelecionado(null)
      setCarregando(true)
      setAtualizacao((valor) => valor + 1)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className={styles.agenda}>
      <header className={styles.cabecalho}>
        <h1>Minha agenda · {dia === hoje ? 'Hoje' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(`${dia}T12:00:00`))}</h1>
        <button type="button" className={styles.hoje} onClick={() => escolherDia(hoje)} disabled={dia === hoje}>Ir para hoje</button>
      </header>

      <div className={styles.navegacao}>
        <button type="button" onClick={() => navegarSemana(-1)} aria-label="Semana anterior"><Icone nome="seta-esquerda" /></button>
        <span>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(diasSemana[0])}</span>
        <button type="button" onClick={() => navegarSemana(1)} aria-label="Próxima semana"><Icone nome="seta-direita" /></button>
      </div>
      <div className={styles.dias} aria-label="Dias da semana">
        {diasSemana.map((data) => {
          const valor = dataLocal(data)
          return <button key={valor} type="button" aria-pressed={valor === dia}
            className={[styles.dia, valor === dia ? styles.diaAtivo : ''].join(' ')}
            onClick={() => escolherDia(valor)}>
            <span>{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(data).replace('.', '')}</span>
            <strong>{data.getDate()}</strong>
          </button>
        })}
      </div>

      {erro && <p role="alert" className={styles.erro}>{erro}</p>}
      {erroOperacao && <p role="alert" className={styles.erro}>{erroOperacao}</p>}
      {carregando ? <p role="status" className={styles.aviso}>Carregando agenda...</p> :
        agenda && (horarios.length ? <div className={styles.grade} aria-label="Horários do dia">
          {horarios.map((item) => <div key={`${item.inicio}-${item.fim}`} className={styles.linha}>
            <time className={styles.horario}>{hora(item.inicio)}</time>
            <button type="button" className={[styles.bloco, styles[item.tipo]].join(' ')}
              onClick={() => { setSelecionado(item); setMotivo(''); setErroOperacao('') }}
              aria-label={`${hora(item.inicio)} a ${hora(item.fim)}: ${item.tipo === 'livre' ? 'Livre, bloquear horário' : item.tipo === 'bloqueado' ? `Bloqueado${item.bloqueio?.motivo ? `, ${item.bloqueio.motivo}` : ''}, ver detalhes` : `${item.agendamento?.cliente}, ${item.agendamento?.servico}, ver detalhes`}`}>
              {item.tipo === 'livre' ? 'Livre' : item.tipo === 'bloqueado' ? `Bloqueado${item.bloqueio?.motivo ? ` (${item.bloqueio.motivo})` : ''}` : `${item.agendamento?.cliente} · ${item.agendamento?.servico}`}
            </button>
          </div>)}
        </div> : <p role="status" className={styles.aviso}>Sem horários de atendimento neste dia. {agenda.bloqueios.length > 0 ? 'Há bloqueios registrados abaixo.' : 'Seus horários de atendimento ainda não foram configurados para este dia da semana.'}</p>)}

      {agenda && !carregando && horarios.length === 0 && agenda.bloqueios.length > 0 &&
        <div className={styles.bloqueiosDoDia}>
          <h2>Bloqueios do dia</h2>
          {agenda.bloqueios.map((bloqueio) => <p key={bloqueio.id}>
            {bloqueio.horaInicio && bloqueio.horaFim ? `${bloqueio.horaInicio.slice(0, 5)}–${bloqueio.horaFim.slice(0, 5)}` : 'Dia inteiro'}
            {bloqueio.motivo ? ` · ${bloqueio.motivo}` : ''}
          </p>)}
        </div>}

      {agenda && !carregando && <p className={styles.linkBloqueios}><Link to="/bloqueios">Adicionar ou gerenciar bloqueios</Link></p>}

      {selecionado && <Modal
        titulo={selecionado.tipo === 'livre' ? 'Bloquear horário' : selecionado.tipo === 'bloqueado' ? 'Horário bloqueado' : 'Atendimento agendado'}
        aoFechar={() => setSelecionado(null)}
      >
        <p>{hora(selecionado.inicio)}–{hora(selecionado.fim)} · {new Intl.DateTimeFormat('pt-BR').format(new Date(`${dia}T12:00:00`))}</p>
        {selecionado.agendamento && <p>{selecionado.agendamento.cliente} · {selecionado.agendamento.servico}</p>}
        {selecionado.bloqueio?.motivo && <p>Motivo: {selecionado.bloqueio.motivo}</p>}
        {selecionado.tipo === 'livre' && <label className={styles.campo}>Motivo (opcional)
          <input value={motivo} maxLength={255} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ex.: almoço" />
        </label>}
        <div className={styles.acoes}>
          <button type="button" autoFocus onClick={() => setSelecionado(null)} disabled={salvando}>Fechar</button>
          {selecionado.tipo !== 'agendado' && <button type="button" className={styles.confirmar} onClick={() => void confirmar()} disabled={salvando}>
            {salvando ? 'Aguarde...' : selecionado.tipo === 'livre' ? 'Confirmar bloqueio' : 'Remover bloqueio'}
          </button>}
        </div>
      </Modal>}
    </section>
  )
}
