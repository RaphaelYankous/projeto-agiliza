import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert } from '../../components/Alert'
import type { AvisoNavegacao } from '../../components/AppLayout'
import { FormularioCliente } from '../../components/FormularioCliente/FormularioCliente'
import { useFotoPerfil } from '../../contexts/FotoPerfilContext'
import {
  consultarPerfilGestor,
  buscarGestor,
  atualizarGestor,
  GestorError,
  type GestorDetalhe,
} from '../../services/gestorService'
import type { DadosEdicaoCliente } from '../../services/clientesService'
import styles from './MeusDadosGestor.module.css'

type EstadoCarregamento =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; gestor: GestorDetalhe }

export function MeusDadosGestor() {
  const navigate = useNavigate()
  const { foto: fotoContexto, definirFoto } = useFotoPerfil()
  const [estado, setEstado] = useState<EstadoCarregamento>({ status: 'carregando' })

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        const perfil = await consultarPerfilGestor()
        const dadosCompletos = await buscarGestor(perfil.id)
        if (ativo) setEstado({ status: 'pronto', gestor: dadosCompletos })
      } catch (erro) {
        if (!ativo) return
        setEstado({
          status: 'erro',
          mensagem:
            erro instanceof GestorError
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
    await atualizarGestor(estado.gestor.usuarioId, valores)

    if (valores.foto) {
      const urlTemporaria = URL.createObjectURL(valores.foto)
      definirFoto(urlTemporaria)
    }

    const nomeCompleto = `${valores.nome.trim()} ${valores.sobrenome.trim()}`
    const aviso: AvisoNavegacao = {
      tipo: 'success',
      mensagem: `Dados de ${nomeCompleto} atualizados com sucesso.`,
    }
    navigate('/gestor/perfil', { state: { aviso } })
  }

  return (
    <section className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1 className={styles.titulo}>Meus Dados</h1>
        <p className={styles.instrucao}>Atualize suas informações pessoais de gestor.</p>
      </header>

      {estado.status === 'carregando' && <p className={styles.carregando}>Carregando dados…</p>}
      {estado.status === 'erro' && <Alert variant="error">{estado.mensagem}</Alert>}
      {estado.status === 'pronto' && (
        <FormularioCliente
          valoresIniciais={{
            nome: estado.gestor.usuario.nome,
            sobrenome: estado.gestor.usuario.sobrenome,
            email: estado.gestor.usuario.email,
            cpf: estado.gestor.usuario.cpf,
            telefone: estado.gestor.usuario.telefone,
          }}
          fotoAtual={fotoContexto}
          aoEnviar={salvar}
          aoCancelar={() => navigate('/gestor/perfil')}
        />
      )}
    </section>
  )
}