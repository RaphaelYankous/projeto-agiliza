import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Alert } from '../../components/Alert'
import type { AvisoNavegacao } from '../../components/AppLayout'
import { AvisoSemEstabelecimento } from '../../components/AvisoSemEstabelecimento'
import { FormularioServico, type ValoresServico } from '../../components/FormularioServico'
import { useEstabelecimentoDoGestor } from '../../hooks/useEstabelecimentoDoGestor'
import {
  ServicoError,
  atualizarServico,
  buscarServico,
  type ServicoCadastrado,
} from '../../services/servicosService'
import styles from './EditarServico.module.css'

type EstadoServico =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; servico: ServicoCadastrado }

function valoresIniciais(servico: ServicoCadastrado): ValoresServico {
  return {
    nome: servico.nome,
    preco: servico.preco,
    descricao: servico.descricao,
    duracao: servico.duracao,
    pontoFidelidade: servico.pontoFidelidade,
  }
}

function Edicao({ estabelecimentoId, id }: { estabelecimentoId: string; id: string }) {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoServico>({ status: 'carregando' })

  useEffect(() => {
    let ativo = true

    buscarServico(estabelecimentoId, id)
      .then((servico) => {
        if (ativo) setEstado({ status: 'pronto', servico })
      })
      .catch((erro) => {
        if (!ativo) return
        setEstado({
          status: 'erro',
          mensagem:
            erro instanceof ServicoError
              ? erro.message
              : 'Não foi possível carregar o serviço. Tente novamente mais tarde.',
        })
      })

    return () => {
      ativo = false
    }
  }, [estabelecimentoId, id])

  const salvar = async (valores: ValoresServico) => {
    await atualizarServico(estabelecimentoId, id, valores)
    const aviso: AvisoNavegacao = {
      tipo: 'success',
      mensagem: `Serviço ${valores.nome.trim()} atualizado com sucesso.`,
    }
    navigate('/gestor/servicos', { state: { aviso } })
  }

  if (estado.status === 'carregando') return <p className={styles.carregando}>Carregando serviço…</p>
  if (estado.status === 'erro') return <Alert variant="error">{estado.mensagem}</Alert>

  return (
    <FormularioServico
      valoresIniciais={valoresIniciais(estado.servico)}
      textoEnviar="Salvar alterações"
      textoEnviando="Salvando…"
      aoEnviar={salvar}
      aoCancelar={() => navigate('/gestor/servicos')}
    />
  )
}

export function EditarServico() {
  const { id = '' } = useParams()
  const estado = useEstabelecimentoDoGestor()

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Editar serviço</h1>
        {estado.status === 'pronto' && (
          <p className={styles.instrucao}>Atualize os dados do serviço.</p>
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
        <Edicao estabelecimentoId={estado.estabelecimento.id} id={id} />
      )}
    </section>
  )
}
