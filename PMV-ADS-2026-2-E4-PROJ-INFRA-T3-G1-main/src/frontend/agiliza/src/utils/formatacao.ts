export function formatarPreco(valorEmCentavos: number): string {
  return (valorEmCentavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatarDistancia(distanciaKm: number): string {
  if (distanciaKm < 1) {
    const metros = Math.max(1, Math.round(distanciaKm * 1000))
    return `${metros} m`
  }
  return `${distanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
}

export function formatarNota(nota: number): string {
  return nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// "Hoje, 10:30" para o dia atual; "05/09, 15:00" nos demais (com o ano se não for o atual)
export function formatarDataHora(dataIso: string, agora: Date = new Date()): string {
  const data = new Date(dataIso)
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (data.toDateString() === agora.toDateString()) return `Hoje, ${hora}`

  const mesmoAno = data.getFullYear() === agora.getFullYear()
  const dia = data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    ...(mesmoAno ? {} : { year: 'numeric' }),
  })
  return `${dia}, ${hora}`
}
