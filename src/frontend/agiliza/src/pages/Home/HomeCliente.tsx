import { useEffect, useMemo, useState } from 'react'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router'
import 'leaflet/dist/leaflet.css'
import { Icone } from '../../components/Icone'
import { Chip } from '../../components/Chip'
import { FotoEstabelecimento } from '../../components/FotoEstabelecimento'
import { listarEstabelecimentos, listarNomesDosServicos } from '../../services/estabelecimentoService'
import type { Estabelecimento } from '../../services/estabelecimentoService'
import styles from './HomeCliente.module.css'

type Coordenada = [number, number]

type StatusLocalizacao =
  | 'buscando'
  | 'ok'
  | 'negada'
  | 'indisponivel'
  | 'tempo-esgotado'
  | 'sem-suporte'

const CATEGORIAS = ['Todos', 'Cabelo', 'Unhas', 'Estética'] as const

const CENTRO_PADRAO: Coordenada = [-23.5505, -46.6333]
const ZOOM_PADRAO = 13
const ZOOM_USUARIO = 14
const MARGEM_MAPA: [number, number] = [40, 40]
const MAXIMO_DESTAQUES = 5

const AVISOS_LOCALIZACAO: Partial<Record<StatusLocalizacao, string>> = {
  negada: 'A permissão de localização foi negada neste navegador.',
  indisponivel:
    'O sistema não conseguiu informar sua localização. Confira se os serviços de localização estão ativados.',
  'tempo-esgotado': 'A localização demorou demais para responder.',
  'sem-suporte': 'Este navegador não oferece localização.',
}

// Marcadores desenhados com CSS (evita o problema dos ícones padrão do Leaflet com o Vite)
const iconeEstabelecimento = divIcon({
  className: styles.marcador,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
})

