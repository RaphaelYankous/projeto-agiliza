import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { GestorCreateDto } from './dtos/gestor-create.dto.js';
import { GestorUpdateDto } from './dtos/gestor-update.dto.js';
import { Gestor } from './entities/gestor.entity.js';
import { Role, Usuario } from '../usuarios/entities/usuario.entity.js';
import { validarFotoOpcional, type ArquivoFoto } from '../common/utils/foto-perfil.js';

const SALT_ROUNDS = 10;

export type PerfilGestorResposta = {
  id: string;
  usuarioId: string;
  nome: string;
  sobrenome: string;
  email: string;
  telefone: string;
  cpf: string;
  perfil: Role;
};

@Injectable()
export class GestoresService {
  constructor(
    @InjectRepository(Gestor)
    private readonly gestorRepository: Repository<Gestor>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Gestor[]> {
    return this.gestorRepository.find({ relations: { usuario: true } });
  }

  async findOne(id: string): Promise<Gestor> {
    const gestor = await this.gestorRepository.findOne({
      where: { usuarioId: id },
      relations: { usuario: true },
    });

    if (!gestor) {
      throw new NotFoundException(`Gestor com ID ${id} não encontrado.`);
    }

    return gestor;
  }

  async consultarPerfil(usuarioId: string): Promise<PerfilGestorResposta> {
    const gestor = await this.findOne(usuarioId);
    return {
      id: gestor.usuarioId,
      usuarioId: gestor.usuarioId,
      nome: gestor.usuario.nome,
      sobrenome: gestor.usuario.sobrenome,
      email: gestor.usuario.email,
      telefone: gestor.usuario.telefone,
      cpf: gestor.usuario.cpf,
      perfil: gestor.usuario.perfil,
    };
  }

  async create(dto: GestorCreateDto, arquivo?: ArquivoFoto): Promise<Gestor> {
    const fotoPerfil = validarFotoOpcional(arquivo);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const usuario = await manager.save(
          Usuario,
          manager.create(Usuario, {
            ...dto,
            senha: await bcrypt.hash(dto.senha, SALT_ROUNDS),
            perfil: Role.GESTOR,
            fotoPerfil,
          }),
        );

        return manager.save(
          Gestor,
          manager.create(Gestor, { usuarioId: usuario.id, usuario }),
        );
      });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Email ou CPF já cadastrado.');
      }

      throw error;
    }
  }

  async update(id: string, dto: GestorUpdateDto, arquivo?: ArquivoFoto): Promise<Gestor> {
    const fotoPerfil = validarFotoOpcional(arquivo);
    const gestor = await this.findOne(id);
    const changes: Partial<GestorCreateDto> & { senha?: string } = { ...dto };

    if (dto.senha) {
      changes.senha = await bcrypt.hash(dto.senha, SALT_ROUNDS);
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const usuario = await manager.findOneByOrFail(Usuario, {
          id: gestor.usuarioId,
          perfil: Role.GESTOR,
        });

        Object.assign(usuario, changes);

        if (fotoPerfil !== undefined) {
          usuario.fotoPerfil = fotoPerfil;
        }

        await manager.save(Usuario, usuario);

        return manager.findOneOrFail(Gestor, {
          where: { usuarioId: id },
          relations: { usuario: true },
        });
      });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Email ou CPF já cadastrado.');
      }

      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const gestor = await this.findOne(id);
    await this.usuarioRepository.delete(gestor.usuarioId);
  }
}