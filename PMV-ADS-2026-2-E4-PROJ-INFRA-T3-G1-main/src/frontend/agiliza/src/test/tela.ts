import { vi } from 'vitest'

export function simularTela({ celular }: { celular: boolean }) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((consulta: string) => ({
      matches: celular,
      media: consulta,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}
