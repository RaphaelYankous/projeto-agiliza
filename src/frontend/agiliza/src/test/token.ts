import type { Perfil } from '../services/sessao'

const base64Url = (valor: object) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(valor))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export function criarToken({
  email = 'ana@email.com',
  perfil = 'cliente',
  expiraEmSegundos = 3600,
}: { email?: string; perfil?: Perfil | string; expiraEmSegundos?: number } = {}): string {
  const exp = Math.floor(Date.now() / 1000) + expiraEmSegundos
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ sub: 'id', email, role: perfil, exp })}.assinatura`
}
