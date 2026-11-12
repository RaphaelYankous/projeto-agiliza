import { BadRequestException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';
import {
  TAMANHO_MAXIMO_FOTO,
  fotoPerfil,
  preencherFotos,
  tipoFoto,
  validarFoto,
  validarFotoOpcional,
} from './foto-perfil.js';

const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const JPEG = Buffer.from([255, 216, 255, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);

describe('foto-perfil', () => {
  it.each([
    [PNG, 'image/png'],
    [JPEG, 'image/jpeg'],
    [WEBP, 'image/webp'],
    [Buffer.from('texto'), null],
  ])('identifica o tipo pelos bytes', (buffer, tipo) => {
    expect(tipoFoto(buffer)).toBe(tipo);
  });

  it('monta a data URL ou devolve null', () => {
    expect(fotoPerfil(PNG)).toBe(`data:image/png;base64,${PNG.toString('base64')}`);
    expect(fotoPerfil(undefined)).toBeNull();
  });

  it('aceita imagem válida e devolve o buffer', () => {
    expect(validarFoto({ buffer: PNG, mimetype: 'image/png', size: PNG.length })).toBe(PNG);
  });

  it.each([
    ['sem arquivo', undefined, 'Selecione uma foto.'],
    ['acima de 2 MB', { buffer: PNG, mimetype: 'image/png', size: TAMANHO_MAXIMO_FOTO + 1 }, 'A foto deve ter no máximo 2 MB.'],
    ['conteúdo inválido', { buffer: Buffer.from('texto'), mimetype: 'image/png', size: 5 }, 'A foto deve ser um arquivo JPG, PNG ou WebP válido.'],
    ['tipo declarado diferente', { buffer: PNG, mimetype: 'image/webp', size: PNG.length }, 'A foto deve ser um arquivo JPG, PNG ou WebP válido.'],
  ])('recusa %s', (_caso, arquivo, mensagem) => {
    expect(() => validarFoto(arquivo)).toThrow(new BadRequestException(mensagem));
  });

  describe('preencherFotos', () => {
    it('lê as fotos de todos os usuários numa só consulta e preenche cada um', async () => {
      const manager = { find: vi.fn(async () => [{ id: 'u1', fotoPerfil: PNG }]) };
      const usuarios = [{ id: 'u1' }, { id: 'u2' }] as Usuario[];
      await preencherFotos(manager as unknown as EntityManager, usuarios);
      expect(manager.find).toHaveBeenCalledTimes(1);
      expect(manager.find).toHaveBeenCalledWith(Usuario, {
        where: { id: expect.objectContaining({ value: ['u1', 'u2'] }) },
        select: { id: true, fotoPerfil: true },
      });
      expect(usuarios.map((usuario) => usuario.fotoPerfil)).toEqual([PNG, null]);
    });

    it('não consulta o banco quando a lista está vazia', async () => {
      const manager = { find: vi.fn() };
      await preencherFotos(manager as unknown as EntityManager, []);
      expect(manager.find).not.toHaveBeenCalled();
    });
  });

  describe('validarFotoOpcional', () => {
    it('devolve null quando nenhum arquivo é enviado', () => {
      expect(validarFotoOpcional()).toBeNull();
    });

    it('devolve o conteúdo de uma foto válida', () => {
      expect(validarFotoOpcional({ buffer: PNG, mimetype: 'image/png', size: PNG.length })).toBe(PNG);
    });

    it.each([
      [{ buffer: Buffer.from('texto'), mimetype: 'image/png', size: 5 }, 'A foto deve ser um arquivo JPG, PNG ou WebP válido.'],
      [{ buffer: PNG, mimetype: 'image/png', size: TAMANHO_MAXIMO_FOTO + 1 }, 'A foto deve ter no máximo 2 MB.'],
    ])('aplica a mesma regra de validarFoto', (arquivo, mensagem) => {
      expect(() => validarFotoOpcional(arquivo)).toThrow(new BadRequestException(mensagem));
    });
  });
});
