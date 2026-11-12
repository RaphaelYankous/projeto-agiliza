import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { FotoGaleria } from '../../services/galeriaService'
import { arquivoPng } from '../../test/dados'
import { renderizarComRotas } from '../../test/renderizar'
import { API, servidor } from '../../test/servidor'
import { Galeria } from './Galeria'

const fotos = (quantidade: number): FotoGaleria[] =>
  Array.from({ length: quantidade }, (_, i) => ({ id: `f${i + 1}`, criadaEm: `2026-11-0${(i % 9) + 1}T10:00:00.000Z` }))

function responder({ estabelecimentos = [{ id: 'est-1', nome: 'Barbearia' }], galeria = fotos(2) } = {}) {
  servidor.use(
    http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json(estabelecimentos)),
    http.get(`${API}/estabelecimentos/est-1/fotos`, () => HttpResponse.json(galeria)),
  )
}

const renderizar = () => renderizarComRotas(<Route path="/gestor/galeria" element={<Galeria />} />, { rota: '/gestor/galeria' })
const seletor = () => screen.getByLabelText('Escolher fotos para a galeria')

describe('Tela Fotos do estabelecimento', () => {
  it('mostra as fotos da galeria e o contador', async () => {
    responder()
    renderizar()

    expect(await screen.findByText('2 de 10 fotos')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Adicionar fotos' })).toBeEnabled()
  })

  it('mostra a mensagem de galeria vazia', async () => {
    responder({ galeria: [] })
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Nenhuma foto na galeria' })).toBeInTheDocument()
    expect(screen.getByText('0 de 10 fotos')).toBeInTheDocument()
  })

  it('pede para cadastrar um estabelecimento antes de adicionar fotos', async () => {
    responder({ estabelecimentos: [] })
    renderizar()

    expect(await screen.findByRole('status')).toHaveTextContent('Cadastre um estabelecimento antes de adicionar fotos.')
    expect(screen.getByRole('link', { name: 'Cadastrar estabelecimento' })).toHaveAttribute('href', '/gestor/criar-estabelecimento')
  })

  it('mostra um alerta quando não consegue carregar o estabelecimento ou as fotos', async () => {
    servidor.use(http.get(`${API}/estabelecimentos/meus`, () => HttpResponse.json({}, { status: 500 })))
    const { unmount } = renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o seu estabelecimento.')
    unmount()

    responder()
    servidor.use(http.get(`${API}/estabelecimentos/est-1/fotos`, () => HttpResponse.json({}, { status: 500 })))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as fotos.')
  })

  it('envia várias fotos de uma vez e mostra a lista atualizada', async () => {
    responder()
    let corpo = ''
    servidor.use(
      http.post(`${API}/estabelecimentos/est-1/fotos`, async ({ request }) => {
        corpo = await request.text()
        return HttpResponse.json(fotos(4))
      }),
    )
    renderizar()
    await screen.findByText('2 de 10 fotos')

    await userEvent.upload(seletor(), [arquivoPng('a.png'), arquivoPng('b.png')])

    expect(await screen.findByRole('status')).toHaveTextContent('2 fotos adicionadas à galeria.')
    expect(screen.getByText('4 de 10 fotos')).toBeInTheDocument()
    expect(corpo.match(/name="fotos"/g)).toHaveLength(2)
  })

  it('recusa no navegador um envio que passa do limite de 10 fotos', async () => {
    responder({ galeria: fotos(9) })
    renderizar()
    await screen.findByText('9 de 10 fotos')

    await userEvent.upload(seletor(), [arquivoPng('a.png'), arquivoPng('b.png')])

    expect(screen.getByRole('alert')).toHaveTextContent('A galeria aceita no máximo 10 fotos. Você pode adicionar mais 1.')
  })

  it('aponta qual arquivo tem formato inválido', async () => {
    responder()
    renderizar()
    await screen.findByText('2 de 10 fotos')

    await userEvent.upload(seletor(), [arquivoPng('a.png'), new File(['gif'], 'b.gif', { type: 'image/gif' })], {
      applyAccept: false,
    })

    expect(screen.getByRole('alert')).toHaveTextContent('b.gif: A foto deve ser um arquivo JPG, PNG ou WebP válido.')
  })

  it('mostra a mensagem da API quando o envio é recusado', async () => {
    responder()
    servidor.use(http.post(`${API}/estabelecimentos/est-1/fotos`, () => new HttpResponse(null, { status: 413 })))
    renderizar()
    await screen.findByText('2 de 10 fotos')

    await userEvent.upload(seletor(), arquivoPng())

    expect(await screen.findByRole('alert')).toHaveTextContent('A foto deve ter no máximo 2 MB.')
  })

  it('desativa o botão quando a galeria está completa', async () => {
    responder({ galeria: fotos(10) })
    renderizar()

    expect(await screen.findByText('10 de 10 fotos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar fotos' })).toBeDisabled()
    expect(screen.getByText('A galeria está completa. Remova uma foto para adicionar outra.')).toBeInTheDocument()
  })

  it('remove uma foto depois da confirmação', async () => {
    responder()
    let removida: string | undefined
    servidor.use(
      http.delete(`${API}/estabelecimentos/est-1/fotos/:fotoId`, ({ params }) => {
        removida = params.fotoId as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar()
    await screen.findByText('2 de 10 fotos')

    await userEvent.click(screen.getByRole('button', { name: 'Remover foto 2' }))
    const dialogo = screen.getByRole('dialog', { name: 'Remover foto' })
    expect(dialogo).toHaveTextContent('Deseja remover a foto 2 da galeria?')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Foto removida da galeria.')
    expect(removida).toBe('f2')
    expect(screen.getByText('1 de 10 fotos')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mantém a foto quando a remoção falha ou é cancelada', async () => {
    responder()
    servidor.use(http.delete(`${API}/estabelecimentos/est-1/fotos/:fotoId`, () => new HttpResponse(null, { status: 404 })))
    renderizar()
    await screen.findByText('2 de 10 fotos')

    await userEvent.click(screen.getByRole('button', { name: 'Remover foto 1' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
      'A foto não foi encontrada. Atualize a página.',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('2 de 10 fotos')).toBeInTheDocument()
  })
})
