import { useState } from 'react'
import { ActionButton } from '../ActionButton'
import { Alert } from '../Alert'
import { Modal } from '../Modal'
import { mensagemDeErroDaAgenda } from '../../services/agendaProfissionalService'
import { type Funcionamento, type HorarioSemanal, horaCurta, validarHorario } from '../../utils/horarios'
import styles from './EditorHorarios.module.css'

const DIAS_COM_ARTIGO = [
  'no domingo', 'na segunda-feira', 'na terça-feira', 'na quarta-feira',
  'na quinta-feira', 'na sexta-feira', 'no sábado',
]

const DIAS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

export type HorarioDaLista = HorarioSemanal & { id: string }

type EditorHorariosProps = {
  horarios: HorarioDaLista[]
  funcionamento?: Funcionamento
  carregando?: boolean
  tituloLista?: string
  confirmarRemocao?: boolean
  aoAdicionar: (horario: HorarioSemanal) => Promise<void> | void
  aoRemover: (id: string) => Promise<void> | void
}

const emOrdem = (horarios: HorarioDaLista[]) =>
  [...horarios].sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio))

export function EditorHorarios({
  horarios,
  funcionamento: funcionamentoInformado,
  carregando = false,
  tituloLista = 'Horários cadastrados',
  confirmarRemocao = false,
  aoAdicionar,
  aoRemover,
}: EditorHorariosProps) {
  const funcionamento =
    funcionamentoInformado?.horarioAbertura && funcionamentoInformado.horarioFechamento ? funcionamentoInformado : undefined
  const [diaSemana, setDiaSemana] = useState(1)
  const [horaInicio, setHoraInicio] = useState(funcionamento ? horaCurta(funcionamento.horarioAbertura) : '08:00')
  const [horaFim, setHoraFim] = useState(funcionamento ? horaCurta(funcionamento.horarioFechamento) : '20:00')
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState<string>()
  const [erro, setErro] = useState('')
  const [paraRemover, setParaRemover] = useState<HorarioDaLista>()

  async function adicionar() {
    if (salvando) return
    const horario = { diaSemana, horaInicio, horaFim }
    const invalido = validarHorario(horario, horarios, funcionamento)
    if (invalido) {
      setErro(invalido)
      return
    }
    setSalvando(true)
    setErro('')
    try {
      await aoAdicionar(horario)
    } catch (falha) {
      setErro(mensagemDeErroDaAgenda(falha, 'Não foi possível adicionar o horário.'))
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id: string) {
    setRemovendo(id)
    setErro('')
    try {
      await aoRemover(id)
    } catch (falha) {
      setErro(mensagemDeErroDaAgenda(falha, 'Não foi possível remover o horário.'))
    } finally {
      setRemovendo(undefined)
      setParaRemover(undefined)
    }
  }

  function pedirRemocao(item: HorarioDaLista) {
    if (confirmarRemocao) setParaRemover(item)
    else void remover(item.id)
  }

  return (
    <>
      <section className={styles.painel}>
        <h2>Adicionar horário semanal</h2>
        {funcionamento && <p className={styles.funcionamento}>
          Funcionamento do estabelecimento: {horaCurta(funcionamento.horarioAbertura)} às {horaCurta(funcionamento.horarioFechamento)}
        </p>}
        <div className={styles.formulario}>
          <label>Dia da semana
            <select value={diaSemana} onChange={(evento) => setDiaSemana(Number(evento.target.value))}>
              {DIAS.map((dia, indice) => <option key={dia} value={indice}>{dia}</option>)}
            </select>
          </label>
          <label>Início
            <input type="time" value={horaInicio} onChange={(evento) => setHoraInicio(evento.target.value)} />
          </label>
          <label>Fim
            <input type="time" value={horaFim} onChange={(evento) => setHoraFim(evento.target.value)} />
          </label>
        </div>
        <ActionButton fullWidth loading={salvando} loadingText="Adicionando..." onClick={() => void adicionar()}>
          Adicionar horário
        </ActionButton>
      </section>

      {erro && <Alert variant="error">{erro}</Alert>}
      <section className={styles.painel}>
        <h2>{tituloLista}</h2>
        {carregando ? <p>Carregando horários...</p> : horarios.length === 0 ? <p>Nenhum horário semanal cadastrado.</p> :
          <ul className={styles.lista}>
            {emOrdem(horarios).map((item) => <li key={item.id}>
              <div><strong>{DIAS[item.diaSemana]}</strong><span>{horaCurta(item.horaInicio)} às {horaCurta(item.horaFim)}</span></div>
              <ActionButton variant="dangerOutline" disabled={removendo === item.id} onClick={() => pedirRemocao(item)}>
                {removendo === item.id ? 'Removendo...' : 'Remover'}
              </ActionButton>
            </li>)}
          </ul>}
      </section>

      {paraRemover && (
        <Modal titulo="Remover horário" aoFechar={() => setParaRemover(undefined)} fechamentoBloqueado={Boolean(removendo)}>
          <p className={styles.confirmacao}>
            Deseja remover o horário {DIAS_COM_ARTIGO[paraRemover.diaSemana]}, das {horaCurta(paraRemover.horaInicio)} às {horaCurta(paraRemover.horaFim)}?
          </p>
          <div className={styles.acoesModal}>
            <ActionButton variant="secondary" disabled={Boolean(removendo)} onClick={() => setParaRemover(undefined)}>
              Cancelar
            </ActionButton>
            <ActionButton variant="danger" loading={Boolean(removendo)} loadingText="Removendo..." onClick={() => void remover(paraRemover.id)}>
              Remover
            </ActionButton>
          </div>
        </Modal>
      )}
    </>
  )
}
