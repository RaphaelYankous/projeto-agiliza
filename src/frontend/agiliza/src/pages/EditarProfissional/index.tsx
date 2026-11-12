import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Alert } from '../../components/Alert'
import type { AvisoNavegacao } from '../../components/AppLayout'
import { AvisoSemEstabelecimento } from '../../components/AvisoSemEstabelecimento'
import { FormularioProfissional, type ValoresProfissional } from '../../components/FormularioProfissional'
import { useEstabelecimentoDoGestor } from '../../hooks/useEstabelecimentoDoGestor'
import {
  ProfissionalError,
  atualizarProfissional,
  buscarProfissional,
  enviarFotoProfissional,
  type ProfissionalDetalhe,
} from '../../services/profissionaisService'
import styles from './EditarProfissional.module.css'

type EstadoProfissional =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; profissional: ProfissionalDetalhe }

function valoresIniciais(profissional: ProfissionalDetalhe): ValoresProfissional {
  return {
    nome: profissional.nome,
    sobrenome: profissional.sobrenome,
    email: profissional.email,
    cpf: profissional.cpf,
    telefone: profissional.telefone,
    senha: '',
    servicoIds: profissional.servicos.map((servico) => servico.id),
  }
}

function Edicao({ estabelecimentoId, id }: { estabelecimentoId: string; id: string }) {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoProfissional>({ status: 'carregando' })

  useEffect(() => {
    let ativo = true

    buscarProfissional(estabelecimentoId, id)
      .then((profissional) => {
        if (ativo) setEstado({ status: 'pronto', profissional })
      })
      .catch((erro) => {
        if (!ativo) return
        setEstado({
          status: 'erro',
          mensagem:
            erro instanceof ProfissionalError
              ? erro.message
              : 'Não foi possível carregar o profissional. Tente novamente mais tarde.',
        })
      })

    return () => {
      ativo = false
    }
  }, [estabelecimentoId, id])

  const salvar = async (valores: ValoresProfissional) => {
    await atualizarProfissional(estabelecimentoId, id, valores)
    const nome = `${valores.nome.trim()} ${valores.sobrenome.trim()}`
    let fotoSalva = true
    if (valores.foto) {
      fotoSalva = await enviarFotoProfissional(estabelecimentoId, id, valores.foto).then(
        () => true,
        () => false,
      )
    }
    const aviso: AvisoNavegacao = {
      tipo: 'success',
      mensagem: fotoSalva
        ? `Profissional ${nome} atualizado com sucesso.`
        : `Dados de ${nome} salvos, mas a foto não foi salva. Tente enviar a foto de novo.`,
    }
    navigate('/gestor/profissionais', { state: { aviso } })
  }

  if (estado.status === 'carregando') return <p className={styles.carregando}>Carregando profissional…</p>
  if (estado.status === 'erro') return <Alert variant="error">{estado.mensagem}</Alert>

  return (
    <FormularioProfissional
      modo="edicao"
      estabelecimentoId={estabelecimentoId}
      valoresIniciais={valoresIniciais(estado.profissional)}
      fotoAtual={estado.profissional.foto}
      textoEnviar="Salvar alterações"
      textoEnviando="Salvando…"
      aoEnviar={salvar}
      aoCancelar={() => navigate('/gestor/profissionais')}
    />
  )
}

export function EditarProfissional() {
  const { id = '' } = useParams()
  const estado = useEstabelecimentoDoGestor()

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Editar profissional</h1>
        {estado.status === 'pronto' && (
          <p className={styles.instrucao}>Atualize os dados do profissional.</p>
        )}
      </header>

      {estado.status === 'carregando' && <p className={styles.carregando}>Carregando…</p>}
      {estado.status === 'erro' && (
        <Alert variant="error">
          Não foi possível carregar o seu estabelecimento. Tente novamente mais tarde.
        </Alert>
      )}
      {estado.status === 'semEstabelecimento' && <AvisoSemEstabelecimento />}
      {estado.status === 'pronto' && <Edicao estabelecimentoId={estado.estabelecimento.id} id={id} />}
    </section>
  )
}
