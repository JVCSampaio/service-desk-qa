import type { NovoChamado } from './tipos'

// Cada cenário ganha uma marca única (ex.: QA-MH4K2Z1F). Ela vai no fim dos títulos e nas buscas,
// então os cenários não dependem dos dados de demonstração nem uns dos outros.
// O Cypress empacota o support e os passos separadamente (cada um com sua cópia deste módulo);
// por isso a marca fica em Cypress.expose, que os dois pacotes compartilham.
export function novaMarca() {
  const sufixo = Cypress._.random(36 ** 2 - 1).toString(36)
  Cypress.expose('marca', `QA-${Date.now().toString(36)}${sufixo}`.toUpperCase())
}

export const marca = (): string => Cypress.expose('marca') ?? ''

export const comMarca = (texto: string) => `${texto} ${marca()}`

/** Texto com exatamente `tamanho` caracteres, começando pela marca quando couber. */
export const textoComTamanho = (tamanho: number) => `${marca()} `.padEnd(tamanho, 'x').slice(0, tamanho)

export function novoChamado(campos: NovoChamado = {}): NovoChamado {
  return {
    title: comMarca('Falha ao emitir nota fiscal'),
    description: 'Erro 500 ao emitir nota fiscal pelo módulo de faturamento.',
    requester: 'Financeiro',
    category: 'Aplicações',
    priority: 'normal',
    ...campos,
  }
}
