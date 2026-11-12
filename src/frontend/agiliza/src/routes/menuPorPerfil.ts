import type { NomeIcone } from '../components/Icone'
import type { Perfil } from '../services/sessao'

export type ItemMenu = {
  rotulo: string
  icone: NomeIcone
  caminho?: string
  descricao?: string
}

const INICIO: ItemMenu = { rotulo: 'Início', icone: 'inicio', caminho: '/' }
const BUSCAR: ItemMenu = {
  rotulo: 'Buscar',
  icone: 'buscar',
  caminho: '/buscar',
  descricao: 'Encontre salões e serviços perto de você.',
}

export const MENU_POR_PERFIL: Record<Perfil, ItemMenu[]> = {
  cliente: [
    INICIO,
    BUSCAR,
    {
      rotulo: 'Agenda',
      icone: 'agenda',
      caminho: '/cliente/agendamentos',
      descricao: 'Acompanhe seus agendamentos.',
    },
  ],
  profissional: [
    INICIO,
    { rotulo: 'Agenda', icone: 'agenda', caminho: '/agenda', descricao: 'Veja seus horários do dia.' },
    { rotulo: 'Disponibilidade', icone: 'agenda', caminho: '/horarios', descricao: 'Configure seus horários semanais.' },
    { rotulo: 'Bloqueios', icone: 'bloqueio', caminho: '/bloqueios', descricao: 'Registre folgas e pausas na agenda.' },
  ],
  gestor: [
    {
      rotulo: 'Painel',
      icone: 'painel',
      caminho: '/gestor',
      descricao: 'Resumo do dia do estabelecimento.',
    },
    { rotulo: 'Agenda da equipe', icone: 'agenda', caminho: '/gestor/agenda', descricao: 'Acompanhe os horários de todos os profissionais.' },
    {
      rotulo: 'Profissionais',
      icone: 'pessoa',
      caminho: '/gestor/profissionais',
      descricao: 'Gerencie a equipe.',
    },
    {
      rotulo: 'Serviços',
      icone: 'tesoura',
      caminho: '/gestor/servicos',
      descricao: 'Catálogo, duração e preços.',
    },
  ],
}
