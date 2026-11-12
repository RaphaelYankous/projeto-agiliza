import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import {
  fotoPerfil,
  preencherFotos,
  validarFoto,
  type ArquivoFoto,
} from '../common/utils/foto-perfil.js';
import { DataSource, In, MoreThan, Not, Repository } from 'typeorm';

import { BloqueioAgenda } from '../agenda/entities/bloqueio-agenda.entity.js';
import { DisponibilidadeProfissional } from '../agenda/entities/disponibilidade-profissional.entity.js';
import { Agendamento, StatusAgendamento } from '../agendamentos/entities/agendamento.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from './entities/profissional.entity.js';
import { CreateProfissionalDto } from './dto/create-profissional.dto.js';
import { UpdateProfissionalDto } from './dto/update-profissional.dto.js';
import {
  resumirProfissional,
  resumirProfissionalPublico,
  type ProfissionalPublico,
  type ProfissionalResumo,
} from './profissional-resumo.js';
import { detalharProfissional, type ProfissionalDetalhe } from './profissional-detalhe.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { Role, Usuario } from '../usuarios/entities/usuario.entity.js';

const SALT_ROUNDS = 10;

@Injectable()
export class ProfissionaisService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Profissional)
    private readonly profissionalRepository: Repository<Profissional>,
    @InjectRepository(Estabelecimento)
    private readonly estabelecimentoRepository: Repository<Estabelecimento>,
  ) {}

  private async garantirEstabelecimentoDoGestor(
    estabelecimentoId: string,
    gestorId: string,
  ): Promise<void> {
    const estabelecimento = await this.estabelecimentoRepository.findOneBy({
      id: estabelecimentoId,
    });
    if (!estabelecimento) {
      throw new NotFoundException(
        `Estabelecimento com ID ${estabelecimentoId} não encontrado.`,
      );
    }
    if (estabelecimento.gestorId !== gestorId) {
      throw new ForbiddenException('Este estabelecimento não pertence ao gestor.');
    }
  }

  private async buscarServicosDoEstabelecimento(
    estabelecimentoId: string,
    servicoIds: string[],
  ): Promise<Servico[]> {
    const servicos = await this.dataSource.getRepository(Servico).findBy({
      id: In(servicoIds),
      estabelecimentoId,
    });
    if (servicos.length !== servicoIds.length) {
      throw new BadRequestException(
        'Algum serviço informado não pertence ao estabelecimento.',
      );
    }
    return servicos;
  }

  private async idsComHorario(profissionais: Profissional[]): Promise<Set<string>> {
    if (profissionais.length === 0) {
      return new Set();
    }
    const horarios = await this.profissionalRepository.manager.find(DisponibilidadeProfissional, {
      where: { profissionalId: In(profissionais.map(({ id }) => id)), ativo: true },
      select: { id: true, profissionalId: true },
    });
    return new Set(horarios.map(({ profissionalId }) => profissionalId));
  }

  private async detalhar(estabelecimentoId: string, id: string): Promise<ProfissionalDetalhe> {
    const profissional = await this.buscarDoEstabelecimento(estabelecimentoId, id);
    await preencherFotos(this.profissionalRepository.manager, [profissional.usuario]);
    return detalharProfissional(profissional);
  }

  private async buscarDoEstabelecimento(
    estabelecimentoId: string,
    id: string,
  ): Promise<Profissional> {
    const profissional = await this.profissionalRepository.findOne({
      where: { id, estabelecimentoId },
      relations: { servicos: true },
    });
    if (!profissional) {
      throw new NotFoundException(`Profissional com ID ${id} não encontrado.`);
    }
    return profissional;
  }

  async create(
    estabelecimentoId: string,
    gestorId: string,
    dto: CreateProfissionalDto,
  ): Promise<Profissional> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);

    const { servicoIds, senha, nome, sobrenome, email, cpf, telefone } = dto;
    const dadosPessoa = { nome, sobrenome, email, cpf, telefone };
    const servicos = await this.buscarServicosDoEstabelecimento(estabelecimentoId, servicoIds);

    const usuarios = this.dataSource.getRepository(Usuario);
    if (await usuarios.existsBy({ email: dadosPessoa.email })) {
      throw new ConflictException('Email já cadastrado.');
    }
    if (await usuarios.existsBy({ cpf: dadosPessoa.cpf })) {
      throw new ConflictException('CPF já cadastrado.');
    }

    let profissionalId: string;
    try {
      profissionalId = await this.dataSource.transaction(async (manager) => {
        const usuario = await manager.save(
          Usuario,
          manager.create(Usuario, {
            ...dadosPessoa,
            senha: await bcrypt.hash(senha, SALT_ROUNDS),
            perfil: Role.PROFISSIONAL,
          }),
        );
        const profissional = await manager.save(
          Profissional,
          manager.create(Profissional, {
            usuarioId: usuario.id,
            estabelecimentoId,
            servicos,
          }),
        );
        return profissional.id;
      });
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Email ou CPF já cadastrado.');
      }
      throw error;
    }

    return this.profissionalRepository.findOneOrFail({
      where: { id: profissionalId },
      relations: { servicos: true },
    });
  }

  async findAllByEstabelecimento(
    estabelecimentoId: string,
    gestorId: string,
  ): Promise<ProfissionalResumo[]> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);
    const profissionais = await this.profissionalRepository.find({
      where: { estabelecimentoId },
      relations: { servicos: true },
      order: { usuario: { nome: 'ASC', sobrenome: 'ASC' } },
    });
    await preencherFotos(
      this.profissionalRepository.manager,
      profissionais.map((profissional) => profissional.usuario),
    );
    const comHorario = await this.idsComHorario(profissionais);
    return profissionais.map((profissional) =>
      resumirProfissional(profissional, comHorario.has(profissional.id)),
    );
  }

  async findAllPublicos(estabelecimentoId: string): Promise<ProfissionalPublico[]> {
    const profissionais = await this.profissionalRepository.find({
      where: { estabelecimentoId },
      relations: { servicos: true },
      order: { usuario: { nome: 'ASC', sobrenome: 'ASC' } },
    });
    await preencherFotos(
      this.profissionalRepository.manager,
      profissionais.map((profissional) => profissional.usuario),
    );
    const comHorario = await this.idsComHorario(profissionais);
    return profissionais.map((profissional) =>
      resumirProfissionalPublico(profissional, comHorario.has(profissional.id)),
    );
  }

  async findOne(
    estabelecimentoId: string,
    gestorId: string,
    id: string,
  ): Promise<ProfissionalDetalhe> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);
    return this.detalhar(estabelecimentoId, id);
  }

  async update(
    estabelecimentoId: string,
    gestorId: string,
    id: string,
    dto: UpdateProfissionalDto,
  ): Promise<ProfissionalDetalhe> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);
    const profissional = await this.buscarDoEstabelecimento(estabelecimentoId, id);
    const { servicoIds, nome, sobrenome, email, telefone } = dto;

    if (
      email !== undefined &&
      (await this.dataSource
        .getRepository(Usuario)
        .existsBy({ email, id: Not(profissional.usuarioId) }))
    ) {
      throw new ConflictException('Email já cadastrado.');
    }
    const servicos =
      servicoIds === undefined
        ? undefined
        : await this.buscarServicosDoEstabelecimento(estabelecimentoId, servicoIds);
    const dadosPessoa = Object.fromEntries(
      Object.entries({ nome, sobrenome, email, telefone }).filter(
        ([, valor]) => valor !== undefined,
      ),
    );

    try {
      await this.dataSource.transaction(async (manager) => {
        if (Object.keys(dadosPessoa).length > 0) {
          await manager.update(Usuario, { id: profissional.usuarioId }, dadosPessoa);
        }
        if (servicos) {
          profissional.servicos = servicos;
          await manager.save(Profissional, profissional);
        }
      });
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Email já cadastrado.');
      }
      throw error;
    }

    return this.detalhar(estabelecimentoId, id);
  }

  async atualizarFoto(
    estabelecimentoId: string,
    gestorId: string,
    id: string,
    arquivo?: ArquivoFoto,
  ): Promise<{ foto: string | null }> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);
    const profissional = await this.buscarDoEstabelecimento(estabelecimentoId, id);
    const foto = validarFoto(arquivo);
    await this.profissionalRepository.manager.update(
      Usuario,
      { id: profissional.usuarioId },
      { fotoPerfil: foto },
    );
    return { foto: fotoPerfil(foto) };
  }

  async remove(estabelecimentoId: string, gestorId: string, id: string): Promise<void> {
    await this.garantirEstabelecimentoDoGestor(estabelecimentoId, gestorId);
    const profissional = await this.buscarDoEstabelecimento(estabelecimentoId, id);

    const agendamentosEmAberto = await this.dataSource.getRepository(Agendamento).count({
      where: {
        profissionalId: id,
        status: In([StatusAgendamento.PENDENTE, StatusAgendamento.CONFIRMADO]),
        dataHoraInicio: MoreThan(new Date()),
      },
    });
    if (agendamentosEmAberto > 0) {
      throw new ConflictException(
        'O profissional tem agendamentos pendentes ou confirmados. Cancele ou conclua esses agendamentos antes de excluir.',
      );
    }

    const senha = await bcrypt.hash(randomUUID(), SALT_ROUNDS);
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(DisponibilidadeProfissional, { profissionalId: id });
      await manager.delete(BloqueioAgenda, { profissionalId: id });
      await manager.update(
        Usuario,
        { id: profissional.usuarioId },
        { email: `excluido+${id}@agiliza.invalid`, cpf: `excluido:${id}`, senha },
      );
      await manager.softDelete(Profissional, { id });
    });
  }
}
