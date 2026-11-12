import {
  ArrowLeft,
  Ban,
  Bell,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  Clock,
  Eye,
  EyeOff,
  Grid3x3,
  House,
  LogOut,
  MapPin,
  Menu,
  Pencil,
  Scissors,
  Search,
  Star,
  Store,
  Trash2,
  Undo,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'

const ICONES = {
  menu: Menu,
  sino: Bell,
  inicio: House,
  buscar: Search,
  agenda: Calendar,
  bloqueio: Ban,
  painel: Grid3x3,
  pessoa: User,
  tesoura: Scissors,
  usuario: CircleUser,
  sair: LogOut,
  olho: Eye,
  'olho-riscado': EyeOff,
  estrela: Star,
  local: MapPin,
  fechar: X,
  'seta-direita': ChevronRight,
  'seta-esquerda': ChevronLeft,
  'seta-baixo': ChevronDown,
  voltar: ArrowLeft,
  relogio: Clock,
  lapis: Pencil,
  lixeira: Trash2,
  desfazer: Undo,
  loja: Store,
} satisfies Record<string, LucideIcon>

export type NomeIcone = keyof typeof ICONES

type IconeProps = {
  nome: NomeIcone
  tamanho?: number
  preenchido?: boolean
}

export function Icone({ nome, tamanho = 20, preenchido = false }: IconeProps) {
  const Desenho = ICONES[nome]
  return (
    <Desenho
      size={tamanho}
      strokeWidth={2}
      fill={preenchido ? 'currentColor' : 'none'}
      aria-hidden="true"
      focusable="false"
    />
  )
}
