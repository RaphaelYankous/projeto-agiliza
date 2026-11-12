const CHAVE_TOKEN = 'agiliza.token'

export type Perfil = 'cliente' | 'profissional' | 'gestor'

export type UsuarioLogado = {
  email: string
  perfil: Perfil
}

type DadosToken = UsuarioLogado & {
  expiraEm: number
}

export const ROTULO_PERFIL: Record<Perfil, string> = {
  cliente: 'Cliente',
  profissional: 'Profissional',
  gestor: 'Gestor',
}

export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function salvarToken(token: string): void {
  try {
    localStorage.setItem(CHAVE_TOKEN, token)
  } catch {
    return
  }
}

export function removerToken(): void {
  try {
    localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    return
  }
}

export function decodificarToken(token: string): DadosToken | null {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return null

    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
    const comPadding = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const bytes = Uint8Array.from(atob(comPadding), (caractere) => caractere.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes))

    const perfilValido = typeof payload.role === 'string' && payload.role in ROTULO_PERFIL
    if (typeof payload.email !== 'string' || !perfilValido || typeof payload.exp !== 'number') {
      return null
    }

    return {
      email: payload.email,
      perfil: payload.role as Perfil,
      expiraEm: payload.exp * 1000,
    }
  } catch {
    return null
  }
}

export function tokenExpirado(token: string): boolean {
  const dados = decodificarToken(token)
  return !dados || dados.expiraEm <= Date.now()
}
