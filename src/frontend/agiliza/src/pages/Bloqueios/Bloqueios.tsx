import { useEffect, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { criarBloqueio, listarBloqueios, removerBloqueio, type Bloqueio } from '../../services/agendaProfissionalService'
import styles from './Bloqueios.module.css'

function dataHoje() {
  const data = new Date()
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

function descreverErro(erro: unknown) {
  if (isAxiosError(erro)) {
    if (erro.response?.status === 404) return 'Sua conta ainda não está vinculada a um profissional. Peça ao gestor para cadastrar seu vínculo no estabelecimento.'
    if (erro.response?.status === 409) return 'Já existe um agendamento ou bloqueio neste período.'
    if (erro.response?.status === 400) return 'Verifique a data e o período informado.'
    if (erro.response?.status === 403) return 'Sua conta não tem permissão para acessar os bloqueios.'
    if (!erro.response) return 'Não foi possível conectar ao servidor. Tente novamente em instantes.'
  }
  return 'Não foi possível acessar os bloqueios. Tente novamente.'
}

export function Bloqueios() {
  const [data, setData] = useState(dataHoje)
  const [diaInteiro, setDiaInteiro] = useState(false)
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFim, setHoraFim] = useState('10:00')
  const [motivo, setMotivo] = useState('')
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [falhaListagem, setFalhaListagem] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let cancelado = false
    listarBloqueios().then((lista) => {
      if (!cancelado) { setBloqueios(lista); setErro(''); setFalhaListagem(false); setCarregando(false) }
    }).catch((falha: unknown) => {
      if (!cancelado) { setErro(descreverErro(falha)); setFalhaListagem(true); setCarregando(false) }
    })
    return () => { cancelado = true }
  }, [tentativa])

  function tentarNovamente() {
    setCarregando(true)
    setErro('')
    setTentativa((valor) => valor + 1)
  }

  async function adicionar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setSucesso('')
    if (!diaInteiro && horaFim <= horaInicio) {
      setErro('O horário final precisa ser posterior ao inicial.')
      return
    }
    setSalvando(true)
    try {
      const salvo = await criarBloqueio(data, diaInteiro ? undefined : horaInicio, diaInteiro ? undefined : horaFim, motivo.trim())
      setBloqueios((atuais) => [...atuais, salvo].sort((a, b) => b.data.localeCompare(a.data) || (a.horaInicio ?? '').localeCompare(b.horaInicio ?? '')))
      setMotivo('')
      setSucesso('Bloqueio registrado. Ele também aparece na agenda do dia.')
    } catch (falha) {
      setErro(descreverErro(falha))
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(bloqueio: Bloqueio) {
    if (!window.confirm('Remover este bloqueio? O horário voltará a ficar disponível.')) return
    setErro('')
    setSucesso('')
    setRemovendo(bloqueio.id)
    try {
      await removerBloqueio(bloqueio.id)
      setBloqueios((atuais) => atuais.filter((item) => item.id !== bloqueio.id))
      setSucesso('Bloqueio removido.')
    } catch (falha) {
      setErro(descreverErro(falha))
    } finally {
      setRemovendo(null)
    }
  }

  return <section className={styles.pagina}>
    <h1>Bloqueios</h1>
    <p className={styles.introducao}>Registre folgas, pausas e imprevistos na sua agenda.</p>
    <form className={styles.formulario} onSubmit={(evento) => void adicionar(evento)}>
      <h2>Novo bloqueio</h2>
      <label>Data<input type="date" required value={data} onChange={(evento) => setData(evento.target.value)} /></label>
      <label className={styles.checkbox}><input type="checkbox" checked={diaInteiro} onChange={(evento) => setDiaInteiro(evento.target.checked)} /> Bloquear o dia inteiro</label>
      {!diaInteiro && <div className={styles.horarios}>
        <label>Início<input type="time" required value={horaInicio} onChange={(evento) => setHoraInicio(evento.target.value)} /></label>
        <label>Fim<input type="time" required value={horaFim} onChange={(evento) => setHoraFim(evento.target.value)} /></label>
      </div>}
      <label>Motivo<input type="text" maxLength={255} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ex.: almoço, folga, consulta" /></label>
      <button type="submit" className={styles.salvar} disabled={salvando || carregando}>
        {salvando ? 'Salvando...' : 'Adicionar bloqueio'}
      </button>
    </form>

    {erro && <p role="alert" className={styles.erro}>{erro}</p>}
    {sucesso && <p role="status" className={styles.sucesso}>{sucesso}</p>}
    <div className={styles.lista}>
      <h2>Bloqueios registrados</h2>
      {carregando ? <p role="status">Carregando bloqueios...</p> :
        falhaListagem ? <div><p>Não foi possível consultar os bloqueios.</p>
          <button type="button" onClick={tentarNovamente}>Tentar novamente</button></div> :
        bloqueios.length === 0 ? <p>Nenhum bloqueio registrado.</p> :
          <ul>{bloqueios.map((item) => <li key={item.id}>
            <div>
              <strong>{new Intl.DateTimeFormat('pt-BR').format(new Date(`${item.data}T12:00:00`))}</strong>
              <span>{item.horaInicio && item.horaFim ? `${item.horaInicio.slice(0, 5)}–${item.horaFim.slice(0, 5)}` : 'Dia inteiro'}</span>
              {item.motivo && <span>Motivo: {item.motivo}</span>}
            </div>
            <button type="button" onClick={() => void excluir(item)} disabled={removendo !== null} aria-label={`Excluir bloqueio de ${item.data}`}>
              {removendo === item.id ? 'Excluindo...' : 'Excluir'}
            </button>
          </li>)}</ul>}
    </div>
  </section>
}
