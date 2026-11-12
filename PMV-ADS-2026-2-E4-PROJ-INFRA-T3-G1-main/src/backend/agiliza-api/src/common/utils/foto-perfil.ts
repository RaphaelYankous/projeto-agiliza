import { BadRequestException } from '@nestjs/common';
import { In, type EntityManager } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

export const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024;
export const LIMITE_UPLOAD_FOTO = 5 * 1024 * 1024;

export type ArquivoFoto = { buffer: Buffer; mimetype: string; size: number };

export function tipoFoto(foto: Buffer): string | null {
  return foto.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'image/png'
    : foto.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      ? 'image/jpeg'
      : foto.subarray(0, 4).toString() === 'RIFF' && foto.subarray(8, 12).toString() === 'WEBP'
        ? 'image/webp' : null;
}

export function fotoPerfil(foto?: Buffer | null): string | null {
  if (!foto) return null;
  const tipo = tipoFoto(foto);
  return tipo ? `data:${tipo};base64,${foto.toString('base64')}` : null;
}

export function validarFoto(arquivo?: ArquivoFoto): Buffer {
  if (!arquivo?.buffer?.length) throw new BadRequestException('Selecione uma foto.');
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) throw new BadRequestException('A foto deve ter no máximo 2 MB.');
  const tipo = tipoFoto(arquivo.buffer);
  if (!tipo || tipo !== arquivo.mimetype) {
    throw new BadRequestException('A foto deve ser um arquivo JPG, PNG ou WebP válido.');
  }
  return arquivo.buffer;
}

export function validarFotoOpcional(arquivo?: ArquivoFoto): Buffer | null {
  return arquivo ? validarFoto(arquivo) : null;
}

export async function preencherFotos(manager: EntityManager, usuarios: Usuario[]): Promise<void> {
  if (usuarios.length === 0) return;
  const fotos = await manager.find(Usuario, {
    where: { id: In(usuarios.map((usuario) => usuario.id)) },
    select: { id: true, fotoPerfil: true },
  });
  const porId = new Map(fotos.map((usuario) => [usuario.id, usuario.fotoPerfil ?? null]));
  for (const usuario of usuarios) usuario.fotoPerfil = porId.get(usuario.id) ?? null;
}
