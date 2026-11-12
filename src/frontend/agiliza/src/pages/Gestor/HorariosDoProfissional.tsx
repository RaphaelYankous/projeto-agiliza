import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { AvisoSemEstabelecimento } from '../../components/AvisoSemEstabelecimento'
import { EditorHorarios } from '../../components/EditorHorarios'
import { useEstabelecimentoDoGestor } from '../../hooks/useEstabelecimentoDoGestor'
import {
  criarDisponibilidade,
  listarDisponibilidades,
  removerDisponibilidade,
  type DisponibilidadeSemanal,
} from '../../services/agendaProfissionalService'
import {
  ProfissionalError,
  buscarProfissional,
  type EstabelecimentoDoGestor,
} from '../../services/profissionaisService'
import type { HorarioSemanal } from '../../utils/horarios'
import styles from './HorariosDoProfissional.module.css'

type EstadoHorarios =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; nome: string; horarios: DisponibilidadeSemanal[] }

function Horarios({ estabelecimento, id }: { estabelecimento: EstabelecimentoDoGestor; id: string }) {
  const [estado, setEstado] = useState<EstadoHorarios>({ status: 'carregando' })

  useEffect(() => {
    let ativo = true
    Promise.all([buscarProfissional(estabelecimento.id, id), listarDisponibilidades(id)])
      .then(([profissional, horarios]) => {
        if (ativo) setEstado({ status: 'pronto', nome: `${profissional.nome} ${profissional.sobrenome}`, horarios })
      })
      .catch((erro) => {
        if (!ativo) return
        setEstado({
          status: 'erro',
          mensagem: erro instanceof ProfissionalError ? erro.message : 'Não foi possível carregar os horários.',
        })
      })
    return () => {
      ativo = false
    }
  }, [estabelecimento.id, id])

  const atualizarHorarios = (mudar: (horarios: DisponibilidadeSemanal[]) => DisponibilidadeSemanal[]) =>
    setEstado((atual) => (atual.status === 'pronto' ? { ...atual, horarios: mudar(atual.horarios) } : atual))

  async function adicionar(horario: HorarioSemanal) {
    const nova = await criarDisponibilidade(id, horario)
    atualizarHorarios((horarios) => [...horarios, nova])
  }

  async function remover(idHorario: string) {
    await removerDisponibilidade(idHorario)
    atualizarHorarios((horarios) => horarios.filter((item) => item.id !== idHorario))
  }

  if (estado.status === 'carregando') return <p>Carregando horários...</p>
  if (estado.status === 'erro') return <Alert variant="error">{estado.mensagem}</Alert>

  return (
    <>
      <h2 className={styles.nome}>{estado.nome}</h2>
      <EditorHorarios
        horarios={estado.horarios}
        funcionamento={estabelecimento}
        aoAdicionar={adicionar}
        aoRemover={remover}
        confirmarRemocao
      />
    </>
  )
}

export function HorariosDoProfissional() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const estado = useEstabelecimentoDoGestor()

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Horários do profissional</h1>
          <p>Esses horários serão usados para calcular os horários disponíveis para agendamento.</p>
        </div>
        <ActionButton variant="secondary" onClick={() => navigate('/gestor/profissionais')}>Voltar</ActionButton>
      </header>

      {estado.status === 'carregando' && <p>Carregando...</p>}
      {estado.status === 'erro' && (
        <Alert variant="error">Não foi possível carregar o seu estabelecimento. Tente novamente mais tarde.</Alert>
      )}
      {estado.status === 'semEstabelecimento' && <AvisoSemEstabelecimento acao="gerenciar os horários dos profissionais" />}
      {estado.status === 'pronto' && <Horarios estabelecimento={estado.estabelecimento} id={id} />}
    </section>
  )
}
