import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Alert } from '../../components/Alert'
import { Icone } from '../../components/Icone'
import { Chip } from '../../components/Chip'
import { FotoEstabelecimento } from '../../components/FotoEstabelecimento'
import {
  buscarEstabelecimentos,
  BuscaError,
  type EstabelecimentoBusca,
  type OrdenacaoBusca,
} from '../../services/estabelecimentoService'
import { formatarDistancia, formatarNota, formatarPreco } from '../../utils/formatacao'
import styles from './Busca.module.css'

type Localizacao = {
  latitude: number
  longitude: number
}

const ORDENACOES: { value: OrdenacaoBusca; label: string }[] = [
  { value: 'avaliacao', label: 'Avaliação' },
  { value: 'distancia', label: 'Distância' },
  { value: 'preco', label: 'Preço' },
  { value: 'nome', label: 'Nome' },
]

export function Buscar() {
  const [nome, setNome] = useState('')
  const [ordenacao, setOrdenacao] = useState<OrdenacaoBusca>('avaliacao')
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null)
  const [resultados, setResultados] = useState<EstabelecimentoBusca[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string>()
  const [localizando, setLocalizando] = useState(false)
  const [erroLocalizacao, setErroLocalizacao] = useState<string>()
  const [buscaForcada, setBuscaForcada] = useState(0)

  const iniciarBusca = () => {
    setCarregando(true)
    setErro(undefined)
  }

  const alterarNome = (valor: string) => {
    iniciarBusca()
    setNome(valor)
  }

  const alterarOrdenacao = (valor: OrdenacaoBusca) => {
    iniciarBusca()
    setOrdenacao(valor)
  }

  const selecionarOrdenacao = (valor: OrdenacaoBusca) => {
    alterarOrdenacao(valor)
    if (valor === 'distancia' && !localizacao) obterLocalizacao()
  }

  const buscarAgora = () => {
    iniciarBusca()
    setBuscaForcada((valor) => valor + 1)
  }

  useEffect(() => {
    let ativo = true

    const temporizador = setTimeout(() => {
      buscarEstabelecimentos({
        nome,
        ordenarPor: ordenacao,
        lat: localizacao?.latitude,
        lng: localizacao?.longitude,
      })
        .then((dados) => {
          if (ativo) setResultados(dados)
        })
        .catch((falha: unknown) => {
          if (!ativo) return
          setErro(
            falha instanceof BuscaError
              ? falha.message
              : 'Não foi possível concluir a busca agora. Tente novamente.',
          )
        })
        .finally(() => {
          if (ativo) setCarregando(false)
        })
    }, 350)

    return () => {
      ativo = false
      clearTimeout(temporizador)
    }
  }, [nome, ordenacao, localizacao, buscaForcada])

  const obterLocalizacao = (aoConcluir?: () => void) => {
    if (!('geolocation' in navigator)) {
      setErroLocalizacao('Seu navegador não suporta geolocalização.')
      return
    }

    setLocalizando(true)
    setErroLocalizacao(undefined)

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setLocalizacao({
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
        })
        aoConcluir?.()
        setLocalizando(false)
      },
      (falha) => {
        setLocalizando(false)
        setErroLocalizacao(
          falha.code === falha.PERMISSION_DENIED
            ? 'Permissão de localização negada. Libere o acesso nas configurações do navegador.'
            : 'Não foi possível obter sua localização. Tente novamente.',
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  const usarLocalizacao = () => {
    obterLocalizacao(() => alterarOrdenacao('distancia'))
  }

  return (
    <section className={styles.busca}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Buscar</h1>
        <p className={styles.descricao}>
          Encontre a barbearia ideal pelo nome ou ordene por avaliação, distância e preço.
        </p>
      </header>

      <div className={styles.painel}>
        <form
          className={styles.linhaBusca}
          onSubmit={(evento) => {
            evento.preventDefault()
            buscarAgora()
          }}
        >
          <div className={styles.campoBusca}>
            <Icone nome="buscar" tamanho={20} />
            <input
              type="search"
              className={styles.input}
              placeholder="Digite o nome da barbearia"
              aria-label="Nome da barbearia"
              value={nome}
              onChange={(evento) => alterarNome(evento.target.value)}
            />
            {nome && (
              <button
                type="button"
                className={styles.limpar}
                onClick={() => alterarNome('')}
                aria-label="Limpar busca"
              >
                <Icone nome="fechar" tamanho={16} />
              </button>
            )}
          </div>

          <ActionButton type="submit" className={styles.botaoBusca}>
            Buscar
          </ActionButton>
        </form>

        <div className={styles.ordenacao} role="group" aria-label="Ordenar resultados da busca">
          <span className={styles.rotulo}>Ordenar por</span>
          {ORDENACOES.map((opcao) => (
            <Chip
              key={opcao.value}
              ativo={ordenacao === opcao.value}
              aria-pressed={ordenacao === opcao.value}
              onClick={() => selecionarOrdenacao(opcao.value)}
            >
              {opcao.label}
            </Chip>
          ))}
        </div>

        <div className={styles.localizacao}>
          <button
            type="button"
            className={styles.botaoLocalizacao}
            onClick={usarLocalizacao}
            disabled={localizando}
          >
            <Icone nome="local" tamanho={18} />
            {localizando
              ? 'Obtendo localização…'
              : localizacao
                ? 'Atualizar minha localização'
                : 'Usar minha localização'}
          </button>

          {localizacao && (
            <span className={styles.localizacaoAtiva}>
              Distâncias calculadas a partir de você
            </span>
          )}
          {erroLocalizacao && (
            <span className={styles.avisoLocalizacao}>{erroLocalizacao}</span>
          )}
        </div>
      </div>

      {erro && <Alert variant="error">{erro}</Alert>}

      <p className={styles.resumo} aria-live="polite">
        {carregando
          ? 'Buscando estabelecimentos…'
          : `${resultados.length} estabelecimento(s) encontrado(s)`}
      </p>

      {!carregando && !erro && resultados.length === 0 && (
        <div className={styles.vazio}>
          <Icone nome="buscar" tamanho={32} />
          <h2>Nenhuma barbearia encontrada</h2>
          <p>Tente outro nome ou remova parte da busca.</p>
        </div>
      )}

      <ul className={styles.lista}>
        {resultados.map((estabelecimento) => (
          <li key={estabelecimento.id} className={styles.cartao}>
            <FotoEstabelecimento
              className={styles.avatar}
              id={estabelecimento.id}
              nome={estabelecimento.nome}
              fotoAtualizadaEm={estabelecimento.fotoAtualizadaEm}
              alt=""
              carregamento="lazy"
            />

            <div className={styles.conteudo}>
              <div className={styles.linhaTitulo}>
                <h2 className={styles.nome}>{estabelecimento.nome}</h2>
                {estabelecimento.fidelidade && <span className={styles.selo}>Fidelidade</span>}
              </div>

              <p className={styles.endereco}>{estabelecimento.endereco}</p>

              <div className={styles.metricas}>
                <span className={styles.metrica}>
                  <Icone nome="estrela" tamanho={16} />
                  {estabelecimento.avaliacaoMedia !== null
                    ? `${formatarNota(estabelecimento.avaliacaoMedia)} (${estabelecimento.totalAvaliacoes})`
                    : 'Sem avaliações'}
                </span>

                {estabelecimento.distanciaKm !== null && (
                  <span className={styles.metrica}>
                    <Icone nome="local" tamanho={16} />
                    {formatarDistancia(estabelecimento.distanciaKm)}
                  </span>
                )}

                <span className={styles.metrica}>
                  <Icone nome="tesoura" tamanho={16} />
                  {estabelecimento.precoMinimo !== null
                    ? `A partir de ${formatarPreco(estabelecimento.precoMinimo)}`
                    : 'Preço não informado'}
                </span>
              </div>

              <Link
                to={`/estabelecimentos/${estabelecimento.id}`}
                className={styles.detalhe}
              >
                Ver detalhes
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
