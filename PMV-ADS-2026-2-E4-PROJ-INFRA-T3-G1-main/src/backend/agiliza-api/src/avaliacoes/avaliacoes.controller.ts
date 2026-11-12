import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service.js';
import { CreateAvaliacoeDto } from './dto/create-avaliacoes.dto.js';
import { UpdateAvaliacoeDto } from './dto/update-avaliacoes.dto.js';

@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly avaliacoesService: AvaliacoesService) {}

  @Post()
  create(@Body() createAvaliacoeDto: CreateAvaliacoeDto) {
    return this.avaliacoesService.create(createAvaliacoeDto);
  }

  @Get()
  findAll() {
    return this.avaliacoesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.avaliacoesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAvaliacoeDto: UpdateAvaliacoeDto) {
    return this.avaliacoesService.update(id, updateAvaliacoeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.avaliacoesService.remove(id);
  }
}
