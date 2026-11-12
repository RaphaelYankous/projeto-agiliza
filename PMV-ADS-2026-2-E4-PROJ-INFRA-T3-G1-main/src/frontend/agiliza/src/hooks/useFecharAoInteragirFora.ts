import { useEffect, type RefObject } from 'react'

export function useFecharAoInteragirFora(
  ref: RefObject<HTMLElement | null>,
  aberto: boolean,
  aoFechar: () => void,
) {
  useEffect(() => {
    if (!aberto) return

    const aoClicar = (evento: PointerEvent) => {
      if (ref.current && !ref.current.contains(evento.target as Node)) aoFechar()
    }
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar()
    }

    document.addEventListener('pointerdown', aoClicar)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('pointerdown', aoClicar)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [ref, aberto, aoFechar])
}
