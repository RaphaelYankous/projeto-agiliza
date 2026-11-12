import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { Modal } from '../../components/Modal'
import { SegmentedControl } from '../../components/SegmentedControl'
import { useMeusAgendamentos } from '../../hooks/useMeusAgendamentos'
import { useMinhasAvaliacoes } from '../../hooks/useMinhasAvaliacoes'
import {
  AgendamentoError,
  STATUS_AGENDAMENTO,
  cancelarAgendamento,
  podeCancelar,
  type AgendamentoDoCliente,
} from '../../services/agendamentosService'
import { formatarDataHora } from '../../utils/formatacao'
import { CartaoAgendamento } from './CartaoAgendamento'
import styles from './MeusAgendamentos.module.css'

type Aba = 'proximos' | 'historico'

const ABAS: { value: Aba; label: string }[] = [
  { value: 'proximos', label: 'Próximos' },
  { value: 'historico', label: 'Histórico' },
]

const VAZIO: Record<Aba, { titulo: string; texto: string }> = {
  proximos: {
    titulo: 'Nenhum agendamento próximo',
    texto: 'Quando você agendar um serviço, ele aparece aqui.',
  },
  historico: {
    titulo: 'Nenhum agendamento no histórico',
    texto: 'Atendimentos concluídos e cancelados aparecem aqui.',
  },
}

const inicioEmMs = (agendamento: AgendamentoDoCliente) => new Date(agendamento.dataHoraInicio).getTime()

export function MeusAgendamentos() {
  const navigate = useNavigate()
  const { estado, atualizarStatus } = useMeusAgendamentos()
  const { estado: estadoAvaliacoes } = useMinhasAvaliacoes()
  const [aba, setAba] = useState<Aba>('proximos')
  const [agora] = useState(() => Date.now())
  const [paraCancelar, setParaCancelar] = useState<AgendamentoDoCliente>()
  const [cancelando, setCancelando] = useState(false)
  const [erroCancelamento, setErroCancelamento] = useState<string>()
  const [sucesso, setSucesso] = useState<string>()

  const abrirCancelamento = (agendamento: AgendamentoDoCliente) => {
    setErroCancelamento(undefined)
    setSucesso(undefined)
    setParaCancelar(agendamento)
  }

  const confirmarCancelamento = async () => {
    if (!paraCancelar) return
    setCancelando(true)
    setErroCancelamento(undefined)
    try {
      await cancelarAgendamento(paraCancelar.id)
      atualizarStatus(paraCancelar.id, STATUS_AGENDAMENTO.CANCELADO)
      setSucesso('Agendamento cancelado com sucesso.')
      setParaCancelar(undefined)
    } catch (erro) {
      setErroCancelamento(
        erro instanceof AgendamentoError ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.',
      )
    } finally {
      setCancelando(false)
    }
  }

  // Enquanto as avaliações carregam, o botão "Avaliar" não aparece (evita piscar antes do selo "Avaliado").
  const notaDoAtendimento = (agendamento: AgendamentoDoCliente) =>
    estadoAvaliacoes.status === 'pronto'
      ? estadoAvaliacoes.avaliacoes.find((avaliacao) => avaliacao.agendamentoId === agendamento.id)?.nota
      : undefined
  const podeAvaliar = (agendamento: AgendamentoDoCliente) =>
    agendamento.status === STATUS_AGENDAMENTO.CONCLUIDO && estadoAvaliacoes.status !== 'carregando'

  const agendamentos = estado.status === 'pronto' ? estado.agendamentos : []
  const ehProximo = (agendamento: AgendamentoDoCliente) =>
    podeCancelar(agendamento.status) && inicioEmMs(agendamento) > agora
  const exibidos =
    aba === 'proximos'
      ? agendamentos.filter(ehProximo).sort((a, b) => inicioEmMs(a) - inicioEmMs(b))
      : agendamentos.filter((agendamento) => !ehProximo(agendamento)).sort((a, b) => inicioEmMs(b) - inicioEmMs(a))

  return (
    <section className={styles.pagina}>
      <h1 className={styles.titulo}>Meus agendamentos</h1>

      <SegmentedControl ariaLabel="Filtrar agendamentos" options={ABAS} value={aba} onChange={setAba} />

      {sucesso && <Alert variant="success">{sucesso}</Alert>}

      {estado.status === 'carregando' && (
        <p role="status" className={styles.carregando}>
          Carregando agendamentos…
        </p>
      )}
      {estado.status === 'erro' && (
        <Alert variant="error">
          Não foi possível carregar seus agendamentos. Verifique sua conexão e tente novamente.
        </Alert>
      )}

      {estado.status === 'pronto' &&
        (exibidos.length === 0 ? (
          <div className={styles.vazio}>
            <h2>{VAZIO[aba].titulo}</h2>
            <p>{VAZIO[aba].texto}</p>
          </div>
        ) : (
          <ul className={styles.lista}>
            {exibidos.map((agendamento) => (
              <li key={agendamento.id}>
                <CartaoAgendamento
                  agendamento={agendamento}
                  cancelavel={ehProximo(agendamento)}
                  aoCancelar={abrirCancelamento}
                  notaAvaliacao={notaDoAtendimento(agendamento)}
                  avaliavel={podeAvaliar(agendamento)}
                  aoAvaliar={(item) => navigate(`/cliente/agendamentos/${item.id}/avaliar`)}
                />
              </li>
            ))}
          </ul>
        ))}

      {paraCancelar && (
        <Modal
          titulo="Cancelar agendamento"
          aoFechar={() => setParaCancelar(undefined)}
          fechamentoBloqueado={cancelando}
        >
          <p className={styles.confirmacao}>
            Deseja cancelar <strong>{paraCancelar.servico.nome}</strong> em{' '}
            <strong>{paraCancelar.estabelecimento.nome}</strong>, {formatarDataHora(paraCancelar.dataHoraInicio)}? O
            horário volta a ficar livre.
          </p>
          {erroCancelamento && <Alert variant="error">{erroCancelamento}</Alert>}
          <div className={styles.acoesModal}>
            <ActionButton variant="secondary" disabled={cancelando} onClick={() => setParaCancelar(undefined)}>
              Manter agendamento
            </ActionButton>
            <ActionButton
              variant="danger"
              loading={cancelando}
              loadingText="Cancelando…"
              onClick={() => void confirmarCancelamento()}
            >
              Cancelar agendamento
            </ActionButton>
          </div>
        </Modal>
      )}
    </section>
  )
}
