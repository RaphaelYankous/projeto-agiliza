import { useEffect, useMemo, useState } from 'react'
import { consultarAgendaDoProfissional, type AgendaDoDia } from '../../services/agendaProfissionalService'
import { useEstabelecimentoDoGestor } from '../../hooks/useEstabelecimentoDoGestor'
import { useProfissionaisDoEstabelecimento } from '../../hooks/useProfissionaisDoEstabelecimento'
import styles from './AgendaEquipe.module.css'

function dataLocal(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(`${data}T12:00:00`))
}

function hora(valor: string) { return valor.includes('T') ? valor.split('T')[1].slice(0, 5) : valor.slice(0, 5) }

type StatusMini = 'livre' | 'agendado' | 'bloqueado'
function miniHorarios(agenda: AgendaDoDia) {
  const blocos: { hora: string; status: StatusMini }[] = []
  for (const disponibilidade of agenda.disponibilidades) {
    const [inicioHora, inicioMinuto] = disponibilidade.horaInicio.split(':').map(Number)
    const [fimHora, fimMinuto] = disponibilidade.horaFim.split(':').map(Number)
    for (let minutos = inicioHora * 60 + inicioMinuto; minutos < fimHora * 60 + fimMinuto; minutos += 30) {
      const inicio = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
      const agendado = agenda.agendamentos.some((item) => inicio >= hora(item.horaInicio) && inicio < hora(item.horaFim))
      const bloqueado = agenda.bloqueios.some((item) => !item.horaInicio || !item.horaFim || (inicio >= hora(item.horaInicio) && inicio < hora(item.horaFim)))
      blocos.push({ hora: inicio, status: bloqueado ? 'bloqueado' : agendado ? 'agendado' : 'livre' })
    }
  }
  return blocos
}

