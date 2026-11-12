import { useId, useState, type FormEvent } from 'react'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { AnexoFoto } from '../../components/AnexoFoto'
import { SeletorEstrelas } from '../../components/SeletorEstrelas'
import {
  AvaliacaoError,
  COMENTARIO_MAXIMO,
  enviarAvaliacao,
  validarFoto,
} from '../../services/avaliacoesService'
import styles from './AvaliarAtendimento.module.css'

type FormularioAvaliacaoProps = {
  agendamentoId: string
  aoEnviar: (nota: number) => void
  aoJaAvaliado: () => void
}

export function FormularioAvaliacao({ agendamentoId, aoEnviar, aoJaAvaliado }: FormularioAvaliacaoProps) {
  const comentarioId = useId()
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [foto, setFoto] = useState<File>()
  const [erroNota, setErroNota] = useState<string>()
  const [erroFoto, setErroFoto] = useState<string>()
  const [erroEnvio, setErroEnvio] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const escolherFoto = (arquivo: File) => {
    const erro = validarFoto(arquivo)
    setErroFoto(erro)
    if (!erro) setFoto(arquivo)
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return

    if (nota === 0) {
      setErroNota('Escolha uma nota de 1 a 5.')
      return
    }

    setEnviando(true)
    setErroEnvio(undefined)
    try {
      await enviarAvaliacao(agendamentoId, { nota, comentario, foto })
      aoEnviar(nota)
    } catch (erro) {
      if (erro instanceof AvaliacaoError && erro.conflito) {
        aoJaAvaliado()
        return
      }
      setErroEnvio(
        erro instanceof AvaliacaoError ? erro.message : 'Ocorreu um erro inesperado. Tente novamente.',
      )
      setEnviando(false)
    }
  }

  return (
    <form className={styles.formulario} onSubmit={(evento) => void enviar(evento)} noValidate>
      <div className={styles.grupo}>
        <p className={styles.pergunta}>Como foi seu atendimento?</p>
        <SeletorEstrelas
          rotulo="Como foi seu atendimento?"
          valor={nota}
          erro={erroNota}
          aoMudar={(nova) => {
            setNota(nova)
            setErroNota(undefined)
          }}
        />
      </div>

      <div className={styles.grupo}>
        <label htmlFor={comentarioId} className={styles.rotulo}>
          Deixe um comentário (opcional)
        </label>
        <textarea
          id={comentarioId}
          className={styles.comentario}
          placeholder="Conte como foi sua experiência…"
          maxLength={COMENTARIO_MAXIMO}
          rows={5}
          value={comentario}
          onChange={(evento) => setComentario(evento.target.value)}
          disabled={enviando}
        />
        <span className={styles.contador} aria-live="off">
          {comentario.length}/{COMENTARIO_MAXIMO}
        </span>
      </div>

      <AnexoFoto
        arquivo={foto}
        erro={erroFoto}
        desabilitado={enviando}
        aoEscolher={escolherFoto}
        aoRemover={() => {
          setFoto(undefined)
          setErroFoto(undefined)
        }}
      />

      {erroEnvio && <Alert variant="error">{erroEnvio}</Alert>}

      <ActionButton type="submit" fullWidth loading={enviando} loadingText="Enviando…">
        Enviar avaliação
      </ActionButton>
    </form>
  )
}
