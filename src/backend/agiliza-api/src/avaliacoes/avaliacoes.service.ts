import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAvaliacoeDto } from './dto/create-avaliacoes.dto.js';
import { UpdateAvaliacoeDto } from './dto/update-avaliacoes.dto.js';
import { Avaliacao, AvaliacaoDocument } from './schemas/avaliacao.schema.js';

@Injectable()
export class AvaliacoesService {
  constructor(
    @InjectModel(Avaliacao.name)
    private readonly avaliacaoModel: Model<AvaliacaoDocument>,
  ) {}

  async create(createAvaliacoeDto: CreateAvaliacoeDto): Promise<Avaliacao> {
    const novaAvaliacao = new this.avaliacaoModel(createAvaliacoeDto);
    return novaAvaliacao.save();
  }

  async findAll(): Promise<Avaliacao[]> {
    return this.avaliacaoModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Avaliacao> {
    const avaliacao = await this.avaliacaoModel.findById(id).exec();
    if (!avaliacao) {
      throw new NotFoundException(`Avaliação com ID ${id} não encontrada`);
    }
    return avaliacao;
  }

  async update(id: string, updateAvaliacoeDto: UpdateAvaliacoeDto): Promise<Avaliacao> {
    const avaliacaoAtualizada = await this.avaliacaoModel
      .findByIdAndUpdate(id, updateAvaliacoeDto, { new: true })
      .exec();

    if (!avaliacaoAtualizada) {
      throw new NotFoundException(`Avaliação com ID ${id} não encontrada`);
    }
    return avaliacaoAtualizada;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const resultado = await this.avaliacaoModel.findByIdAndDelete(id).exec();
    if (!resultado) {
      throw new NotFoundException(`Avaliação com ID ${id} não encontrada`);
    }
    return { deleted: true };
  }
}