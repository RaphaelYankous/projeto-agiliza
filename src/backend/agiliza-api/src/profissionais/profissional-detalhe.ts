import { fotoPerfil } from '../common/utils/foto-perfil.js';
import { Profissional } from './entities/profissional.entity.js';

export type ProfissionalDetalhe = {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  cpf: string;
  telefone: string;
  foto: string | null;
  servicos: { id: string; nome: string }[];
};

export function detalharProfissional(profissional: Profissional): ProfissionalDetalhe {
  const { nome, sobrenome, email, cpf, telefone } = profissional.usuario;
  return {
    id: profissional.id,
    nome,
    sobrenome,
    email,
    cpf,
    telefone,
    foto: fotoPerfil(profissional.usuario.fotoPerfil),
    servicos: (profissional.servicos ?? []).map(({ id, nome: nomeServico }) => ({ id, nome: nomeServico })),
  };
}
