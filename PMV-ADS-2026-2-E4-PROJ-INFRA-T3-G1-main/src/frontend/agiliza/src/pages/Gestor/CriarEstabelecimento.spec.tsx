import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AVISO_FOTO_NAO_SALVA } from '../../services/estabelecimentoService'
import { arquivoPng } from '../../test/dados'
import { DADOS_PREENCHIDOS, preencherEstabelecimento } from '../../test/formularioEstabelecimento'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { CriarEstabelecimento } from './CriarEstabelecimento'

const renderizar = () =>
  renderizarComRotas(
    <>
      <Route path="/gestor/criar-estabelecimento" element={<CriarEstabelecimento />} />
      <Route path="/gestor" element={<PaginaAtual nome="Painel" />} />
    </>,
    { rota: '/gestor/criar-estabelecimento' },
  )

const criar = () => userEvent.click(screen.getByRole('button', { name: 'Criar estabelecimento' }))

describe('Tela Criar estabelecimento', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
  })

  it('mostra os erros de cada campo sem chamar a API', async () => {
    renderizar()

    await userEvent.type(screen.getByLabelText('Latitude'), '100')
    await criar()

    expect(screen.getByRole('alert')).toHaveTextContent('Por favor, corrija os erros abaixo:')
    expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Razão social é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('CNPJ é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Latitude deve estar entre -90 e 90')).toBeInTheDocument()
    expect(screen.getByText('Longitude é obrigatória')).toBeInTheDocument()
    expect(screen.getAllByText('Campo obrigatório.')).toHaveLength(2)
    expect(screen.getByText('Horário de abertura é obrigatório')).toBeInTheDocument()
  })

  it('cria o estabelecimento com CNPJ e telefone só com números e volta para o painel', async () => {
    let corpo: unknown
    servidor.use(
      http.post(`${API}/estabelecimentos`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 'novo' }, { status: 201 })
      }),
    )
    renderizar()

    await preencherEstabelecimento()
    expect(screen.getByLabelText('CNPJ')).toHaveValue('11222333000181')
    await criar()

    expect(await screen.findByText('Painel em /gestor')).toBeInTheDocument()
    expect(corpo).toEqual(DADOS_PREENCHIDOS)
  })

  it('envia a foto escolhida depois de criar o estabelecimento', async () => {
    let fotoEnviadaPara: string | undefined
    servidor.use(
      http.post(`${API}/estabelecimentos`, () => HttpResponse.json({ id: 'novo' }, { status: 201 })),
      http.patch(`${API}/estabelecimentos/:id/foto`, ({ params }) => {
        fotoEnviadaPara = params.id as string
        return HttpResponse.json({ fotoAtualizadaEm: '2026-11-07T12:00:00.000Z' })
      }),
    )
    renderizar()

    await userEvent.upload(screen.getByLabelText('Escolher foto principal (opcional)', { selector: 'input' }), arquivoPng())
    await preencherEstabelecimento()
    await criar()

    expect(await screen.findByText('Painel em /gestor')).toBeInTheDocument()
    expect(fotoEnviadaPara).toBe('novo')
  })

  it('avisa no painel quando o estabelecimento foi criado mas a foto falhou', async () => {
    servidor.use(
      http.post(`${API}/estabelecimentos`, () => HttpResponse.json({ id: 'novo' }, { status: 201 })),
      http.patch(`${API}/estabelecimentos/:id/foto`, () => HttpResponse.json({}, { status: 500 })),
    )
    renderizar()

    await userEvent.upload(screen.getByLabelText('Escolher foto principal (opcional)', { selector: 'input' }), arquivoPng())
    await preencherEstabelecimento()
    await criar()

    expect(await screen.findByText(`Painel em /gestor com o aviso: ${AVISO_FOTO_NAO_SALVA}`)).toBeInTheDocument()
  })

  it('recusa foto em formato inválido', async () => {
    renderizar()

    await userEvent.upload(
      screen.getByLabelText('Escolher foto principal (opcional)', { selector: 'input' }),
      new File(['gif'], 'foto.gif', { type: 'image/gif' }),
      { applyAccept: false },
    )

    expect(screen.getByRole('alert')).toHaveTextContent('A foto deve ser um arquivo JPG, PNG ou WebP válido.')
  })

  it('mostra um alerta quando a API recusa o cadastro', async () => {
    servidor.use(http.post(`${API}/estabelecimentos`, () => HttpResponse.json({}, { status: 400 })))
    renderizar()

    await preencherEstabelecimento()
    await criar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o estabelecimento. Tente novamente.')
    expect(screen.getByRole('button', { name: 'Criar estabelecimento' })).toBeEnabled()
  })
})
