import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ActionButton } from '../../components/ActionButton'
import { Icone } from '../../components/Icone'
import {
  carregarPainelGestor,
  carregarResumoMensal,
  type ResumoEstabelecimento,
  type ResumoMensalEstabelecimento,
} from '../../services/gestorService'
import { formatarPreco } from '../../utils/formatacao'
import { mascararCnpj, mascararTelefone } from '../../utils/mascaras'
import styles from './Painel.module.css'

type StatusFuncionamento = 'aberto' | 'fechado' | 'indefinido'

function minutosDoHorario(horario: string): number | null {
  const [hora, minuto] = horario.split(':').map(Number)

  if (!Number.isInteger(hora) || !Number.isInteger(minuto)) return null

  return hora * 60 + minuto
}

function statusFuncionamento(abertura: string, fechamento: string): StatusFuncionamento {
  const inicio = minutosDoHorario(abertura)
  const fim = minutosDoHorario(fechamento)

  if (inicio === null || fim === null) return 'indefinido'

  const agora = new Date()
  const minutoAtual = agora.getHours() * 60 + agora.getMinutes()
  const aberto = inicio <= fim
    ? minutoAtual >= inicio && minutoAtual < fim
    : minutoAtual >= inicio || minutoAtual < fim

  return aberto ? 'aberto' : 'fechado'
}

function formatarHora(horario: string) {
  return horario.slice(0, 5)
}

function rotuloStatus(status: StatusFuncionamento) {
  if (status === 'aberto') return 'Aberto agora'
  if (status === 'fechado') return 'Fechado agora'
  return 'Horário não informado'
}

