export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function mascararCpf(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 11)
  return digitos
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

export function mascararTelefone(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 11)
  if (digitos.length === 0) return ''
  if (digitos.length <= 2) return `(${digitos}`

  const ddd = digitos.slice(0, 2)
  const numero = digitos.slice(2)
  const tamanhoPrimeiraParte = digitos.length === 11 ? 5 : 4

  if (numero.length <= tamanhoPrimeiraParte) return `(${ddd}) ${numero}`
  return `(${ddd}) ${numero.slice(0, tamanhoPrimeiraParte)}-${numero.slice(tamanhoPrimeiraParte)}`
}

export function mascararMoeda(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 10)
  if (digitos === '') return ''
  return (Number(digitos) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function mascararInteiro(valor: string, tamanhoMaximo = 6): string {
  return somenteDigitos(valor).slice(0, tamanhoMaximo)
}

export function mascararCnpj(valor: string): string {
  const digitos = somenteDigitos(valor)
  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}
