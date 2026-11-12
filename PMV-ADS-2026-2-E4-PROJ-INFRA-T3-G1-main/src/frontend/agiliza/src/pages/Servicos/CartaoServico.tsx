import { useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Cartao } from '../../components/Cartao'
import { Icone } from '../../components/Icone'
import type { ServicoDaLista } from '../../services/servicosService'
import { formatarPreco } from '../../utils/formatacao'
import styles from './Servicos.module.css'

type CartaoServicoProps = {
  servico: ServicoDaLista
  aoExcluir: (servico: ServicoDaLista) => void
}

export function CartaoServico({ servico, aoExcluir }: CartaoServicoProps) {
  const navigate = useNavigate()
  const duracao = `${servico.duracao} ${servico.duracao === 1 ? 'minuto' : 'minutos'}`

  return (
    <Cartao
      midia={
        <span className={styles.icone} aria-hidden="true">
          <Icone nome="tesoura" tamanho={32} />
        </span>
      }
      titulo={servico.nome}
      rodape={
        <>
          <ActionButton
            variant="outline"
            fullWidth
            aria-label={`Editar ${servico.nome}`}
            onClick={() => navigate(`/gestor/servicos/${servico.id}/editar`)}
          >
            Editar
          </ActionButton>
          <ActionButton
            variant="dangerOutline"
            fullWidth
            aria-label={`Excluir ${servico.nome}`}
            onClick={() => aoExcluir(servico)}
          >
            Excluir
          </ActionButton>
        </>
      }
    >
      <p className={styles.preco}>
        {formatarPreco(servico.preco)} • {duracao}
      </p>
    </Cartao>
  )
}
