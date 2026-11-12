import { useState } from 'react'
import { Icone } from '../Icone'
import { urlFotoEstabelecimento } from '../../services/estabelecimentoService'
import styles from './FotoEstabelecimento.module.css'

type FotoEstabelecimentoProps = {
  id: string
  nome: string
  fotoAtualizadaEm?: string | null
  className?: string
  alt?: string
  carregamento?: 'lazy' | 'eager'
  tamanhoIcone?: number
}

export function FotoEstabelecimento({
  id,
  nome,
  fotoAtualizadaEm,
  className,
  alt = `Foto de ${nome}`,
  carregamento,
  tamanhoIcone = 24,
}: FotoEstabelecimentoProps) {
  const url = urlFotoEstabelecimento(id, fotoAtualizadaEm)
  const [urlComFalha, setUrlComFalha] = useState<string | null>(null)
  const classes = (base: string) => [styles.base, base, className].filter(Boolean).join(' ')

  if (!url || urlComFalha === url) {
    return (
      <span className={classes(styles.semFoto)} aria-hidden="true">
        <Icone nome="loja" tamanho={tamanhoIcone} />
      </span>
    )
  }

  return (
    <img
      className={classes(styles.foto)}
      src={url}
      alt={alt}
      loading={carregamento}
      onError={() => setUrlComFalha(url)}
    />
  )
}
