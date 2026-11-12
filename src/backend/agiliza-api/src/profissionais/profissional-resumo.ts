import { fotoPerfil } from '../common/utils/foto-perfil.js';
import { Profissional } from './entities/profissional.entity.js';

export type ProfissionalResumo = {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  foto: string | null;
  servicos: { id: string; nome: string }[];
  temHorarios: boolean;
};

export type ProfissionalPublico = Omit<ProfissionalResumo, 'email'>;

export function resumirProfissionalPublico(
  profissional: Profissional,
  temHorarios: boolean,
): ProfissionalPublico {
  return {
    id: profissional.id,
    nome: profissional.usuario.nome,
    sobrenome: profissional.usuario.sobrenome,
    foto: fotoPerfil(profissional.usuario.fotoPerfil),
    servicos: (profissional.servicos ?? []).map(({ id, nome }) => ({ id, nome })),
    temHorarios,
  };
}

export function resumirProfissional(
  profissional: Profissional,
  temHorarios: boolean,
): ProfissionalResumo {
  return {
    id: profissional.id,
    nome: profissional.usuario.nome,
    sobrenome: profissional.usuario.sobrenome,
    email: profissional.usuario.email,
    foto: fotoPerfil(profissional.usuario.fotoPerfil),
    servicos: (profissional.servicos ?? []).map(({ id, nome }) => ({ id, nome })),
    temHorarios,
  };
}
