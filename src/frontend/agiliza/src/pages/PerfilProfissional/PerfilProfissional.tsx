import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import { useFotoPerfil } from '../../contexts/FotoPerfilContext'
import {
  consultarPerfil, consultarAvaliacoes, atualizarFoto, atualizarNome,
  type PerfilProfissional as DadosPerfil, type AvaliacoesProfissional,
} from '../../services/perfilProfissionalService'
import { Icone } from '../../components/Icone'
import { Modal } from '../../components/Modal'
import { validarArquivoFoto } from '../../utils/validacao'
import styles from './PerfilProfissional.module.css'

type Secao = 'servicos' | 'avaliacoes' | null

const precoReais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function PerfilProfissional() {
  const { sair } = useAuth()
  const { definirFoto } = useFotoPerfil()
  const navegar = useNavigate()
  const [perfil, setPerfil] = useState<DadosPerfil | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<AvaliacoesProfissional | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(true)
  const [erro, setErro] = useState('')
  const [erroAvaliacoes, setErroAvaliacoes] = useState(false)
  const [secao, setSecao] = useState<Secao>(null)
  const [edicaoNome, setEdicaoNome] = useState(false)
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroEdicao, setErroEdicao] = useState('')
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState('')

  useEffect(() => {
    let cancelado = false
    consultarPerfil().then((dados) => {
      if (!cancelado) { setPerfil(dados); setCarregando(false) }
    }).catch((falha: unknown) => {
      if (!cancelado) {
        setErro(isAxiosError(falha) && falha.response?.status === 404
          ? 'Sua conta ainda não está vinculada a um profissional e estabelecimento. Peça ao gestor para concluir seu cadastro.'
          : 'Não foi possível carregar seu perfil profissional. Verifique sua conexão e tente novamente.')
        setCarregando(false)
      }
    })
    consultarAvaliacoes().then((dados) => {
      if (!cancelado) { setAvaliacoes(dados); setCarregandoAvaliacoes(false) }
    }).catch(() => {
      if (!cancelado) { setErroAvaliacoes(true); setCarregandoAvaliacoes(false) }
    })
    return () => { cancelado = true }
  }, [])

  function abrirEdicaoNome() {
    if (!perfil) return
    setNome(perfil.nome)
    setSobrenome(perfil.sobrenome)
    setErroEdicao('')
    setEdicaoNome(true)
  }

  async function selecionarFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    setErroFoto('')
    const erroArquivo = validarArquivoFoto(arquivo)
    if (erroArquivo) {
      setErroFoto(erroArquivo)
      return
    }
    setEnviandoFoto(true)
    try {
      const atualizado = await atualizarFoto(arquivo)
      setPerfil((atual) => atual ? { ...atual, ...atualizado } : atual)
      definirFoto(atualizado.foto)
    } catch {
      setErroFoto('Não foi possível salvar a foto. Confira o formato e tente novamente.')
    } finally {
      setEnviandoFoto(false)
    }
  }

  async function salvarNome(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!nome.trim() || !sobrenome.trim()) { setErroEdicao('Informe nome e sobrenome.'); return }
    setSalvando(true)
    setErroEdicao('')
    try {
      const atualizado = await atualizarNome(nome.trim(), sobrenome.trim())
      setPerfil((atual) => atual ? { ...atual, ...atualizado } : atual)
      setEdicaoNome(false)
    } catch {
      setErroEdicao('Não foi possível atualizar o nome. Tente novamente.')
    } finally { setSalvando(false) }
  }

  function sairDaConta() {
    sair()
    navegar('/login', { replace: true })
  }

  return <section className={styles.perfil}>
    <h1>Perfil profissional</h1>
    {carregando && <p role="status" className={styles.aviso}>Carregando perfil...</p>}
    {erro && <p role="alert" className={styles.erro}>{erro}</p>}
    {perfil && <>
      <div className={styles.resumo}>
        <div className={styles.fotoContainer}>
          {perfil.foto ? <img className={styles.foto} src={perfil.foto} alt={`Foto de ${perfil.nome}`} /> :
            <span className={styles.avatar} aria-hidden="true">{perfil.nome.charAt(0)}{perfil.sobrenome.charAt(0)}</span>}
          <label className={styles.botaoFoto}>
            {enviandoFoto ? 'Enviando...' : perfil.foto ? 'Alterar foto' : 'Adicionar foto'}
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Selecionar foto do perfil"
              disabled={enviandoFoto} onChange={(evento) => void selecionarFoto(evento)} />
          </label>
        </div>
        <div className={styles.info}>
          <div className={styles.linhaNome}><h2>{perfil.nome} {perfil.sobrenome}</h2>
            <button type="button" onClick={abrirEdicaoNome} className={styles.editar}>Editar nome</button>
          </div>
          <p>{perfil.funcao} · {perfil.estabelecimento}</p>
          {carregandoAvaliacoes ? <span className={styles.notaPendente}>Carregando avaliações...</span> :
            erroAvaliacoes ? <span className={styles.notaPendente}>Avaliações indisponíveis no momento</span> :
              <span className={styles.nota}><Icone nome="estrela" tamanho={14} preenchido />{avaliacoes?.media === null ? 'Sem nota' : avaliacoes?.media.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} ({avaliacoes?.quantidade ?? 0} avaliações)</span>}
        </div>
      </div>
      {erroFoto && <p role="alert" className={styles.erroFoto}>{erroFoto}</p>}

      <div className={styles.conta}>
        <h2>Conta profissional</h2>
        <div className={styles.opcoes}>
          <button type="button" className={styles.opcao} aria-expanded={secao === 'servicos'} onClick={() => setSecao(secao === 'servicos' ? null : 'servicos')}>
            <span><strong>Meus serviços</strong><small>Consulte serviços, preços e duração do estabelecimento</small></span><span aria-hidden="true"><Icone nome="seta-direita" /></span>
          </button>
          {secao === 'servicos' && <div className={styles.painel}>
            <p className={styles.explicacao}>Serviços oferecidos por {perfil.estabelecimento}. A edição é feita pelo gestor.</p>
            {perfil.servicos.length === 0 ? <p>Nenhum serviço cadastrado neste estabelecimento.</p> :
              <ul className={styles.lista}>{perfil.servicos.map((servico) => <li key={servico.id}>
                <span><strong>{servico.nome}</strong><small>{precoReais(servico.preco)} · {servico.duracao} min</small></span>
              </li>)}</ul>}
          </div>}
          <button type="button" className={styles.opcao} aria-expanded={secao === 'avaliacoes'} onClick={() => setSecao(secao === 'avaliacoes' ? null : 'avaliacoes')}>
            <span><strong>Avaliações recebidas</strong><small>Veja os comentários dos clientes</small></span><span aria-hidden="true"><Icone nome="seta-direita" /></span>
          </button>
          {secao === 'avaliacoes' && <div className={styles.painel}>
            {carregandoAvaliacoes ? <p role="status">Carregando avaliações...</p> : erroAvaliacoes ? <p role="alert">Não foi possível carregar as avaliações.</p> :
              !avaliacoes?.quantidade ? <p>Nenhuma avaliação recebida ainda.</p> :
                <ul className={styles.lista}>{avaliacoes.avaliacoes.map((avaliacao) => <li key={avaliacao.id}>
                  <span><strong className={styles.notaAvaliacao}><Icone nome="estrela" tamanho={14} preenchido />{avaliacao.nota}/5</strong><small>{avaliacao.comentario || 'Sem comentário'}</small></span>
                </li>)}</ul>}
          </div>}
          {[
            ['Dados bancários', 'Em breve: você poderá informar seus dados para recebimentos.'],
            ['Notificações', 'Em breve: você poderá escolher quais avisos deseja receber.'],
            ['Ajuda', 'Indisponível: central de suporte ainda não configurada.'],
          ].map(([titulo, descricao]) => <div key={titulo} className={[styles.opcao, styles.indisponivel].join(' ')}>
            <span><strong>{titulo}</strong><small>{descricao}</small></span>
          </div>)}
          <button type="button" className={styles.opcao} onClick={sairDaConta}>
            <span><strong>Sair</strong><small>Encerrar sessão</small></span><span aria-hidden="true"><Icone nome="seta-direita" /></span>
          </button>
        </div>
      </div>
    </>}

    {edicaoNome && <Modal
      titulo="Editar nome"
      className={styles.modal}
      aoFechar={() => setEdicaoNome(false)}
      aoEnviar={(evento) => void salvarNome(evento)}
      fechamentoBloqueado={salvando}
    >
      <label>Nome<input autoFocus required maxLength={100} value={nome} onChange={(evento) => setNome(evento.target.value)} /></label>
      <label>Sobrenome<input required maxLength={100} value={sobrenome} onChange={(evento) => setSobrenome(evento.target.value)} /></label>
      {erroEdicao && <p role="alert" className={styles.erro}>{erroEdicao}</p>}
      <div className={styles.acoes}><button type="button" disabled={salvando} onClick={() => setEdicaoNome(false)}>Cancelar</button>
        <button type="submit" className={styles.salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button></div>
    </Modal>}
  </section>
}