export function PainelGestor() {
  const navigate = useNavigate()
  const [resumos, setResumos] = useState<ResumoEstabelecimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [resumosMensais, setResumosMensais] = useState<Record<string, ResumoMensalEstabelecimento | null>>({})
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      try {
        const dados = await carregarPainelGestor()
        if (!cancelado) {
          setResumos(dados)
          const indicadores = await Promise.all(
            dados.map(async ({ estabelecimento }) => {
              try {
                return [estabelecimento.id, await carregarResumoMensal(estabelecimento.id)] as const
              } catch {
                return [estabelecimento.id, null] as const
              }
            }),
          )
          if (!cancelado) setResumosMensais(Object.fromEntries(indicadores))
        }
      } catch {
        if (!cancelado) setErro(true)
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    void carregar()

    return () => {
      cancelado = true
    }
  }, [tentativa])

  function tentarNovamente() {
    setErro(false)
    setCarregando(true)
    setTentativa((atual) => atual + 1)
  }

  const titulo =
    resumos.length === 1 ? `Painel · ${resumos[0].estabelecimento.nome}` : 'Painel do Gestor'

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div>
          <h1 className={styles.titulo}>{titulo}</h1>
          <p className={styles.subtitulo}>
            Acompanhe os dados do seu estabelecimento e acesse a gestão.
          </p>
        </div>
      </header>

      {carregando && (
        <p role="status" className={styles.aviso}>
          Carregando dados do estabelecimento...
        </p>
      )}

      {erro && (
        <div role="alert" className={styles.erro}>
          <div>
            <strong>Não foi possível carregar o painel.</strong>
            <p>Verifique sua conexão e tente novamente.</p>
          </div>
          <ActionButton variant="secondary" onClick={tentarNovamente}>
            Tentar novamente
          </ActionButton>
        </div>
      )}

      {!carregando && !erro && resumos.length === 0 && (
        <div className={styles.vazio}>
          <span className={styles.vazioIcone} aria-hidden="true">
            <Icone nome="painel" tamanho={32} />
          </span>
          <h2>Nenhum estabelecimento vinculado</h2>
          <p>
            Você ainda não cadastrou um estabelecimento. Cadastre o seu para começar a receber
            agendamentos.
          </p>
          <ActionButton onClick={() => navigate('/gestor/criar-estabelecimento')}>
            <Icone nome="painel" tamanho={18} />
            Cadastrar estabelecimento
          </ActionButton>
        </div>
      )}

      {!carregando &&
        !erro &&
        resumos.map(({ estabelecimento, servicos, profissionais }) => {
          const status = statusFuncionamento(
            estabelecimento.horarioAbertura,
            estabelecimento.horarioFechamento,
          )

          return (
            <article key={estabelecimento.id} className={styles.cartao}>
              <div className={styles.cartaoTopo}>
                <div>
                  <h2 className={styles.nome}>{estabelecimento.nome}</h2>
                  <p className={styles.razao}>{estabelecimento.razaoSocial}</p>
                </div>
                <span
                  className={[
                    styles.selo,
                    status === 'aberto'
                      ? styles.aberto
                      : status === 'fechado'
                        ? styles.fechado
                        : styles.indefinido,
                  ].join(' ')}
                >
                  {rotuloStatus(status)}
                </span>
              </div>

              {estabelecimento.descricao && (
                <p className={styles.descricao}>{estabelecimento.descricao}</p>
              )}

              <dl className={styles.informacoes}>
                <div className={styles.info}>
                  <dt>Endereço</dt>
                  <dd>{estabelecimento.endereco}</dd>
                </div>
                <div className={styles.info}>
                  <dt>Telefone</dt>
                  <dd>{mascararTelefone(estabelecimento.telefone)}</dd>
                </div>
                <div className={styles.info}>
                  <dt>E-mail</dt>
                  <dd>{estabelecimento.email}</dd>
                </div>
                <div className={styles.info}>
                  <dt>Horário</dt>
                  <dd>
                    {formatarHora(estabelecimento.horarioAbertura)} às{' '}
                    {formatarHora(estabelecimento.horarioFechamento)}
                  </dd>
                </div>
                <div className={styles.info}>
                  <dt>CNPJ</dt>
                  <dd>{mascararCnpj(estabelecimento.cnpj)}</dd>
                </div>
                <div className={styles.info}>
                  <dt>Fidelidade</dt>
                  <dd>{estabelecimento.fidelidade ? 'Ativa' : 'Não utilizada'}</dd>
                </div>
              </dl>

              <div className={styles.estatisticas}>
                <div className={styles.estatistica}>
                  <span className={styles.numero}>{servicos ?? '—'}</span>
                  <span className={styles.rotulo}>Serviços cadastrados</span>
                </div>
                <div className={styles.estatistica}>
                  <span className={styles.numero}>{profissionais ?? '—'}</span>
                  <span className={styles.rotulo}>Profissionais na equipe</span>
                </div>
              </div>
              <div className={styles.resumo}>
                <h3 className={styles.resumoTitulo}>Resumo do mês</h3>
                {resumosMensais[estabelecimento.id] ? (
                  <div className={styles.resumoCards}>
                    <div className={styles.resumoCard}>
                      <span className={styles.resumoIcone}><Icone nome="tesoura" tamanho={20} /></span>
                      <span className={styles.resumoNumero}>{resumosMensais[estabelecimento.id]?.servicosRealizados}</span>
                      <span className={styles.resumoRotulo}>Serviços realizados no mês</span>
                    </div>
                    <div className={styles.resumoCard}>
                      <span className={styles.resumoIcone}><Icone nome="agenda" tamanho={20} /></span>
                      <span className={styles.resumoNumero}>{resumosMensais[estabelecimento.id]?.agendamentos}</span>
                      <span className={styles.resumoRotulo}>Agendamentos do mês</span>
                    </div>
                    <div className={styles.resumoCard}>
                      <span className={styles.resumoIcone}><Icone nome="painel" tamanho={20} /></span>
                      <span className={styles.resumoNumero}>
                        {formatarPreco(resumosMensais[estabelecimento.id]?.faturamentoEstimado ?? 0)}
                      </span>
                      <span className={styles.resumoRotulo}>Faturamento estimado no mês</span>
                    </div>
                    <div className={styles.resumoCard}>
                      <span className={styles.resumoIcone}><Icone nome="relogio" tamanho={20} /></span>
                      <span className={styles.resumoNumero}>{resumosMensais[estabelecimento.id]?.agendamentosHoje}</span>
                      <span className={styles.resumoRotulo}>Agendamentos hoje</span>
                    </div>
                  </div>
                ) : (
                  <p className={styles.resumoIndisponivel}>Resumo indisponível no momento.</p>
                )}
              </div>
              <div className={styles.acoes}>
                <ActionButton
                  variant="secondary"
                  onClick={() =>
                    navigate('/gestor/editar-estabelecimento', {
                      state: { estabelecimento },
                    })
                  }
                >
                  <Icone nome="painel" tamanho={18} />
                  Dados do estabelecimento
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => navigate('/gestor/galeria')}>
                  <Icone nome="loja" tamanho={18} />
                  Fotos do estabelecimento
                </ActionButton>
              </div>
            </article>
          )
        })}
    </section>
  )
}
