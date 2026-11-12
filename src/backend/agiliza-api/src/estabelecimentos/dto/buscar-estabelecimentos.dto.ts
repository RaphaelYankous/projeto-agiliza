import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import type { OrdemBusca, OrdenacaoBusca } from '../estabelecimentos.service.js';

const ORDENACOES: OrdenacaoBusca[] = ['distancia', 'preco', 'avaliacao', 'nome'];
const ORDENS: OrdemBusca[] = ['asc', 'desc'];

export class BuscarEstabelecimentosDto {
  @ApiPropertyOptional({
    example: 'Barbearia',
    description: 'Trecho do nome do estabelecimento (busca sem diferenciar maiúsculas de minúsculas)',
  })
  @IsString()
  @IsOptional()
  nome?: string;

  @ApiPropertyOptional({
    enum: ORDENACOES,
    default: 'avaliacao',
    description: 'Critério de ordenação dos resultados',
  })
  @IsIn(ORDENACOES)
  @IsOptional()
  ordenarPor?: OrdenacaoBusca;

  @ApiPropertyOptional({
    enum: ORDENS,
    description: 'Direção da ordenação (padrão: asc para distância/preço/nome e desc para avaliação)',
  })
  @IsIn(ORDENS)
  @IsOptional()
  ordem?: OrdemBusca;

  @ApiPropertyOptional({
    example: -19.9167,
    description: 'Latitude do cliente para calcular a distância até o estabelecimento',
  })
  @IsLatitude()
  @IsOptional()
  lat?: string;

  @ApiPropertyOptional({
    example: -43.9345,
    description: 'Longitude do cliente para calcular a distância até o estabelecimento',
  })
  @IsLongitude()
  @IsOptional()
  lng?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Raio máximo em quilômetros (apenas quando lat e lng são informados)',
  })
  @Type(() => Number)
  @IsPositive()
  @IsOptional()
  raio?: string;
}
