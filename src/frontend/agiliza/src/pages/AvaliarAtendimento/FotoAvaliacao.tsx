import { useEffect, useState } from 'react'
import { buscarFotoAvaliacao } from '../../services/avaliacoesService'
import styles from './AvaliarAtendimento.module.css'

export function FotoAvaliacao({ agendamentoId }: { agendamentoId: string }) {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    let ativo = true
    let urlCriada: string | undefined

    buscarFotoAvaliacao(agendamentoId)
      .then((arquivo) => {
        if (!ativo) return
        urlCriada = URL.createObjectURL(arquivo)
        setUrl(urlCriada)
      })
      // Sem a foto o resto da tela continua útil, então a falha não vira mensagem.
      .catch(() => undefined)

    return () => {
      ativo = false
      if (urlCriada) URL.revokeObjectURL(urlCriada)
    }
  }, [agendamentoId])

  if (!url) return null
  return <img className={styles.fotoEnviada} src={url} alt="Foto que você enviou na avaliação" />
}