export function AgendaEquipe() {
  const estabelecimento = useEstabelecimentoDoGestor()
  const profissionais = useProfissionaisDoEstabelecimento(
    estabelecimento.status === 'pronto' ? estabelecimento.estabelecimento.id : undefined,
  )
  const [dia, setDia] = useState(() => dataLocal(new Date()))
  const [selecionado, setSelecionado] = useState<string>()
  const [agenda, setAgenda] = useState<AgendaDoDia | null>(null)
  const [agendas, setAgendas] = useState<Record<string, AgendaDoDia>>({})
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (profissionais.estado.status !== 'pronto') return
    let ativo = true
    Promise.all(profissionais.estado.profissionais.map(async (item) => [item.id, await consultarAgendaDoProfissional(item.id, dia)] as const))
      .then((resultados) => { if (ativo) setAgendas(Object.fromEntries(resultados)) })
      .catch(() => { /* A agenda detalhada exibe o erro da seleção atual. */ })
    return () => { ativo = false }
  }, [profissionais.estado, dia])

  useEffect(() => {
    if (profissionais.estado.status !== 'pronto') return
    if (!selecionado && profissionais.estado.profissionais[0]) setSelecionado(profissionais.estado.profissionais[0].id)
  }, [profissionais.estado, selecionado])

  useEffect(() => {
    if (!selecionado) return
    let ativo = true
    setCarregando(true)
    consultarAgendaDoProfissional(selecionado, dia).then((dados) => {
      if (ativo) { setAgenda(dados); setErro('') }
    }).catch(() => { if (ativo) { setAgenda(null); setErro('Não foi possível carregar esta agenda.') } })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [selecionado, dia])

  const profissional = useMemo(() => profissionais.estado.status === 'pronto'
    ? profissionais.estado.profissionais.find((item) => item.id === selecionado) : undefined, [profissionais.estado, selecionado])

  const hoje = dataLocal(new Date())
  return <section className={styles.pagina}>
    <header className={styles.cabecalho}>
      <div><p className={styles.kicker}>GESTÃO DA EQUIPE</p><h1>Agenda dos profissionais</h1>
        <p className={styles.subtitulo}>Acompanhe os atendimentos e a disponibilidade de toda a sua barbearia.</p></div>
      <label className={styles.data}>Dia da agenda<input type="date" value={dia} onChange={(evento) => setDia(evento.target.value)} /></label>
    </header>

    {profissionais.estado.status === 'carregando' && <p role="status" className={styles.aviso}>Carregando profissionais...</p>}
    {(estabelecimento.status === 'erro' || profissionais.estado.status === 'erro') && <p role="alert" className={styles.erro}>Não foi possível carregar a equipe.</p>}
    {estabelecimento.status === 'semEstabelecimento' && <div className={styles.vazio}><h2>Nenhum estabelecimento vinculado</h2><p>Cadastre um estabelecimento para acompanhar a agenda da equipe.</p></div>}
    {profissionais.estado.status === 'pronto' && profissionais.estado.profissionais.length === 0 && <div className={styles.vazio}><h2>Nenhum profissional cadastrado</h2><p>Cadastre profissionais para acompanhar suas agendas aqui.</p></div>}
    {profissionais.estado.status === 'pronto' && profissionais.estado.profissionais.length > 0 && <>
      <div className={styles.cartoes} aria-label="Profissionais da equipe">
        {profissionais.estado.profissionais.map((item) => <button key={item.id} type="button" className={[styles.cartao, item.id === selecionado ? styles.ativo : ''].join(' ')} onClick={() => setSelecionado(item.id)}>
          <span className={styles.cartaoCabecalho}><span className={styles.avatar}>{item.nome.charAt(0)}{item.sobrenome.charAt(0)}</span><span className={styles.dados}><strong>{item.nome} {item.sobrenome}</strong><small>{item.servicos.length} {item.servicos.length === 1 ? 'serviço' : 'serviços'} oferecidos</small></span><span className={styles.chevron}>›</span></span>
          {agendas[item.id] ? <span className={styles.miniAgenda} aria-label={`Miniagenda de ${item.nome}`}><span className={styles.miniLegenda}><i className={styles.livre} /> Livre <i className={styles.agendado} /> Agendado <i className={styles.bloqueado} /> Bloqueado</span><span className={styles.blocos}>{miniHorarios(agendas[item.id]).map((bloco) => <span key={bloco.hora} className={[styles.bloco, styles[bloco.status]].join(' ')} title={`${bloco.hora} · ${bloco.status}`} />)}</span></span> : <span className={styles.carregandoMini}>Carregando horários...</span>}
        </button>)}
      </div>
      <article className={styles.painel}>
        <div className={styles.painelTopo}><div><p className={styles.kicker}>AGENDA SELECIONADA</p><h2>{profissional?.nome} {profissional?.sobrenome}</h2><p className={styles.dia}>{dia === hoje ? 'Hoje' : formatarData(dia)}</p></div><span className={styles.selo}>Somente visualização</span></div>
        {erro && <p role="alert" className={styles.erro}>{erro}</p>}
        {carregando ? <p role="status" className={styles.aviso}>Carregando agenda...</p> : agenda && <>
          <div className={styles.gradeDetalhada} aria-label="Horários da agenda selecionada">
            {miniHorarios(agenda).map((bloco) => <div key={bloco.hora} className={[styles.horarioCard, styles[bloco.status]].join(' ')}>
              <time>{bloco.hora}</time><span>{bloco.status === 'livre' ? 'Livre' : bloco.status === 'agendado' ? 'Agendado' : 'Bloqueado'}</span>
            </div>)}
          </div>
          <div className={styles.lista}>
          {agenda.agendamentos.length === 0 && agenda.bloqueios.length === 0 && <p className={styles.aviso}>Nenhum atendimento ou bloqueio neste dia.</p>}
          {agenda.agendamentos.map((item) => <div className={styles.atendimento} key={item.id}><time>{hora(item.horaInicio)}<small> até {hora(item.horaFim)}</small></time><div><strong>{item.cliente}</strong><span>{item.servico}</span></div><b>Agendado</b></div>)}
          {agenda.bloqueios.map((item) => <div className={styles.bloqueio} key={item.id}><time>{item.horaInicio && item.horaFim ? `${hora(item.horaInicio)}–${hora(item.horaFim)}` : 'Dia inteiro'}</time><div><strong>Horário bloqueado</strong><span>{item.motivo || 'Sem motivo informado'}</span></div></div>)}
          </div>
        </>}
      </article>
    </>}
  </section>
}
