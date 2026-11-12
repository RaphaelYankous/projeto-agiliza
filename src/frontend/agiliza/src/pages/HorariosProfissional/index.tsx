import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { EditorHorarios } from '../../components/EditorHorarios'
import {
  criarMinhaDisponibilidade,
  listarMinhasDisponibilidades,
  removerMinhaDisponibilidade,
  type DisponibilidadeSemanal,
} from '../../services/agendaProfissionalService'
import { consultarPerfil } from '../../services/perfilProfissionalService'
import type { Funcionamento, HorarioSemanal } from '../../utils/horarios'
import styles from './HorariosProfissional.module.css'

export function HorariosProfissional() {
  const navigate = useNavigate()
  const [disponibilidades, setDisponibilidades] = useState<DisponibilidadeSemanal[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [funcionamento, setFuncionamento] = useState<Funcionamento>()
  const [perfilCarregado, setPerfilCarregado] = useState(false)

  useEffect(() => {
    listarMinhasDisponibilidades()
      .then(setDisponibilidades)
      .catch(() => setErro('Não foi possível carregar os horários.'))
      .finally(() => setCarregando(false))
    consultarPerfil()
      .then(({ horarioAbertura, horarioFechamento }) => setFuncionamento({ horarioAbertura, horarioFechamento }))
      .catch(() => setFuncionamento(undefined))
      .finally(() => setPerfilCarregado(true))
  }, [])

  async function adicionar(horario: HorarioSemanal) {
    const nova = await criarMinhaDisponibilidade(horario)
    setDisponibilidades((atuais) => [...atuais, nova])
  }

  async function remover(id: string) {
    await removerMinhaDisponibilidade(id)
    setDisponibilidades((atuais) => atuais.filter((item) => item.id !== id))
  }

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Minha disponibilidade</h1>
          <p>Esses horários serão usados para calcular os horários disponíveis para agendamento.</p>
        </div>
        <ActionButton variant="secondary" onClick={() => navigate('/agenda')}>Voltar</ActionButton>
      </header>

      {erro && <Alert variant="error">{erro}</Alert>}
      {perfilCarregado ? (
        <EditorHorarios
          horarios={disponibilidades}
          funcionamento={funcionamento}
          carregando={carregando}
          tituloLista="Disponibilidade cadastrada"
          aoAdicionar={adicionar}
          aoRemover={remover}
          confirmarRemocao
        />
      ) : <p>Carregando horários...</p>}
    </section>
  )
}
