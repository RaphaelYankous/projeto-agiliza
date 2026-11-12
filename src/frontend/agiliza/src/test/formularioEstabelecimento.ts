import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export async function preencherEstabelecimento() {
  await userEvent.type(screen.getByLabelText('Nome fantasia'), 'Barbearia Nova')
  await userEvent.type(screen.getByLabelText('Razão social'), 'Nova LTDA')
  await userEvent.type(screen.getByLabelText('CNPJ'), '11.222.333/0001-81')
  await userEvent.type(screen.getByLabelText('E-mail'), 'nova@email.com')
  await userEvent.type(screen.getByLabelText('Endereço'), 'Rua A, 10')
  await userEvent.type(screen.getByLabelText('Latitude'), '-19.9')
  await userEvent.type(screen.getByLabelText('Longitude'), '-43.9')
  await userEvent.type(screen.getByLabelText('Telefone'), '(31) 98888-1001')
  await userEvent.type(screen.getByLabelText('Horário de abertura'), '09:00')
  await userEvent.type(screen.getByLabelText('Horário de fechamento'), '18:00')
  await userEvent.click(screen.getByRole('checkbox', { name: 'Segunda' }))
  await userEvent.click(screen.getByRole('checkbox', { name: 'Sábado' }))
}

export const DADOS_PREENCHIDOS = {
  nome: 'Barbearia Nova',
  razaoSocial: 'Nova LTDA',
  cnpj: '11222333000181',
  email: 'nova@email.com',
  endereco: 'Rua A, 10',
  latitude: -19.9,
  longitude: -43.9,
  telefone: '31988881001',
  horarioAbertura: '09:00',
  horarioFechamento: '18:00',
  diasFuncionamento: ['segunda', 'sabado'],
}
