import { ActionButton } from '../../components/ActionButton'
import { FotoEstabelecimento } from '../../components/FotoEstabelecimento'
import { Icone } from '../../components/Icone'
import {
  STATUS_AGENDAMENTO,
  type AgendamentoDoCliente,
  type StatusAgendamento,
} from '../../services/agendamentosService'
import { formatarDataHora } from '../../utils/formatacao'
import styles from './MeusAgendamentos.module.css'

const ROTULO_STATUS: Record<StatusAgendamento, string> = {
  [STATUS_AGENDAMENTO.PENDENTE]: 'pendente',
  [STATUS_AGENDAMENTO.CONFIRMADO]: 'confirmado',
  [STATUS_AGENDAMENTO.CONCLUIDO]: 'concluído',
  [STATUS_AGENDAMENTO.CANCELADO]: 'cancelado',
}

const CLASSE_STATUS: Record<StatusAgendamento, string> = {
  [STATUS_AGENDAMENTO.PENDENTE]: styles.statusPendente,
  [STATUS_AGENDAMENTO.CONFIRMADO]: styles.statusConfirmado,
  [STATUS_AGENDAMENTO.CONCLUIDO]: styles.statusConcluido,
  [STATUS_AGENDAMENTO.CANCELADO]: styles.statusCancelado,
}

type CartaoAgendamentoProps = {
  agendamento: AgendamentoDoCliente
  cancelavel: boolean
  aoCancelar: (agendamento: AgendamentoDoCliente) => void
  // Nota que o cliente já deu a este atendimento, se houver.
  notaAvaliacao?: number
  avaliavel?: boolean
  aoAvaliar?: (agendamento: AgendamentoDoCliente) => void
}

export function CartaoAgendamento({
  agendamento,
  cancelavel,
  aoCancelar,
  notaAvaliacao,
  avaliavel = false,
  aoAvaliar,
}: CartaoAgendamentoProps) {
  const { estabelecimento, servico, profissional, status, dataHoraInicio } = agendamento
  const nomeProfissional = `${profissional.nome} ${profissional.sobrenome}`

  return (
    <article className={styles.cartao}>
      <FotoEstabelecimento
        className={styles.imagem}
        id={estabelecimento.id}
        nome={estabelecimento.nome}
        fotoAtualizadaEm={estabelecimento.fotoAtualizadaEm}
        alt=""
        carregamento="lazy"
      />
      <div className={styles.info}>
        <h2 className={styles.estabelecimento}>{estabelecimento.nome}</h2>
        <p className={styles.dataHora}>
          <Icone nome="relogio" tamanho={16} />
          {formatarDataHora(dataHoraInicio)}
        </p>
        <p className={styles.servico}>Profissional: {nomeProfissional}</p>
        <p className={styles.servico}>{servico.nome}</p>
      </div>
      <div className={styles.lateral}>
        <span className={`${styles.status} ${CLASSE_STATUS[status]}`}>{ROTULO_STATUS[status]}</span>
        {cancelavel && (
          <ActionButton
            variant="dangerOutline"
            className={styles.cancelar}
            aria-label={`Cancelar agendamento de ${servico.nome} em ${estabelecimento.nome}`}
            onClick={() => aoCancelar(agendamento)}
          >
            Cancelar
          </ActionButton>
        )}
        {notaAvaliacao !== undefined && (
          <button
            type="button"
            className={styles.avaliado}
            aria-label={`Ver avaliação de ${servico.nome} com ${nomeProfissional} em ${estabelecimento.nome}: nota ${notaAvaliacao} de 5`}
            onClick={() => aoAvaliar?.(agendamento)}
          >
            <Icone nome="estrela" tamanho={14} preenchido />
            Avaliado {notaAvaliacao}
          </button>
        )}
        {avaliavel && notaAvaliacao === undefined && aoAvaliar && (
          <ActionButton
            variant="outline"
            className={styles.avaliar}
            aria-label={`Avaliar atendimento de ${servico.nome} com ${nomeProfissional} em ${estabelecimento.nome}`}
            onClick={() => aoAvaliar(agendamento)}
          >
            Avaliar
          </ActionButton>
        )}
      </div>
    </article>
  )
}
