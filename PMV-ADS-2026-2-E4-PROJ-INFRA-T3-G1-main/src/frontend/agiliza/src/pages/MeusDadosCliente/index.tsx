import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert } from '../../components/Alert'
import type { AvisoNavegacao } from '../../components/AppLayout'
import { FormularioCliente } from '../../components/FormularioCliente/FormularioCliente'
import { useFotoPerfil } from '../../contexts/FotoPerfilContext'
import { consultarPerfil } from '../../services/perfilClienteService'
import {
  buscarCliente,
  atualizarCliente,
  ClienteError,
  type ClienteDetalhe,
  type DadosEdicaoCliente,
} from '../../services/clientesService'
import styles from './MeusDadosCliente.module.css'

type EstadoCarregamento =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; cliente: ClienteDetalhe }

export function MeusDadosCliente() {
  const navigate = useNavigate()
  const { foto: fotoContexto, definirFoto } = useFotoPerfil()
  const [estado, setEstado] = useState<EstadoCarregamento>({ status: 'carregando' })

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        const perfil = await consultarPerfil()
        const dadosCompletos = await buscarCliente(perfil.id)
        if (ativo) setEstado({ status: 'pronto', cliente: dadosCompletos })
      } catch (erro) {
        if (!ativo) return
        setEstado({
          status: 'erro',
          mensagem:
            erro instanceof ClienteError
              ? erro.message
              : 'Não foi possível carregar seus dados. Tente novamente mais tarde.',
        })
      }
    }

    void carregar()

    return () => {
      ativo = false
    }
  }, [])

  const salvar = async (valores: DadosEdicaoCliente) => {
    if (estado.status !== 'pronto') return
    await atualizarCliente(estado.cliente.id, valores)

    if (valores.foto) {
      const urlTemporaria = URL.createObjectURL(valores.foto)
      definirFoto(urlTemporaria)
    }

    const nomeCompleto = `${valores.nome.trim()} ${valores.sobrenome.trim()}`
    const aviso: AvisoNavegacao = {
      tipo: 'success',
      mensagem: `Dados de ${nomeCompleto} atualizados com sucesso.`,
    }
    navigate('/cliente/perfil', { state: { aviso } })
  }

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Meus Dados</h1>
        <p className={styles.instrucao}>Atualize suas informações pessoais.</p>
      </header>

      {estado.status === 'carregando' && <p className={styles.carregando}>Carregando dados…</p>}
      {estado.status === 'erro' && <Alert variant="error">{estado.mensagem}</Alert>}
      {estado.status === 'pronto' && (
        <FormularioCliente
          valoresIniciais={{
            nome: estado.cliente.usuario.nome,
            sobrenome: estado.cliente.usuario.sobrenome,
            email: estado.cliente.usuario.email,
            cpf: estado.cliente.usuario.cpf,
            telefone: estado.cliente.usuario.telefone,
          }}
          fotoAtual={fotoContexto}
          aoEnviar={salvar}
          aoCancelar={() => navigate('/cliente/perfil')}
        />
      )}
    </section>
  )
}