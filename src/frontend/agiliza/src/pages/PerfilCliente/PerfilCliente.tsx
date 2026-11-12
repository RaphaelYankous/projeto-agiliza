import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Icone } from '../../components/Icone'
import { useFotoPerfil } from '../../contexts/FotoPerfilContext'
import {
  consultarFidelidade,
  consultarPerfil,
  type Fidelidade,
  type PerfilCliente as DadosPerfil,
} from '../../services/perfilClienteService'
import styles from './PerfilCliente.module.css'

const OPCOES_SEM_LINK = [
  'Formas de pagamento',
  'Notificações',
  'Convidar amigos',
  'Ajuda',
]

export function PerfilCliente() {
  const { foto } = useFotoPerfil()
  const [perfil, setPerfil] = useState<DadosPerfil | null>(null)
  const [fidelidade, setFidelidade] = useState<Fidelidade | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [carregandoFidelidade, setCarregandoFidelidade] = useState(true)
  const [erro, setErro] = useState(false)
  const [erroFidelidade, setErroFidelidade] = useState(false)

  useEffect(() => {
    let cancelado = false

    consultarPerfil()
      .then((dados) => {
        if (!cancelado) setPerfil(dados)
      })
      .catch(() => {
        if (!cancelado) setErro(true)
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    consultarFidelidade()
      .then((dados) => {
        if (!cancelado) setFidelidade(dados)
      })
      .catch(() => {
        if (!cancelado) setErroFidelidade(true)
      })
      .finally(() => {
        if (!cancelado) setCarregandoFidelidade(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  const pontos = fidelidade?.pontos ?? 0
  const meta = fidelidade?.meta ?? null
  const faltam = meta === null ? null : Math.max(meta - pontos, 0)
  const percentual = meta ? Math.min((pontos / meta) * 100, 100) : 0

  return (
    <section className={styles.perfil}>
      <h1 className={styles.titulo}>Perfil</h1>

      {carregando && (
        <p role="status" className={styles.aviso}>
          Carregando perfil...
        </p>
      )}

      {erro && (
        <p role="alert" className={styles.erro}>
          Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.
        </p>
      )}

      {perfil && (
        <div className={styles.resumo}>
          {foto ? (
            <img className={styles.avatar} src={foto} alt="Sua foto de perfil" />
          ) : (
            <span className={styles.avatar} aria-hidden="true">
              <Icone nome="pessoa" tamanho={32} />
            </span>
          )}
          <div className={styles.dados}>
            <h2 className={styles.nome}>
              {perfil.nome} {perfil.sobrenome}
            </h2>
            <p className={styles.email}>{perfil.email}</p>
            <p className={styles.tipo}>Cliente Agiliza</p>
          </div>
        </div>
      )}

      <section className={styles.fidelidade} aria-labelledby="titulo-fidelidade">
        <div className={styles.fidelidadeTopo}>
          <h2 id="titulo-fidelidade" className={styles.fidelidadeRotulo}>
            Pontos de fidelidade
          </h2>
          {faltam !== null && (
            <p className={styles.fidelidadeFaltam}>
              {faltam === 0
                ? 'Você já pode resgatar seus pontos'
                : `Faltam ${faltam.toLocaleString('pt-BR')} pts para o próximo resgate`}
            </p>
          )}
        </div>

        {carregandoFidelidade && (
          <p role="status" className={styles.fidelidadeAviso}>
            Carregando pontos...
          </p>
        )}

        {erroFidelidade && (
          <p role="alert" className={styles.fidelidadeAviso}>
            Não foi possível carregar seus pontos.
          </p>
        )}

        {fidelidade && (
          <>
            <p className={styles.pontos}>{pontos.toLocaleString('pt-BR')} pts</p>
            {meta !== null && (
              <div
                className={styles.trilha}
                role="progressbar"
                aria-label="Progresso para o próximo resgate"
                aria-valuemin={0}
                aria-valuemax={meta}
                aria-valuenow={Math.min(pontos, meta)}
              >
                <div className={styles.progresso} style={{ width: `${percentual}%` }} />
              </div>
            )}
          </>
        )}
      </section>

      <section className={styles.conta} aria-labelledby="titulo-conta">
        <h2 id="titulo-conta" className={styles.contaTitulo}>
          Configurações da conta
        </h2>
        <ul className={styles.opcoes}>
          <li>
            <Link
              to="/cliente/meus-dados"
              className={styles.opcao}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span>Meus dados</span>
              <Icone nome="seta-direita" tamanho={18} />
            </Link>
          </li>
          {OPCOES_SEM_LINK.map((opcao) => (
            <li key={opcao} className={styles.opcao}>
              <span>{opcao}</span>
              <Icone nome="seta-direita" tamanho={18} />
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}