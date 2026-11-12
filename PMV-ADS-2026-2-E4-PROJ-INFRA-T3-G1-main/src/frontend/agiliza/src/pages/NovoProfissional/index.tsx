import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert } from '../../components/Alert'
import type { AvisoNavegacao } from '../../components/AppLayout'
import { AvisoSemEstabelecimento } from '../../components/AvisoSemEstabelecimento'
import { EditorHorarios, type HorarioDaLista } from '../../components/EditorHorarios'
import { FormularioProfissional, type ValoresProfissional } from '../../components/FormularioProfissional'
import { useEstabelecimentoDoGestor } from '../../hooks/useEstabelecimentoDoGestor'
import { criarDisponibilidade } from '../../services/agendaProfissionalService'
import { cadastrarProfissional, enviarFotoProfissional } from '../../services/profissionaisService'
import type { HorarioSemanal } from '../../utils/horarios'
import styles from './NovoProfissional.module.css'

const ORIENTACAO_HORARIOS = 'Cadastre-os pelo botão Horários na lista de profissionais.'

function avisoDoCadastro(nome: string, fotoSalva: boolean, horariosNaoSalvos: number): string {
  const sucesso = `Profissional ${nome} cadastrado com sucesso`
  const horarios = horariosNaoSalvos === 1 ? '1 horário' : `${horariosNaoSalvos} horários`
  if (!fotoSalva && horariosNaoSalvos > 0) {
    return `${sucesso}, mas a foto e ${horarios} não foram salvos. Envie a foto pela edição do profissional e cadastre os horários pelo botão Horários na lista de profissionais.`
  }
  if (!fotoSalva) {
    return `${sucesso}, mas a foto não foi salva. Envie a foto pela edição do profissional.`
  }
  if (horariosNaoSalvos > 0) {
    const verbo = horariosNaoSalvos === 1 ? 'não foi salvo' : 'não foram salvos'
    return `${sucesso}, mas ${horarios} ${verbo}. ${ORIENTACAO_HORARIOS}`
  }
  return `${sucesso}.`
}

async function salvarHorarios(profissionalId: string, horarios: HorarioDaLista[]): Promise<number> {
  let falhas = 0
  for (const { diaSemana, horaInicio, horaFim } of horarios) {
    await criarDisponibilidade(profissionalId, { diaSemana, horaInicio, horaFim }).catch(() => {
      falhas += 1
    })
  }
  return falhas
}

export function NovoProfissional() {
  const navigate = useNavigate()
  const estado = useEstabelecimentoDoGestor()
  const [horarios, setHorarios] = useState<HorarioDaLista[]>([])

  const cadastrar = (estabelecimentoId: string) => async (valores: ValoresProfissional) => {
    const id = await cadastrarProfissional(estabelecimentoId, valores)
    const nome = `${valores.nome.trim()} ${valores.sobrenome.trim()}`
    let fotoSalva = true
    if (valores.foto) {
      fotoSalva = await enviarFotoProfissional(estabelecimentoId, id, valores.foto).then(
        () => true,
        () => false,
      )
    }
    const horariosNaoSalvos = await salvarHorarios(id, horarios)
    const aviso: AvisoNavegacao = { tipo: 'success', mensagem: avisoDoCadastro(nome, fotoSalva, horariosNaoSalvos) }
    navigate('/', { state: { aviso } })
  }

  const adicionarHorario = (horario: HorarioSemanal) =>
    setHorarios((atuais) => [...atuais, { ...horario, id: crypto.randomUUID() }])

  const removerHorario = (id: string) => setHorarios((atuais) => atuais.filter((item) => item.id !== id))

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Novo profissional</h1>
        {estado.status === 'pronto' && (
          <p className={styles.instrucao}>Cadastre a equipe do seu estabelecimento.</p>
        )}
      </header>

      {estado.status === 'carregando' && <p className={styles.carregando}>Carregando…</p>}
      {estado.status === 'erro' && (
        <Alert variant="error">
          Não foi possível carregar o seu estabelecimento. Tente novamente mais tarde.
        </Alert>
      )}
      {estado.status === 'semEstabelecimento' && <AvisoSemEstabelecimento />}
      {estado.status === 'pronto' && (
        <FormularioProfissional
          modo="cadastro"
          estabelecimentoId={estado.estabelecimento.id}
          textoEnviar="Cadastrar profissional"
          textoEnviando="Cadastrando…"
          aoEnviar={cadastrar(estado.estabelecimento.id)}
          aoCancelar={() => navigate('/gestor/profissionais')}
          secaoExtra={
            <fieldset className={styles.horarios}>
              <legend>Horários de atendimento (opcional)</legend>
              <p className={styles.dica}>
                Sem horário, o profissional não aparece para os clientes. Você também pode cadastrar os horários depois.
              </p>
              <EditorHorarios
                horarios={horarios}
                funcionamento={estado.estabelecimento}
                tituloLista="Horários do profissional"
                aoAdicionar={adicionarHorario}
                aoRemover={removerHorario}
              />
            </fieldset>
          }
        />
      )}
    </section>
  )
}
