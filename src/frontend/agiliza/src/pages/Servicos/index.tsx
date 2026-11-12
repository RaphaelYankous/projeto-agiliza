import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { AvisoSemEstabelecimento } from '../../components/AvisoSemEstabelecimento'
import { Modal } from '../../components/Modal'
import { useEstabelecimentoDoGestor } from '../../hooks/useEstabelecimentoDoGestor'
import { useServicosDoEstabelecimento } from '../../hooks/useServicosDoEstabelecimento'
import {
  ServicoError,
  excluirServico,
  type ServicoDaLista,
} from '../../services/servicosService'
import { CartaoServico } from './CartaoServico'
import styles from './Servicos.module.css'

export function Servicos() {
  const navigate = useNavigate()
  const estado = useEstabelecimentoDoGestor()
  const estabelecimentoId = estado.status === 'pronto' ? estado.estabelecimento.id : undefined

  const { estado: lista, remover } = useServicosDoEstabelecimento(estabelecimentoId)
  const [paraExcluir, setParaExcluir] = useState<ServicoDaLista>()
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string>()
  const [sucesso, setSucesso] = useState<string>()

  const listaDoEstabelecimento =
    lista.status !== 'carregando' && lista.estabelecimentoId === estabelecimentoId
      ? lista
      : ({ status: 'carregando' } as const)

  const abrirExclusao = (servico: ServicoDaLista) => {
    setErroExclusao(undefined)
    setParaExcluir(servico)
  }

  const confirmarExclusao = async () => {
    if (!paraExcluir || !estabelecimentoId) return
    setExcluindo(true)
    setErroExclusao(undefined)
    try {
      await excluirServico(estabelecimentoId, paraExcluir.id)
      remover(paraExcluir.id)
      setSucesso(`Serviço ${paraExcluir.nome} excluído com sucesso.`)
      setParaExcluir(undefined)
    } catch (erro) {
      setErroExclusao(
        erro instanceof ServicoError ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.',
      )
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Serviços</h1>
        <p className={styles.subtitulo}>Gerencie os serviços e catálogo do seu estabelecimento.</p>
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
          onClick={() => navigate('/gestor/servicos/novo')}
        >
          Cadastrar novo serviço
        </ActionButton>
      </div>

      {estado.status === 'pronto' && (
        listaDoEstabelecimento.status === 'carregando' ? (
          <p className={styles.carregando}>Carregando serviços…</p>
        ) : listaDoEstabelecimento.status === 'erro' ? (
          <Alert variant="error">
            Não foi possível carregar os serviços. Tente novamente mais tarde.
          </Alert>
        ) : listaDoEstabelecimento.servicos.length === 0 ? (
          <div className={styles.vazio}>
            <h2>Nenhum serviço cadastrado</h2>
            <p>Cadastre o primeiro serviço do seu estabelecimento.</p>
          </div>
        ) : (
          <ul className={styles.lista}>
            {listaDoEstabelecimento.servicos.map((servico) => (
              <li key={servico.id}>
                <CartaoServico servico={servico} aoExcluir={abrirExclusao} />
              </li>
            ))}
          </ul>
        )
      )}

      {paraExcluir && (
        <Modal
          titulo="Excluir serviço"
          aoFechar={() => setParaExcluir(undefined)}
          fechamentoBloqueado={excluindo}
        >
          <p className={styles.confirmacao}>
            Deseja excluir <strong>{paraExcluir.nome}</strong>? Ele deixa de aparecer no catálogo e nos
            serviços dos profissionais. Serviços com agendamentos vinculados não podem ser excluídos.
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
