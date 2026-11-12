import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { AuthProvider } from './contexts/AuthProvider'
import { FotoPerfilProvider } from './contexts/FotoPerfilProvider'
import { Buscar } from './pages/Busca'
import { Cadastro } from './pages/Cadastro'
import { CriarEstabelecimento } from './pages/Gestor/CriarEstabelecimento'
import { EditarEstabelecimento } from './pages/Gestor/EditarEstabelecimento'
import { Galeria } from './pages/Gestor/Galeria'
import { Estabelecimento } from './pages/Estabelecimento'
import { PainelGestor } from './pages/Gestor/Painel'
import { AgendaEquipe } from './pages/Gestor/AgendaEquipe'
import { PerfilGestor } from './pages/Gestor/PerfilGestor'
import { MeusDadosGestor } from './pages/Gestor/MeusDadosGestor'
import { HorariosDoProfissional } from './pages/Gestor/HorariosDoProfissional'
import { NovoProfissional } from './pages/NovoProfissional'
import { EditarProfissional } from './pages/EditarProfissional'
import { Profissionais } from './pages/Profissionais'
import { EditarServico } from './pages/EditarServico'
import { NovoServico } from './pages/NovoServico'
import { Servicos } from './pages/Servicos'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { RecuperarSenha } from './pages/RecuperarSenha'
import { RedefinirSenha } from './pages/RedefinirSenha'
import { MeusAgendamentos } from './pages/MeusAgendamentos'
import { AvaliarAtendimento } from './pages/AvaliarAtendimento'
import { AgendaProfissional } from './pages/AgendaProfissional/AgendaProfissional'
import { PerfilCliente } from './pages/PerfilCliente/PerfilCliente'
import { MeusDadosCliente } from './pages/MeusDadosCliente'
import { PerfilProfissional } from './pages/PerfilProfissional/PerfilProfissional'
import { Bloqueios } from './pages/Bloqueios/Bloqueios'
import { EscolhaHorarios } from './pages/EscolhaHorarios'
import { HorariosProfissional } from './pages/HorariosProfissional'
import { RotaPorPerfil } from './routes/RotaPorPerfil'
import { RotaProtegida } from './routes/RotaProtegida'
import { RotaProfissional } from './routes/RotaProfissional'
import { RotaPublica } from './routes/RotaPublica'
import './styles/global.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RotaProtegida />}>
            <Route element={<FotoPerfilProvider><AppLayout /></FotoPerfilProvider>}>
              <Route path="/" element={<Home />} />
              <Route path="/buscar" element={<Buscar />} />

              <Route element={<RotaPorPerfil perfis={['gestor']} />}>
                <Route path="/gestor" element={<PainelGestor />} />
                <Route path="/gestor/agenda" element={<AgendaEquipe />} />
                <Route path="/gestor/perfil" element={<PerfilGestor />} />
                <Route path="/gestor/meus-dados" element={<MeusDadosGestor />} />
                <Route path="/gestor/criar-estabelecimento" element={<CriarEstabelecimento />} />
                <Route path="/gestor/editar-estabelecimento" element={<EditarEstabelecimento />} />
                <Route path="/gestor/galeria" element={<Galeria />} />
                <Route path="/gestor/profissionais" element={<Profissionais />} />
                <Route path="/gestor/profissionais/novo" element={<NovoProfissional />} />
                <Route path="/gestor/profissionais/:id/editar" element={<EditarProfissional />} />
                <Route path="/gestor/profissionais/:id/horarios" element={<HorariosDoProfissional />} />
                <Route path="/gestor/servicos" element={<Servicos />} />
                <Route path="/gestor/servicos/novo" element={<NovoServico />} />
                <Route path="/gestor/servicos/:id/editar" element={<EditarServico />} />
              </Route>

              <Route element={<RotaPorPerfil perfis={['cliente']} />}>
                <Route path="/cliente/perfil" element={<PerfilCliente />} />
                <Route path="/cliente/meus-dados" element={<MeusDadosCliente />} />
                <Route path="/cliente/agendamentos" element={<MeusAgendamentos />} />
                <Route path="/cliente/agendamentos/:id/avaliar" element={<AvaliarAtendimento />} />
                <Route path="/cliente/horarios" element={<EscolhaHorarios />} />
              </Route>

              <Route path="/estabelecimentos/:id" element={<Estabelecimento />} />

              <Route element={<RotaProfissional />}>
                <Route path="/agenda" element={<AgendaProfissional />} />
                <Route path="/horarios" element={<HorariosProfissional />} />
                <Route path="/perfil" element={<PerfilProfissional />} />
                <Route path="/bloqueios" element={<Bloqueios />} />
              </Route>
            </Route>
          </Route>

          <Route element={<RotaPublica />}>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
