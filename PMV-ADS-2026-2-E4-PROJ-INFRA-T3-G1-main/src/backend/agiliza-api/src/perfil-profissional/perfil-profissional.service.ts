import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DataSource } from 'typeorm';
import { Model } from 'mongoose';
import { Avaliacao, type AvaliacaoDocument } from '../avaliacoes/schemas/avaliacao.schema.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto.js';
import {
  fotoPerfil,
  preencherFotos,
  validarFoto,
  type ArquivoFoto,
} from '../common/utils/foto-perfil.js';


@Injectable()
export class PerfilProfissionalService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectModel(Avaliacao.name) private readonly avaliacoesModel: Model<AvaliacaoDocument>,
  ) {}

  private async profissional(usuarioId: string) {
    const profissional = await this.dataSource.manager.findOne(Profissional, {
      where: { usuarioId },
      relations: { usuario: true },
    });
    if (!profissional) throw new NotFoundException('Perfil profissional não encontrado.');
    return profissional;
  }

  async consultar(usuarioId: string) {
    const profissional = await this.profissional(usuarioId);
    await preencherFotos(this.dataSource.manager, [profissional.usuario]);
    const [estabelecimento, servicos] = await Promise.all([
      // As telas só precisam do nome e do funcionamento; não selecionar outras colunas de cadastro aqui.
      this.dataSource.manager.findOne(Estabelecimento, {
        where: { id: profissional.estabelecimentoId },
        select: { id: true, nome: true, horarioAbertura: true, horarioFechamento: true },
      }),
      this.dataSource.manager.find(Servico, {
        where: { estabelecimentoId: profissional.estabelecimentoId }, order: { nome: 'ASC' },
      }),
    ]);
    if (!estabelecimento) throw new NotFoundException('Estabelecimento não encontrado.');
    return {
      nome: profissional.usuario.nome,
      sobrenome: profissional.usuario.sobrenome,
      funcao: 'Profissional',
      estabelecimento: estabelecimento.nome,
      horarioAbertura: estabelecimento.horarioAbertura,
      horarioFechamento: estabelecimento.horarioFechamento,
      foto: fotoPerfil(profissional.usuario.fotoPerfil),
      servicos: servicos.map((s) => ({ id: s.id, nome: s.nome, preco: s.preco, duracao: s.duracao })),
    };
  }

  async atualizar(usuarioId: string, dto: AtualizarPerfilDto) {
    if (!dto.nome?.trim() || !dto.sobrenome?.trim()) throw new BadRequestException('Informe nome e sobrenome.');
    const profissional = await this.profissional(usuarioId);
    await this.dataSource.manager.update(Usuario, { id: profissional.usuarioId }, {
      nome: dto.nome.trim(), sobrenome: dto.sobrenome.trim(),
    });
    return { nome: dto.nome.trim(), sobrenome: dto.sobrenome.trim() };
  }

  async atualizarFoto(usuarioId: string, arquivo?: ArquivoFoto) {
    const foto = validarFoto(arquivo);
    const profissional = await this.profissional(usuarioId);
    const resultado = await this.dataSource.manager.update(Usuario, { id: profissional.usuarioId }, {
      fotoPerfil: foto,
    });
    if (!resultado.affected) throw new NotFoundException('Perfil profissional não encontrado.');
    return { foto: fotoPerfil(foto) };
  }

  async avaliacoes(usuarioId: string) {
    const profissional = await this.profissional(usuarioId);
    const avaliacoes = await this.avaliacoesModel.find({ profissionalId: profissional.id })
      .sort({ createdAt: -1 }).lean().exec();
    const quantidade = avaliacoes.length;
    return {
      quantidade,
      media: quantidade ? Math.round(avaliacoes.reduce((total, a) => total + a.nota, 0) / quantidade * 10) / 10 : null,
      avaliacoes: avaliacoes.map((a) => ({ id: String(a._id), nota: a.nota, comentario: a.comentario ?? '' })),
    };
  }
}
