import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { UpdateClienteDto } from './dto/update-cliente.dto.js';
import { Cliente } from './entities/cliente.entity.js';
import { Role, Usuario } from '../usuarios/entities/usuario.entity.js';
import { validarFotoOpcional, type ArquivoFoto } from '../common/utils/foto-perfil.js';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createClienteDto: CreateClienteDto, arquivo?: ArquivoFoto): Promise<Cliente> {
    const { email, senha, nome, sobrenome, cpf, telefone } = createClienteDto;
    const fotoPerfil = validarFotoOpcional(arquivo);

    const emailExistente = await this.usuarioRepository.findOne({ where: { email } });
    if (emailExistente) {
      throw new ConflictException('Email já cadastrado.');
    }

    const cpfExistente = await this.usuarioRepository.findOne({ where: { cpf } });
    if (cpfExistente) {
      throw new ConflictException('CPF já cadastrado.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);

      const novoUsuario = queryRunner.manager.create(Usuario, {
        nome,
        sobrenome,
        email,
        senha: senhaHash,
        cpf,
        telefone,
        perfil: Role.CLIENTE,
        fotoPerfil,
      });
      const usuarioSalvo = await queryRunner.manager.save(novoUsuario);

      const novoCliente = queryRunner.manager.create(Cliente, {
        usuarioId: usuarioSalvo.id,
      });
      const clienteSalvo = await queryRunner.manager.save(novoCliente);

      await queryRunner.commitTransaction();

      clienteSalvo.usuario = usuarioSalvo;
      return clienteSalvo;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      const mensagem = error instanceof Error ? error.message : String(error);
      throw new BadRequestException('Erro ao cadastrar cliente: ' + mensagem);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Cliente[]> {
    return this.clienteRepository.find({
      relations: {
        usuario: true,
      },
    });
  }

  async findOne(id: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { id },
      relations: {
        usuario: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado.`);
    }

    return cliente;
  }

  async update(
    id: string,
    updateClienteDto: UpdateClienteDto,
    arquivo?: ArquivoFoto,
  ): Promise<Cliente> {
    const fotoPerfil = validarFotoOpcional(arquivo);
    const cliente = await this.findOne(id);

    const { nome, sobrenome, email, senha, cpf, telefone } = updateClienteDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (nome || sobrenome || email || senha || cpf || telefone) {
        const usuario = await queryRunner.manager.findOne(Usuario, {
          where: { id: cliente.usuarioId },
        });

        if (!usuario) {
          throw new NotFoundException('Usuário vinculado não encontrado.');
        }

        if (nome) usuario.nome = nome;
        if (sobrenome) usuario.sobrenome = sobrenome;
        if (telefone) usuario.telefone = telefone;

        if (email) {
          const emailJaExiste = await this.usuarioRepository.findOne({ where: { email } });
          if (emailJaExiste && emailJaExiste.id !== usuario.id) {
            throw new ConflictException('Email já em uso por outro usuário.');
          }
          usuario.email = email;
        }

        if (cpf) {
          const cpfJaExiste = await this.usuarioRepository.findOne({ where: { cpf } });
          if (cpfJaExiste && cpfJaExiste.id !== usuario.id) {
            throw new ConflictException('CPF já em uso por outro usuário.');
          }
          usuario.cpf = cpf;
        }

        if (senha) {
          const salt = await bcrypt.genSalt(10);
          usuario.senha = await bcrypt.hash(senha, salt);
        }

        await queryRunner.manager.save(usuario);
      }

      if (fotoPerfil) {
        await queryRunner.manager.update(Usuario, { id: cliente.usuarioId }, { fotoPerfil });
      }

      await queryRunner.commitTransaction();

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const cliente = await this.findOne(id);
    await this.usuarioRepository.delete(cliente.usuarioId);
  }
}