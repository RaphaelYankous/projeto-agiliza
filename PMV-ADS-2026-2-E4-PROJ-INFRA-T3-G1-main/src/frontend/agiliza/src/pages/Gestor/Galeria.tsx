import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { AvisoSemEstabelecimento } from '../../components/AvisoSemEstabelecimento'
import { GaleriaFotos } from '../../components/GaleriaFotos'
import { Modal } from '../../components/Modal'
import { useEstabelecimentoDoGestor } from '../../hooks/useEstabelecimentoDoGestor'
import {
  enviarFotosGaleria,
  GaleriaError,
  LIMITE_GALERIA,
  listarFotosGaleria,
  removerFotoGaleria,
  validarEnvioGaleria,
  type FotoGaleria,
} from '../../services/galeriaService'
import styles from './Galeria.module.css'

type EstadoFotos =
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'pronto'; estabelecimentoId: string; fotos: FotoGaleria[] }

type Remocao = { foto: FotoGaleria; posicao: number }

export function Galeria() {
  const estado = useEstabelecimentoDoGestor()
  const estabelecimentoId = estado.status === 'pronto' ? estado.estabelecimento.id : undefined
  const [lista, setLista] = useState<EstadoFotos>({ status: 'carregando' })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [sucesso, setSucesso] = useState<string>()
  const [paraRemover, setParaRemover] = useState<Remocao>()
  const [removendo, setRemovendo] = useState(false)
  const [erroRemocao, setErroRemocao] = useState<string>()
  const seletor = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!estabelecimentoId) return
    let ativo = true
    listarFotosGaleria(estabelecimentoId)
      .then((fotos) => {
        if (ativo) setLista({ status: 'pronto', estabelecimentoId, fotos })
      })
      .catch(() => {
        if (ativo) setLista({ status: 'erro' })
      })
    return () => {
      ativo = false
    }
  }, [estabelecimentoId])

  const fotos = lista.status === 'pronto' ? lista.fotos : []
  const cheia = fotos.length >= LIMITE_GALERIA

  async function escolherFotos(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(evento.target.files ?? [])
    evento.target.value = ''
    if (!estabelecimentoId || arquivos.length === 0) return
    setErro(undefined)
    setSucesso(undefined)

    const erroLocal = validarEnvioGaleria(arquivos, fotos.length)
    if (erroLocal) {
      setErro(erroLocal)
      return
    }

    setEnviando(true)
    try {
      const atualizadas = await enviarFotosGaleria(estabelecimentoId, arquivos)
      setLista({ status: 'pronto', estabelecimentoId, fotos: atualizadas })
      setSucesso(arquivos.length === 1 ? 'Foto adicionada à galeria.' : `${arquivos.length} fotos adicionadas à galeria.`)
    } catch (falha) {
      setErro(falha instanceof GaleriaError ? falha.message : 'Não foi possível enviar as fotos.')
    } finally {
      setEnviando(false)
    }
  }

  function abrirRemocao(foto: FotoGaleria, posicao: number) {
    setErro(undefined)
    setSucesso(undefined)
    setErroRemocao(undefined)
    setParaRemover({ foto, posicao })
  }

  async function confirmarRemocao() {
    if (!paraRemover || !estabelecimentoId) return
    setRemovendo(true)
    setErroRemocao(undefined)
    try {
      await removerFotoGaleria(estabelecimentoId, paraRemover.foto.id)
      setLista({
        status: 'pronto',
        estabelecimentoId,
        fotos: fotos.filter((foto) => foto.id !== paraRemover.foto.id),
      })
      setSucesso('Foto removida da galeria.')
      setParaRemover(undefined)
    } catch (falha) {
      setErroRemocao(falha instanceof GaleriaError ? falha.message : 'Não foi possível remover a foto.')
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Fotos do estabelecimento</h1>
        <p className={styles.subtitulo}>
          As fotos da galeria aparecem na página do estabelecimento. Limite de {LIMITE_GALERIA} fotos.
        </p>
      </header>

      {estado.status === 'carregando' && <p className={styles.carregando}>Carregando…</p>}
      {estado.status === 'erro' && (
        <Alert variant="error">Não foi possível carregar o seu estabelecimento. Tente novamente mais tarde.</Alert>
      )}
      {estado.status === 'semEstabelecimento' && <AvisoSemEstabelecimento acao="adicionar fotos" />}

      {estado.status === 'pronto' && (
        lista.status === 'carregando' ? (
          <p className={styles.carregando}>Carregando fotos…</p>
        ) : lista.status === 'erro' ? (
          <Alert variant="error">Não foi possível carregar as fotos. Tente novamente mais tarde.</Alert>
        ) : (
          <>
            {erro && <Alert variant="error">{erro}</Alert>}
            {sucesso && <Alert variant="success">{sucesso}</Alert>}

            <div className={styles.barra}>
              <span className={styles.contador} aria-live="polite">
                {fotos.length} de {LIMITE_GALERIA} fotos
              </span>
              <ActionButton
                loading={enviando}
                loadingText="Enviando fotos…"
                disabled={cheia}
                onClick={() => seletor.current?.click()}
              >
                Adicionar fotos
              </ActionButton>
              <input
                ref={seletor}
                className={styles.seletor}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                aria-label="Escolher fotos para a galeria"
                tabIndex={-1}
                onChange={(evento) => void escolherFotos(evento)}
              />
            </div>
            <p className={styles.dica}>
              {cheia
                ? 'A galeria está completa. Remova uma foto para adicionar outra.'
                : 'Você pode escolher várias fotos de uma vez. JPG, PNG ou WebP, até 2 MB cada. As fotos são salvas na hora.'}
            </p>

            {fotos.length === 0 ? (
              <div className={styles.vazio}>
                <h2>Nenhuma foto na galeria</h2>
                <p>Adicione fotos do espaço para os clientes conhecerem o estabelecimento.</p>
              </div>
            ) : (
              <GaleriaFotos idEstabelecimento={lista.estabelecimentoId} fotos={fotos} aoRemover={abrirRemocao} />
            )}
          </>
        )
      )}

      {paraRemover && (
        <Modal titulo="Remover foto" aoFechar={() => setParaRemover(undefined)} fechamentoBloqueado={removendo}>
          <p className={styles.confirmacao}>
            Deseja remover a <strong>foto {paraRemover.posicao}</strong> da galeria? Ela deixa de aparecer na página do
            estabelecimento.
          </p>
          {erroRemocao && <Alert variant="error">{erroRemocao}</Alert>}
          <div className={styles.acoesModal}>
            <ActionButton variant="secondary" disabled={removendo} onClick={() => setParaRemover(undefined)}>
              Cancelar
            </ActionButton>
            <ActionButton variant="danger" loading={removendo} loadingText="Removendo…" onClick={() => void confirmarRemocao()}>
              Remover
            </ActionButton>
          </div>
        </Modal>
      )}
    </section>
  )
}
