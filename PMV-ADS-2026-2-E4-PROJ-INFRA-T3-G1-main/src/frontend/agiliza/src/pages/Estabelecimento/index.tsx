import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert } from '../../components/Alert'
import { FotoEstabelecimento } from '../../components/FotoEstabelecimento'
import { GaleriaAmpliada } from '../../components/GaleriaAmpliada'
import { GaleriaFotos } from '../../components/GaleriaFotos'
import { Icone } from '../../components/Icone'
import {
  buscarEstabelecimentoPorId,
  listarServicosPublicos,
  type EstabelecimentoDetalhe,
  type ServicoPublico,
} from '../../services/estabelecimentoService'
import { listarProfissionaisPublicos, type ProfissionalPublico } from '../../services/profissionaisService'
import { listarFotosGaleria, type FotoGaleria } from '../../services/galeriaService'
import { OpcaoProfissional } from './OpcaoProfissional'
import styles from './Estabelecimento.module.css'

type Estado =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; estabelecimento: EstabelecimentoDetalhe }

function formatarHorario(horario: string): string {
  return horario.slice(0, 5)
}

function urlSegura(valor: string): string | null {
  return /^https?:\/\//i.test(valor) ? valor : null
}

export function Estabelecimento() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado>({ status: 'carregando' })
  const [servicos, setServicos] = useState<ServicoPublico[]>([])
  const [profissionais, setProfissionais] = useState<ProfissionalPublico[]>([])
  const [servicoSelecionado, setServicoSelecionado] = useState('')
  const [profissionalSelecionado, setProfissionalSelecionado] = useState('')
  const [galeria, setGaleria] = useState<{ id: string; fotos: FotoGaleria[] }>()
  const [ampliada, setAmpliada] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    let ativo = true
    listarFotosGaleria(id)
      .then((fotos) => {
        if (ativo) setGaleria({ id, fotos })
      })
      .catch(() => {
        if (ativo) setGaleria({ id, fotos: [] })
      })
    return () => {
      ativo = false
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    let ativo = true

    buscarEstabelecimentoPorId(id)
      .then((estabelecimento) => {
        if (ativo) {
          setEstado({ status: 'pronto', estabelecimento })
          Promise.all([listarServicosPublicos(estabelecimento.id), listarProfissionaisPublicos(estabelecimento.id)])
            .then(([listaServicos, listaProfissionais]) => {
              if (ativo) {
                setServicos(listaServicos)
                setProfissionais(listaProfissionais)
              }
            })
            .catch(() => { if (ativo) { setServicos([]); setProfissionais([]) } })
        }
      })
      .catch((erro: unknown) => {
        if (!ativo) return
        setEstado({
          status: 'erro',
          mensagem:
            erro instanceof Error
              ? erro.message
              : 'Não foi possível carregar os detalhes do estabelecimento.',
        })
      })

    return () => {
      ativo = false
    }
  }, [id])

  if (estado.status === 'carregando') {
    return <p className={styles.aviso}>Carregando estabelecimento…</p>
  }

  if (estado.status === 'erro') {
    return (
      <section className={styles.pagina}>
        <Alert variant="error">{estado.mensagem}</Alert>
        <Link to="/buscar" className={styles.voltar}>
          Voltar para a busca
        </Link>
      </section>
    )
  }

  const { estabelecimento } = estado
  const servico = servicos.find((item) => item.id === servicoSelecionado)
  const prestaOServico = (item: ProfissionalPublico, servicoId: string) =>
    item.temHorarios && item.servicos.some((s) => s.id === servicoId)
  const profissionaisDoServico = servico ? profissionais.filter((item) => prestaOServico(item, servico.id)) : []
  const profissional = profissionaisDoServico.find((item) => item.id === profissionalSelecionado)

  function escolherServico(servicoId: string) {
    setServicoSelecionado(servicoId)
    const atual = profissionais.find((item) => item.id === profissionalSelecionado)
    if (!atual || !prestaOServico(atual, servicoId)) setProfissionalSelecionado('')
  }
  const fotosGaleria = galeria?.id === estabelecimento.id ? galeria.fotos : []

  return (
    <section className={styles.pagina}>
      <Link to="/buscar" className={styles.voltar}>
        <Icone nome="voltar" tamanho={16} />
        Voltar para a busca
      </Link>

      <header className={styles.cabecalho}>
        <div className={styles.tituloLinha}>
          <h1 className={styles.titulo}>{estabelecimento.nome}</h1>
          {estabelecimento.fidelidade && (
            <span className={styles.selo}>Programa de fidelidade</span>
          )}
        </div>
        {estabelecimento.descricao && (
          <p className={styles.descricao}>{estabelecimento.descricao}</p>
        )}
      </header>

      <FotoEstabelecimento
        className={styles.capa}
        id={estabelecimento.id}
        nome={estabelecimento.nome}
        fotoAtualizadaEm={estabelecimento.fotoAtualizadaEm}
        tamanhoIcone={56}
      />

      <div className={styles.cartao}>
        <div className={styles.campo}>
          <span className={styles.rotulo}>Endereço</span>
          <span className={styles.valor}>
            <Icone nome="local" tamanho={18} />
            {estabelecimento.endereco}
          </span>
        </div>

        <div className={styles.campo}>
          <span className={styles.rotulo}>Telefone</span>
          <span className={styles.valor}>{estabelecimento.telefone}</span>
        </div>

        <div className={styles.campo}>
          <span className={styles.rotulo}>Horário de funcionamento</span>
          <span className={styles.valor}>
            {formatarHorario(estabelecimento.horarioAbertura)} às{' '}
            {formatarHorario(estabelecimento.horarioFechamento)}
          </span>
        </div>

        <div className={styles.campo}>
          <span className={styles.rotulo}>E-mail</span>
          <span className={styles.valor}>{estabelecimento.email}</span>
        </div>

        {estabelecimento.redeSocial && estabelecimento.redeSocial.length > 0 && (
          <div className={styles.campo}>
            <span className={styles.rotulo}>Redes sociais</span>
            <span className={styles.valor}>
              {estabelecimento.redeSocial.map((rede) => {
                const url = urlSegura(rede)
                return url ? (
                  <a
                    key={rede}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.linkRede}
                  >
                    {rede}
                  </a>
                ) : (
                  <span key={rede}>{rede}</span>
                )
              })}
            </span>
          </div>
        )}
      </div>

      {fotosGaleria.length > 0 && (
        <section className={styles.galeria} aria-labelledby="titulo-galeria">
          <h2 id="titulo-galeria" className={styles.tituloGaleria}>
            Fotos
          </h2>
          <GaleriaFotos idEstabelecimento={estabelecimento.id} fotos={fotosGaleria} aoAbrir={setAmpliada} />
          <GaleriaAmpliada
            idEstabelecimento={estabelecimento.id}
            nome={estabelecimento.nome}
            fotos={fotosGaleria}
            indice={ampliada}
            aoFechar={() => setAmpliada(null)}
          />
        </section>
      )}

      <section className={styles.escolha}>
        <h2>Nossos serviços</h2>
        <p>Escolha primeiro o serviço, depois o profissional e o horário.</p>
        <div className={styles.opcoes}>
          {servicos.map((item) => <button key={item.id} type="button" aria-pressed={item.id === servicoSelecionado} className={item.id === servicoSelecionado ? styles.opcaoAtiva : ''} onClick={() => escolherServico(item.id)}>
            <strong>{item.nome}</strong><small>{item.preco ? `R$ ${(item.preco / 100).toFixed(2).replace('.', ',')}` : ''} · {item.duracao} min</small>
          </button>)}
        </div>
        {servico && <>
          <h2>Escolha o profissional</h2>
          {profissionaisDoServico.length > 0 ? (
            <ul className={styles.profissionais}>
              {profissionaisDoServico.map((item) => (
                <li key={item.id}>
                  <OpcaoProfissional
                    profissional={item}
                    selecionado={item.id === profissional?.id}
                    aoSelecionar={() => setProfissionalSelecionado(item.id)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum profissional disponível para este serviço.</p>
          )}
        </>}
      </section>

      <section className={styles.agendamento}>
        <div>
          <h2>Agende seu atendimento</h2>
          <p>Escolha um serviço e encontre o melhor horário para você.</p>
        </div>
        <button
          type="button"
          className={styles.botaoAgendar}
          disabled={!profissional || !servico}
          onClick={() => profissional && servico && navigate(`/cliente/horarios?estabelecimentoId=${estabelecimento.id}&profissionalId=${profissional.id}&servicoId=${servico.id}`, { state: { origem: `/estabelecimentos/${estabelecimento.id}` } })}
        >
          Agendar horário
        </button>
      </section>
    </section>
  )
}