const iconeUsuario = divIcon({
  className: styles.marcadorUsuario,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function distanciaEmKm([lat1, lng1]: Coordenada, [lat2, lng2]: Coordenada) {
  const raioTerraKm = 6371
  const paraRadianos = (graus: number) => (graus * Math.PI) / 180
  const dLat = paraRadianos(lat2 - lat1)
  const dLng = paraRadianos(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(paraRadianos(lat1)) * Math.cos(paraRadianos(lat2)) * Math.sin(dLng / 2) ** 2

  return 2 * raioTerraKm * Math.asin(Math.sqrt(a))
}

function formatarDistancia(km: number) {
  return `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
}

export function HomeCliente() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [servicos, setServicos] = useState<Record<string, string[]>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [posicao, setPosicao] = useState<Coordenada | null>(null)
  const [statusLocalizacao, setStatusLocalizacao] = useState<StatusLocalizacao>(() =>
    'geolocation' in navigator ? 'buscando' : 'sem-suporte',
  )
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>('Cabelo')

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      let lista: Estabelecimento[]

      try {
        lista = await listarEstabelecimentos()
      } catch {
        if (!cancelado) {
          setErro(true)
          setCarregando(false)
        }
        return
      }

      if (cancelado) return
      setEstabelecimentos(lista)
      setCarregando(false)

      // Um pedido por estabelecimento; se algum falhar, ele só fica sem a lista de serviços
      const pares = await Promise.all(
        lista.map(async (e) => [e.id, await listarNomesDosServicos(e.id).catch(() => [])] as const),
      )
      if (!cancelado) setServicos(Object.fromEntries(pares))
    }

    void carregar()

    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (resultado) => {
        setPosicao([resultado.coords.latitude, resultado.coords.longitude])
        setStatusLocalizacao('ok')
      },
      (falha) => {
        if (falha.code === falha.PERMISSION_DENIED) setStatusLocalizacao('negada')
        else if (falha.code === falha.TIMEOUT) setStatusLocalizacao('tempo-esgotado')
        else setStatusLocalizacao('indisponivel')
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return estabelecimentos
    return estabelecimentos.filter((e) => normalizar(e.nome).includes(termo))
  }, [busca, estabelecimentos])

  // Mais próximos primeiro (quando a localização está disponível)
  const destaques = useMemo(() => {
    const lista = visiveis.map((e) => ({
      ...e,
      km: posicao ? distanciaEmKm(posicao, [e.latitude, e.longitude]) : null,
    }))
    if (posicao) lista.sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
    return lista.slice(0, MAXIMO_DESTAQUES)
  }, [visiveis, posicao])

  // Sem localização, o mapa se enquadra em todos os estabelecimentos (e não só nos filtrados
  // pela busca, para o mapa não "pular" enquanto a pessoa digita).
  const pontos = useMemo<Coordenada[]>(
    () => estabelecimentos.map((e) => [e.latitude, e.longitude]),
    [estabelecimentos],
  )

  const configuracaoMapa = posicao
    ? { center: posicao, zoom: ZOOM_USUARIO }
    : pontos.length >= 2
      ? { bounds: pontos, boundsOptions: { padding: MARGEM_MAPA, maxZoom: 15 } }
      : { center: pontos[0] ?? CENTRO_PADRAO, zoom: ZOOM_PADRAO }

  const mapaPronto = !carregando && statusLocalizacao !== 'buscando'
  const avisoLocalizacao = AVISOS_LOCALIZACAO[statusLocalizacao]

  return (
    <section className={styles.home}>
      <h1 className={styles.tituloOculto}>Início</h1>

      <div className={styles.busca}>
        <Icone nome="buscar" tamanho={20} />
        <input
          type="search"
          className={styles.campoBusca}
          placeholder="Buscar serviço ou salão..."
          aria-label="Buscar serviço ou salão"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
      </div>

      <div className={styles.categorias} role="group" aria-label="Categorias">
        {CATEGORIAS.map((nome) => (
          <Chip
            key={nome}
            ativo={nome === categoria}
            aria-pressed={nome === categoria}
            onClick={() => setCategoria(nome)}
          >
            {nome}
          </Chip>
        ))}
      </div>

      {erro && (
        <p role="alert" className={styles.erro}>
          Não foi possível carregar os estabelecimentos.
        </p>
      )}

      <div className={styles.colunas}>
        <section className={styles.colunaMapa}>
          <h2 className={styles.subtitulo}>Cabeleireiros próximos a você</h2>

          {avisoLocalizacao && (
            <p role="status" className={styles.aviso}>
              {avisoLocalizacao} Mostrando a região dos estabelecimentos.
            </p>
          )}

          <div className={styles.cartaoMapa}>
            <div
              className={styles.mapa}
              role="region"
              aria-label="Mapa de estabelecimentos próximos"
            >
              {mapaPronto ? (
                <MapContainer {...configuracaoMapa}>
                  <TileLayer
                    attribution='© contribuidores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {posicao && (
                    <Marker
                      position={posicao}
                      icon={iconeUsuario}
                      interactive={false}
                      keyboard={false}
                    />
                  )}

                  {visiveis.map((e) => (
                    <Marker
                      key={e.id}
                      position={[e.latitude, e.longitude]}
                      icon={iconeEstabelecimento}
                      title={e.nome}
                      alt={e.nome}
                    >
                      <Popup>
                        <strong>{e.nome}</strong>
                        <br />
                        {e.endereco}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              ) : (
                <p role="status" className={styles.carregando}>
                  Carregando mapa...
                </p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.colunaLista}>
          <h2 className={styles.subtitulo}>Em destaque nessa categoria</h2>

          <ul className={styles.lista}>
            {destaques.map((e) => {
              const detalhes = [
                e.km !== null ? formatarDistancia(e.km) : null,
                (servicos[e.id] ?? []).slice(0, 3).join(', ') || null,
              ]
                .filter(Boolean)
                .join(' · ')

              return (
                <li key={e.id} className={styles.cartaoEstabelecimento}>
                  <Link to={`/estabelecimentos/${e.id}`} className={styles.linkEstabelecimento}>
                    <FotoEstabelecimento
                      className={styles.foto}
                      id={e.id}
                      nome={e.nome}
                      fotoAtualizadaEm={e.fotoAtualizadaEm}
                      alt=""
                      carregamento="lazy"
                    />
                    <div className={styles.dados}>
                      <h3 className={styles.nomeEstabelecimento}>{e.nome}</h3>
                      {detalhes && <p className={styles.detalhes}>{detalhes}</p>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>

          {!carregando && !erro && destaques.length === 0 && (
            <p role="status" className={styles.vazio}>
              {busca.trim()
                ? 'Nenhum estabelecimento encontrado para essa busca.'
                : 'Nenhum estabelecimento cadastrado ainda.'}
            </p>
          )}
        </section>
      </div>

      <button type="button" className={styles.ajuda} aria-label="Ajuda" aria-disabled="true">
        ?
      </button>
    </section>
  )
}