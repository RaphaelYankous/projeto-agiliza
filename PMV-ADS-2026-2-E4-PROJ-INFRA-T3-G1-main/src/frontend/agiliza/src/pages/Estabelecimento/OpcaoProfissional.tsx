import { Cartao } from '../../components/Cartao'
import type { ProfissionalPublico } from '../../services/profissionaisService'
import styles from './Estabelecimento.module.css'

type OpcaoProfissionalProps = {
  profissional: ProfissionalPublico
  selecionado: boolean
  aoSelecionar: () => void
}

export function OpcaoProfissional({ profissional, selecionado, aoSelecionar }: OpcaoProfissionalProps) {
  return (
    <Cartao
      selecionado={selecionado}
      aoSelecionar={aoSelecionar}
      titulo={`${profissional.nome} ${profissional.sobrenome}`}
      midia={
        profissional.foto ? (
          <img className={styles.fotoProfissional} src={profissional.foto} alt="" />
        ) : (
          <span className={styles.inicialProfissional} aria-hidden="true">
            {profissional.nome.slice(0, 1).toUpperCase()}
          </span>
        )
      }
    />
  )
}
