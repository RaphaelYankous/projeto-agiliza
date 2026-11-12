import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect } from 'vitest'
import { servidor } from './servidor'

const chamadasSemResposta: string[] = []

beforeAll(() =>
  servidor.listen({
    onUnhandledFrame: async ({ frame, defaults }) => {
      chamadasSemResposta.push(await frame.getUnhandledMessage())
      defaults.error()
    },
  }),
)

afterEach(() => {
  cleanup()
  servidor.resetHandlers()
  localStorage.clear()
  const pendentes = chamadasSemResposta.splice(0)
  expect(pendentes, 'Chamada à API sem resposta simulada no teste').toEqual([])
})

afterAll(() => servidor.close())
