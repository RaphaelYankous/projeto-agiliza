import { useNavigate } from 'react-router'
import { Alert } from '../../components/Alert'
import type { AvisoNavegacao } from '../../components/AppLayout'
import { AvisoSemEstabelecimento } from '../../components/AvisoSemEstabelecimento'
import { FormularioServico, type ValoresServico } from '../../components/FormularioServico'
import { useEstabelecimentoDoGestor } from '../../hooks/useEstabelecimentoDoGestor'
import { cadastrarServico } from '../../services/servicosService'
import styles from './NovoServico.module.css'

export function NovoServico() {
  const navigate = useNavigate()
  const estado = useEstabelecimentoDoGestor()

  const cadastrar = (estabelecimentoId: string) => async (valores: ValoresServico) => {
    const servico = await cadastrarServico(estabelecimentoId, valores)
    const aviso: AvisoNavegacao = {
      tipo: 'success',
      mensagem: `Serviço ${servico.nome} cadastrado com sucesso.`,
    }
    navigate('/gestor/servicos', { state: { aviso } })
  }

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Novo serviço</h1>
        {estado.status === 'pronto' && (
          <p className={styles.instrucao}>Monte o catálogo do estabelecimento com preços e duração.</p>
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
        <FormularioServico
          textoEnviar="Cadastrar serviço"
          textoEnviando="Cadastrando…"
          aoEnviar={cadastrar(estado.estabelecimento.id)}
          aoCancelar={() => navigate('/gestor/servicos')}
        />
      )}
    </section>
  )
}
