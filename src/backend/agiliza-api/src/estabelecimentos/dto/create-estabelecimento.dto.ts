import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ArrayMaxSize,
  Max,
  Min,
} from 'class-validator';

export class CreateEstabelecimentoDto {
  @ApiProperty({
    example: 'Barbearia Vintage Club',
    description: 'Nome fantasia do estabelecimento',
  })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({
    example: 'Vintage Club Servicos de Barbearia LTDA',
    description: 'Razão social registrada',
  })
  @IsString()
  @IsNotEmpty()
  razaoSocial: string;

  @ApiProperty({
    example: '12.345.678/0001-90',
    description: 'CNPJ do estabelecimento (com ou sem máscara)',
  })
  @IsString()
  @IsNotEmpty()
  cnpj: string;

  @ApiProperty({
    example: 'contato@barbeariavintage.com.br',
    description: 'E-mail principal para contato',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Av. Paulista, 1000, Bela Vista - São Paulo/SP',
    description: 'Endereço completo do estabelecimento',
  })
  @IsString()
  @IsNotEmpty()
  endereco: string;

  @ApiProperty({
    example: -23.563099,
    description: 'Latitude geográfica (-90 a 90)',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    example: -46.656571,
    description: 'Longitude geográfica (-180 a 180)',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    example: '(11) 98765-4321',
    description: 'Telefone ou WhatsApp principal para atendimento',
  })
  @IsString()
  @IsNotEmpty()
  telefone: string;

  @ApiPropertyOptional({
    example: 'Espaço climatizado com cerveja artesanal, sinuca e atendimento personalizado.',
    description: 'Breve descrição institucional ou diferenciais do local',
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica se o estabelecimento utiliza o programa de fidelidade por pontos',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  fidelidade?: boolean;

  @ApiPropertyOptional({
    example: ['https://instagram.com/barbeariavintage', 'https://facebook.com/barbeariavintage'],
    description: 'Lista com links das redes sociais (máximo 5)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @IsOptional()
  redeSocial?: string[];

  @ApiProperty({
    example: '09:00',
    description: 'Horário de abertura padrão (formato HH:mm)',
  })
  @IsString()
  @IsNotEmpty()
  horarioAbertura: string;

  @ApiProperty({
    example: '20:00',
    description: 'Horário de fechamento padrão (formato HH:mm)',
  })
  @IsString()
  @IsNotEmpty()
  horarioFechamento: string;

  @ApiPropertyOptional({
    example: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
    description: 'Dias da semana em que o estabelecimento funciona',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(7)
  @IsOptional()
  diasFuncionamento?: string[];

  @ApiPropertyOptional({
    example: 'a1b2c3d4-0000-0000-0000-000000000000',
    description:
      'ID do gestor responsável. Preenchido automaticamente pelo servidor a partir do token autenticado.',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  gestorId?: string;
}