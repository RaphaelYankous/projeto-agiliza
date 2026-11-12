import { useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Cartao } from '../../components/Cartao'
import { Chip } from '../../components/Chip'
import { Icone } from '../../components/Icone'
import type { ProfissionalDaLista } from '../../services/profissionaisService'
import styles from './Profissionais.module.css'

const SERVICOS_VISIVEIS = 3

type CartaoProfissionalProps = {
  profissional: ProfissionalDaLista
  aoExcluir: (profissional: ProfissionalDaLista) => void
}

export function CartaoProfissional({ profissional, aoExcluir }: CartaoProfissionalProps) {
  const navigate = useNavigate()
  const nomeCompleto = `${profissional.nome} ${profissional.sobrenome}`
  const visiveis = profissional.servicos.slice(0, SERVICOS_VISIVEIS)
  const restantes = profissional.servicos.slice(SERVICOS_VISIVEIS)

  return (
    <Cartao
      midia={
        profissional.foto ? (
          <img className={styles.foto} src={profissional.foto} alt={`Foto de ${nomeCompleto}`} />
        ) : (
          <span className={styles.semFoto} aria-hidden="true">
            <Icone nome="pessoa" tamanho={32} />
          </span>
        )
      }
      titulo={profissional.nome}
      rodape={
        <div className={styles.acoesCartao}>
          <ActionButton
            variant="outline"
            fullWidth
            aria-label={`Horários de ${nomeCompleto}`}
            onClick={() => navigate(`/gestor/profissionais/${profissional.id}/horarios`)}
          >
            Horários
          </ActionButton>
          <ActionButton
            variant="outline"
            fullWidth
            aria-label={`Editar ${nomeCompleto}`}
            onClick={() => navigate(`/gestor/profissionais/${profissional.id}/editar`)}
          >
            Editar
          </ActionButton>
          <ActionButton
            variant="dangerOutline"
            fullWidth
            aria-label={`Excluir ${nomeCompleto}`}
            onClick={() => aoExcluir(profissional)}
          >
            Excluir
          </ActionButton>
        </div>
      }
    >
      <p className={styles.email} title={profissional.email}>
        {profissional.email}
      </p>
      {!profissional.temHorarios && (
        <p className={styles.semHorarios}>
          <Icone nome="relogio" tamanho={16} />
          <span>
            <strong>Sem horários cadastrados.</strong> Enquanto não tiver horário, este profissional não aparece para os clientes.
          </span>
        </p>
      )}
      {profissional.servicos.length > 0 && (
        <ul className={styles.servicos} aria-label={`Serviços de ${nomeCompleto}`}>
          {visiveis.map((servico) => (
            <li key={servico.id}>
              <Chip estatico>{servico.nome}</Chip>
            </li>
          ))}
          {restantes.length > 0 && (
            <li>
              <Chip
                estatico
                title={restantes.map((servico) => servico.nome).join(', ')}
              >
                +{restantes.length}
              </Chip>
            </li>
          )}
        </ul>
      )}
    </Cartao>
  )
}
