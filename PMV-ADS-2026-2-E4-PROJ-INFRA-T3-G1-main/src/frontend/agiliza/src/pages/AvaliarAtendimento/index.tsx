import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { AvisoNavegacao } from '../../components/AppLayout'
import { Alert } from '../../components/Alert'
import { Icone } from '../../components/Icone'
import { SeletorEstrelas } from '../../components/SeletorEstrelas'
import { useMeusAgendamentos } from '../../hooks/useMeusAgendamentos'
import { useMinhasAvaliacoes } from '../../hooks/useMinhasAvaliacoes'
import { STATUS_AGENDAMENTO } from '../../services/agendamentosService'
import styles from './AvaliarAtendimento.module.css'
import { FormularioAvaliacao } from './FormularioAvaliacao'
import { FotoAvaliacao } from './FotoAvaliacao'

const LISTA = '/cliente/agendamentos'

const formatarData = (dataIso: string) => new Date(dataIso).toLocaleDateString('pt-BR')

export function AvaliarAtendimento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { estado: estadoAgendamentos } = useMeusAgendamentos()
  const { estado: estadoAvaliacoes } = useMinhasAvaliacoes()
  // Fica true quando o servidor responde 409 (avaliado em outra aba, por exemplo).
  const [jaAvaliadoAgora, setJaAvaliadoAgora] = useState(false)

  const aoEnviar = () => {
    const aviso: AvisoNavegacao = { tipo: 'success', mensagem: 'Avaliação enviada. Obrigado!' }
    navigate(LISTA, { state: { aviso } })
  }

  const voltar = (
    <Link to={LISTA} className={styles.voltar}>
      <Icone nome="voltar" tamanho={16} />
      Voltar
    </Link>
  )

  const carregando = estadoAgendamentos.status === 'carregando' || estadoAvaliacoes.status === 'carregando'
  const comErro = estadoAgendamentos.status === 'erro' || estadoAvaliacoes.status === 'erro'

  if (comErro) {
    return (
      <section className={styles.pagina}>
        {voltar}
        <Alert variant="error">Não foi possível carregar o atendimento. Verifique sua conexão e tente novamente.</Alert>
      </section>
    )
  }

  if (carregando || estadoAgendamentos.status !== 'pronto' || estadoAvaliacoes.status !== 'pronto') {
    return (
      <section className={styles.pagina}>
        {voltar}
        <p role="status" className={styles.mensagem}>
          Carregando atendimento…
        </p>
      </section>
    )
  }

  const agendamento = estadoAgendamentos.agendamentos.find((item) => item.id === id)
  const avaliacao = estadoAvaliacoes.avaliacoes.find((item) => item.agendamentoId === id)

  let conteudo
  if (!agendamento) {
    conteudo = <Alert variant="error">Atendimento não encontrado.</Alert>
  } else {
    const resumo = (
      <div className={styles.resumo}>
        <strong className={styles.estabelecimento}>{agendamento.estabelecimento.nome}</strong>
        <span className={styles.detalhe}>
          {agendamento.servico.nome} • {formatarData(agendamento.dataHoraInicio)}
        </span>
        <span className={styles.detalhe}>
          Profissional: {agendamento.profissional.nome} {agendamento.profissional.sobrenome}
        </span>
      </div>
    )

    if (avaliacao || jaAvaliadoAgora) {
      conteudo = (
        <>
          {resumo}
          <div className={styles.jaAvaliado} role="status">
            <h2 className={styles.tituloAviso}>Este atendimento já foi avaliado</h2>
            {avaliacao && (
              <SeletorEstrelas rotulo="Sua nota" valor={avaliacao.nota} somenteLeitura />
            )}
            {avaliacao?.comentario && (
              <blockquote className={styles.comentarioEnviado}>{avaliacao.comentario}</blockquote>
            )}
            {avaliacao?.temFoto && <FotoAvaliacao agendamentoId={agendamento.id} />}
            <p className={styles.mensagem}>Obrigado pelo seu feedback! Não é possível avaliar de novo.</p>
          </div>
        </>
      )
    } else if (agendamento.status !== STATUS_AGENDAMENTO.CONCLUIDO) {
      conteudo = (
        <>
          {resumo}
          <Alert variant="error">Só é possível avaliar atendimentos concluídos.</Alert>
        </>
      )
    } else {
      conteudo = (
        <>
          {resumo}
          <FormularioAvaliacao
            agendamentoId={agendamento.id}
            aoEnviar={aoEnviar}
            aoJaAvaliado={() => setJaAvaliadoAgora(true)}
          />
        </>
      )
    }
  }

  return (
    <section className={styles.pagina}>
      {voltar}
      <h1 className={styles.titulo}>Avaliar atendimento</h1>
      <div className={styles.cartao}>{conteudo}</div>
    </section>
  )
}
