import { somenteDigitos } from './mascaras'

export const SENHA_TAMANHO_MINIMO = 6

export function validarObrigatorio(valor: string): string | undefined {
  return valor.trim() === '' ? 'Campo obrigatório.' : undefined
}

export function validarEmail(email: string): string | undefined {
  if (email.trim() === '') return 'Campo obrigatório.'
  const formatoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  return formatoValido ? undefined : 'Informe um e-mail válido.'
}

export function cpfValido(cpf: string): boolean {
  const digitos = somenteDigitos(cpf)
  if (digitos.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digitos)) return false

  const calcularDigito = (base: string) => {
    const pesoInicial = base.length + 1
    const soma = [...base].reduce(
      (total, digito, indice) => total + Number(digito) * (pesoInicial - indice),
      0,
    )
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  const primeiro = calcularDigito(digitos.slice(0, 9))
  const segundo = calcularDigito(digitos.slice(0, 10))
  return primeiro === Number(digitos[9]) && segundo === Number(digitos[10])
}

export function validarCpf(cpf: string): string | undefined {
  if (cpf.trim() === '') return 'Campo obrigatório.'
  return cpfValido(cpf) ? undefined : 'Informe um CPF válido.'
}

export function validarTelefone(telefone: string): string | undefined {
  if (telefone.trim() === '') return 'Campo obrigatório.'
  const tamanho = somenteDigitos(telefone).length
  return tamanho === 10 || tamanho === 11 ? undefined : 'Informe um telefone completo com DDD.'
}

export function validarSenha(senha: string): string | undefined {
  if (senha === '') return 'Campo obrigatório.'
  return senha.length >= SENHA_TAMANHO_MINIMO
    ? undefined
    : `A senha deve ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres.`
}

export function validarConfirmacaoSenha(senha: string, confirmacao: string): string | undefined {
  if (confirmacao === '') return 'Campo obrigatório.'
  return senha === confirmacao ? undefined : 'As senhas não coincidem.'
}

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024

export const MENSAGEM_TIPO_FOTO = 'A foto deve ser um arquivo JPG, PNG ou WebP válido.'
export const MENSAGEM_TAMANHO_FOTO = 'A foto deve ter no máximo 2 MB.'

export function validarArquivoFoto(arquivo: File): string | undefined {
  if (!TIPOS_FOTO.includes(arquivo.type)) return MENSAGEM_TIPO_FOTO
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) return MENSAGEM_TAMANHO_FOTO
  return undefined
}
