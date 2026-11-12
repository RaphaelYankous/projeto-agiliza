import { Icone } from '../Icone'
import { urlFotoGaleria, type FotoGaleria } from '../../services/galeriaService'
import styles from './GaleriaFotos.module.css'

type GaleriaFotosProps = {
  idEstabelecimento: string
  fotos: FotoGaleria[]
  aoRemover?: (foto: FotoGaleria, posicao: number) => void
  aoAbrir?: (indice: number) => void
}

export function GaleriaFotos({ idEstabelecimento, fotos, aoRemover, aoAbrir }: GaleriaFotosProps) {
  return (
    <ul className={styles.grade}>
      {fotos.map((foto, indice) => {
        const imagem = (
          <img
            className={styles.foto}
            src={urlFotoGaleria(idEstabelecimento, foto.id)}
            alt={aoAbrir ? '' : `Foto ${indice + 1} de ${fotos.length}`}
            loading="lazy"
          />
        )

        return (
          <li key={foto.id} className={styles.item}>
            {aoAbrir ? (
              <button
                type="button"
                className={styles.abrir}
                aria-label={`Ampliar foto ${indice + 1} de ${fotos.length}`}
                onClick={() => aoAbrir(indice)}
              >
                {imagem}
              </button>
            ) : (
              imagem
            )}
            {aoRemover && (
              <button
                type="button"
                className={styles.remover}
                aria-label={`Remover foto ${indice + 1}`}
                onClick={() => aoRemover(foto, indice + 1)}
              >
                <Icone nome="lixeira" tamanho={16} />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
