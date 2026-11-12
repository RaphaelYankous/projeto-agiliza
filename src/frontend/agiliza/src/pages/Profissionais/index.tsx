import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { AvisoSemEstabelecimento } from '../../components/AvisoSemEstabelecimento'
import { Modal } from '../../components/Modal'
import { useEstabelecimentoDoGestor } from '../../hooks/useEstabelecimentoDoGestor'
import { useProfissionaisDoEstabelecimento } from '../../hooks/useProfissionaisDoEstabelecimento'
import {
  ProfissionalError,
  excluirProfissional,
  type ProfissionalDaLista,
} from '../../services/profissionaisService'
import { CartaoProfissional } from './CartaoProfissional'
import styles from './Profissionais.module.css'

export function Profissionais() {
  const navigate = useNavigate()
  const estado = useEstabelecimentoDoGestor()
  const estabelecimentoId = estado.status === 'pronto' ? estado.estabelecimento.id : undefined
  const { estado: lista, remover } = useProfissionaisDoEstabelecimento(estabelecimentoId)
  const [paraExcluir, setParaExcluir] = useState<ProfissionalDaLista>()
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string>()
  const [sucesso, setSucesso] = useState<string>()

  const nomeCompleto = (profissional: ProfissionalDaLista) => `${profissional.nome} ${profissional.sobrenome}`

  const abrirExclusao = (profissional: ProfissionalDaLista) => {
    setErroExclusao(undefined)
    setParaExcluir(profissional)
  }

  const confirmarExclusao = async () => {
    if (!paraExcluir || !estabelecimentoId) return
    setExcluindo(true)
    setErroExclusao(undefined)
    try {
      await excluirProfissional(estabelecimentoId, paraExcluir.id)
      remover(paraExcluir.id)
      setSucesso(`Profissional ${nomeCompleto(paraExcluir)} excluído com sucesso.`)
      setParaExcluir(undefined)
    } catch (erro) {
      setErroExclusao(
        erro instanceof ProfissionalError ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.',
      )
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Profissionais</h1>
        <p className={styles.subtitulo}>Gerencie a equipe do seu estabelecimento.</p>
      </header>

      {estado.status === 'carregando' && <p className={styles.carregando}>Carregando…</p>}
      {estado.status === 'erro' && (
        <Alert variant="error">
          Não foi possível carregar o seu estabelecimento. Tente novamente mais tarde.
        </Alert>
      )}
      {estado.status === 'semEstabelecimento' && <AvisoSemEstabelecimento />}

      {sucesso && <Alert variant="success">{sucesso}</Alert>}

      <div className={styles.acoes}>
        <ActionButton
          disabled={estado.status !== 'pronto'}
          onClick={() => navigate('/gestor/profissionais/novo')}
        >
          Cadastrar novo profissional
        </ActionButton>
      </div>

      {estado.status === 'pronto' && lista.status === 'carregando' && (
        <p className={styles.carregando}>Carregando profissionais…</p>
      )}
      {estado.status === 'pronto' && lista.status === 'erro' && (
        <Alert variant="error">
          Não foi possível carregar os profissionais. Tente novamente mais tarde.
        </Alert>
      )}
      {estado.status === 'pronto' && lista.status === 'pronto' && (
        lista.profissionais.length === 0 ? (
          <div className={styles.vazio}>
            <h2>Nenhum profissional cadastrado</h2>
            <p>Cadastre o primeiro profissional da sua equipe.</p>
          </div>
        ) : (
          <ul className={styles.lista}>
            {lista.profissionais.map((profissional) => (
              <li key={profissional.id}>
                <CartaoProfissional profissional={profissional} aoExcluir={abrirExclusao} />
              </li>
            ))}
          </ul>
        )
      )}

      {paraExcluir && (
        <Modal
          titulo="Excluir profissional"
          aoFechar={() => setParaExcluir(undefined)}
          fechamentoBloqueado={excluindo}
        >
          <p className={styles.confirmacao}>
            Deseja excluir <strong>{nomeCompleto(paraExcluir)}</strong>? Ele perde o acesso ao sistema e deixa
            de aparecer na lista. O histórico de atendimentos é mantido.
          </p>
          {erroExclusao && <Alert variant="error">{erroExclusao}</Alert>}
          <div className={styles.acoesModal}>
            <ActionButton variant="secondary" disabled={excluindo} onClick={() => setParaExcluir(undefined)}>
              Cancelar
            </ActionButton>
            <ActionButton variant="danger" loading={excluindo} loadingText="Excluindo…" onClick={() => void confirmarExclusao()}>
              Excluir
            </ActionButton>
          </div>
        </Modal>
      )}
    </section>
  )
}
