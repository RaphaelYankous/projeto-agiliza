import Lightbox from 'yet-another-react-lightbox'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import { urlFotoGaleria, type FotoGaleria } from '../../services/galeriaService'

type GaleriaAmpliadaProps = {
  idEstabelecimento: string
  nome: string
  fotos: FotoGaleria[]
  indice: number | null
  aoFechar: () => void
}

const ROTULOS = {
  Previous: 'Anterior',
  Next: 'Próxima',
  Close: 'Fechar',
  Lightbox: 'Galeria de fotos',
  Carousel: 'Fotos',
  Slide: 'Foto',
}

export function GaleriaAmpliada({ idEstabelecimento, nome, fotos, indice, aoFechar }: GaleriaAmpliadaProps) {
  const slides = fotos.map((foto, posicao) => ({
    src: urlFotoGaleria(idEstabelecimento, foto.id),
    alt: `Foto ${posicao + 1} de ${fotos.length} de ${nome}`,
  }))

  return (
    <Lightbox
      open={indice !== null}
      index={indice ?? 0}
      close={aoFechar}
      slides={slides}
      plugins={[Counter]}
      counter={{ separator: ' de ' }}
      labels={ROTULOS}
      controller={{ closeOnBackdropClick: true }}
    />
  )
}
