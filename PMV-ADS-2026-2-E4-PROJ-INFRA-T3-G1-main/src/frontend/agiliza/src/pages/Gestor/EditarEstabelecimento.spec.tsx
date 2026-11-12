import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AVISO_FOTO_NAO_SALVA } from '../../services/estabelecimentoService'
import { arquivoPng, estabelecimentoGestor } from '../../test/dados'
import { DADOS_PREENCHIDOS, preencherEstabelecimento } from '../../test/formularioEstabelecimento'
import { PaginaAtual, renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { EditarEstabelecimento } from './EditarEstabelecimento'

function renderizar(estabelecimento?: ReturnType<typeof estabelecimentoGestor>) {
  return renderizarComRotas(
    <>
      <Route path="/gestor/editar-estabelecimento" element={<EditarEstabelecimento />} />
      <Route path="/gestor" element={<PaginaAtual nome="Painel" />} />
    </>,
    { rota: { pathname: '/gestor/editar-estabelecimento', state: estabelecimento ? { estabelecimento } : undefined } },
  )
}

const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

describe('Tela Editar estabelecimento', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
  })

  it('preenche o formulário com os dados recebidos do painel e mostra a foto atual', () => {
    renderizar(estabelecimentoGestor({ fotoAtualizadaEm: '2026-11-07T12:00:00.000Z' }))

    expect(screen.getByRole('heading', { name: 'Editar Estabelecimento' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome fantasia')).toHaveValue('Barbearia do Pedro')
    expect(screen.getByLabelText('Latitude')).toHaveValue('-19.92')
    expect(screen.getByRole('checkbox', { name: 'Segunda' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Domingo' })).not.toBeChecked()
    expect(screen.getByRole('img', { name: 'Prévia da foto principal do estabelecimento' })).toHaveAttribute(
      'src',
      expect.stringContaining('/estabelecimentos/est-1/foto?v='),
    )
    expect(screen.getByRole('button', { name: 'Trocar foto principal' })).toBeInTheDocument()
  })

  it('salva as alterações e volta para o painel', async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.patch(`${API}/estabelecimentos/est-1`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: 'est-1' })
      }),
    )
    renderizar(estabelecimentoGestor())

    await userEvent.clear(screen.getByLabelText('Nome fantasia'))
    await userEvent.type(screen.getByLabelText('Nome fantasia'), 'Barbearia Renovada')
    await salvar()

    expect(await screen.findByText('Painel em /gestor')).toBeInTheDocument()
    expect(corpo).toMatchObject({ nome: 'Barbearia Renovada', latitude: -19.92, diasFuncionamento: ['segunda', 'terca'] })
  })

  it('troca a foto antes de salvar os dados', async () => {
    const ordem: string[] = []
    servidor.use(
      http.patch(`${API}/estabelecimentos/est-1/foto`, () => {
        ordem.push('foto')
        return HttpResponse.json({ fotoAtualizadaEm: '2026-11-08T12:00:00.000Z' })
      }),
      http.patch(`${API}/estabelecimentos/est-1`, () => {
        ordem.push('dados')
        return HttpResponse.json({ id: 'est-1' })
      }),
    )
    renderizar(estabelecimentoGestor())

    await userEvent.upload(screen.getByLabelText('Escolher foto principal (opcional)', { selector: 'input' }), arquivoPng())
    await salvar()

    expect(await screen.findByText('Painel em /gestor')).toBeInTheDocument()
    expect(ordem).toEqual(['foto', 'dados'])
  })

  it('não salva os dados quando a foto é recusada e mostra o motivo no campo', async () => {
    servidor.use(
      http.patch(`${API}/estabelecimentos/est-1/foto`, () =>
        HttpResponse.json({ message: 'A foto deve ser um arquivo JPG, PNG ou WebP válido.' }, { status: 400 }),
      ),
    )
    renderizar(estabelecimentoGestor())

    await userEvent.upload(screen.getByLabelText('Escolher foto principal (opcional)', { selector: 'input' }), arquivoPng())
    await salvar()

    expect(await screen.findByRole('alert')).toHaveTextContent('A foto deve ser um arquivo JPG, PNG ou WebP válido.')
    expect(screen.getByRole('button', { name: 'Escolher foto principal (opcional)' })).toBeInTheDocument()
  })

  it('mostra um alerta quando a API recusa as alterações', async () => {
    servidor.use(http.patch(`${API}/estabelecimentos/est-1`, () => HttpResponse.json({}, { status: 500 })))
    renderizar(estabelecimentoGestor())

    await salvar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o estabelecimento. Tente novamente.')
  })

  it('sem dados recebidos, funciona como cadastro de um estabelecimento novo', async () => {
    let corpo: unknown
    servidor.use(
      http.post(`${API}/estabelecimentos`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json({ id: 'novo' }, { status: 201 })
      }),
      http.patch(`${API}/estabelecimentos/novo/foto`, () => HttpResponse.json({}, { status: 500 })),
    )
    renderizar()

    expect(screen.getByRole('heading', { name: 'Criar Estabelecimento' })).toBeInTheDocument()
    await userEvent.upload(screen.getByLabelText('Escolher foto principal (opcional)', { selector: 'input' }), arquivoPng())
    await preencherEstabelecimento()
    await userEvent.click(screen.getByRole('button', { name: 'Criar estabelecimento' }))

    expect(await screen.findByText(`Painel em /gestor com o aviso: ${AVISO_FOTO_NAO_SALVA}`)).toBeInTheDocument()
    expect(corpo).toEqual(DADOS_PREENCHIDOS)
  })
})
