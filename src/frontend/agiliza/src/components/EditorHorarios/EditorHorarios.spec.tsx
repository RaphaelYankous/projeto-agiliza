import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorHorarios, type HorarioDaLista } from '.'

const FUNCIONAMENTO = { horarioAbertura: '09:00:00', horarioFechamento: '19:00:00' }
const SEGUNDA: HorarioDaLista = { id: 'h1', diaSemana: 1, horaInicio: '09:00:00', horaFim: '12:00:00' }
const DOMINGO: HorarioDaLista = { id: 'h2', diaSemana: 0, horaInicio: '14:00:00', horaFim: '18:00:00' }

function montar(props: Partial<Parameters<typeof EditorHorarios>[0]> = {}) {
  const aoAdicionar = vi.fn()
  const aoRemover = vi.fn()
  render(
    <EditorHorarios horarios={[]} funcionamento={FUNCIONAMENTO} aoAdicionar={aoAdicionar} aoRemover={aoRemover} {...props} />,
  )
  return { aoAdicionar, aoRemover }
}

async function preencher(dia: string, inicio: string, fim: string) {
  await userEvent.selectOptions(screen.getByLabelText('Dia da semana'), dia)
  await userEvent.clear(screen.getByLabelText('Início'))
  await userEvent.type(screen.getByLabelText('Início'), inicio)
  await userEvent.clear(screen.getByLabelText('Fim'))
  await userEvent.type(screen.getByLabelText('Fim'), fim)
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }))
}

describe('EditorHorarios', () => {
  it('mostra o funcionamento e começa o formulário nele', () => {
    montar()

    expect(screen.getByText('Funcionamento do estabelecimento: 09:00 às 19:00')).toBeInTheDocument()
    expect(screen.getByLabelText('Início')).toHaveValue('09:00')
    expect(screen.getByLabelText('Fim')).toHaveValue('19:00')
  })

  it('sem funcionamento, começa em 08:00 às 20:00 e não mostra a linha', () => {
    montar({ funcionamento: undefined })

    expect(screen.queryByText(/Funcionamento do estabelecimento/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Início')).toHaveValue('08:00')
    expect(screen.getByLabelText('Fim')).toHaveValue('20:00')
  })

  it('ignora um funcionamento sem abertura ou fechamento', () => {
    montar({ funcionamento: { horarioAbertura: '', horarioFechamento: '19:00:00' } })

    expect(screen.queryByText(/Funcionamento do estabelecimento/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Início')).toHaveValue('08:00')
  })

  it('lista os horários em ordem de dia e início', () => {
    montar({ horarios: [SEGUNDA, { ...SEGUNDA, id: 'h3', horaInicio: '07:00:00', horaFim: '08:00:00' }, DOMINGO] })

    const itens = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(itens.map((item) => item.textContent)).toEqual([
      'Domingo14:00 às 18:00Remover',
      'Segunda-feira07:00 às 08:00Remover',
      'Segunda-feira09:00 às 12:00Remover',
    ])
  })

  it('mostra o carregamento da lista', () => {
    montar({ carregando: true })
    expect(screen.getByText('Carregando horários...')).toBeInTheDocument()
  })

  it('envia o horário preenchido', async () => {
    const { aoAdicionar } = montar({ horarios: [SEGUNDA] })

    await preencher('Segunda-feira', '13:00', '18:00')

    expect(aoAdicionar).toHaveBeenCalledWith({ diaSemana: 1, horaInicio: '13:00', horaFim: '18:00' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    ['10:00', '09:00', 'O horário final precisa ser posterior ao horário inicial.'],
    ['08:00', '10:00', 'O horário precisa estar dentro do funcionamento do estabelecimento (09:00 às 19:00).'],
    ['11:00', '13:00', 'Este horário se sobrepõe a outro já cadastrado na segunda-feira (09:00 às 12:00).'],
  ])('não envia %s às %s e explica o motivo', async (inicio, fim, mensagem) => {
    const { aoAdicionar } = montar({ horarios: [SEGUNDA] })

    await preencher('Segunda-feira', inicio, fim)

    expect(screen.getByRole('alert')).toHaveTextContent(mensagem)
    expect(aoAdicionar).not.toHaveBeenCalled()
  })

  it('mostra uma mensagem quando adicionar falha', async () => {
    const aoAdicionar = vi.fn().mockRejectedValue(new Error('falhou'))
    montar({ aoAdicionar })

    await preencher('Terça-feira', '10:00', '11:00')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível adicionar o horário.')
  })

  it('pede confirmação antes de remover quando configurado', async () => {
    const { aoRemover } = montar({ horarios: [DOMINGO], confirmarRemocao: true })

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))
    const dialogo = screen.getByRole('dialog', { name: 'Remover horário' })
    expect(dialogo).toHaveTextContent('Deseja remover o horário no domingo, das 14:00 às 18:00?')
    expect(aoRemover).not.toHaveBeenCalled()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover' }))
    expect(aoRemover).toHaveBeenCalledWith('h2')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('remove o horário e mostra uma mensagem quando a remoção falha', async () => {
    const aoRemover = vi.fn().mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce(undefined)
    montar({ horarios: [SEGUNDA], aoRemover })

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível remover o horário.')

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))
    expect(aoRemover).toHaveBeenLastCalledWith('h1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
