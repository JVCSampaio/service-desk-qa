import { novoChamado } from './dados'
import type { Chamado, Detalhe, NovoChamado, Status } from './tipos'

// Ações de aplicação: preparam o cenário pela API, que é mais rápida e estável que a interface.

declare global {
  namespace Cypress {
    interface Chainable {
      /** Cria um chamado aberto e sem equipe. */
      criarChamado(campos?: NovoChamado): Chainable<Chamado>
      /** Cria um chamado e o leva até o status pedido pelo fluxo válido. */
      prepararChamado(status: Status, campos?: NovoChamado): Chainable<Chamado>
      /** Lê o chamado e o histórico atuais no servidor. */
      detalheDoChamado(id: number): Chainable<Detalhe>
    }
  }
}

Cypress.Commands.add('criarChamado', (campos: NovoChamado = {}) =>
  cy.request<Chamado>('POST', '/api/tickets', novoChamado(campos)).its('body'),
)

Cypress.Commands.add('detalheDoChamado', (id: number) =>
  cy.request<Detalhe>(`/api/tickets/${id}`).its('body'),
)

/** Atualiza o chamado com a versão atual dele (a API usa controle otimista de versão). */
const avancar = (chamado: Chamado, corpo: object, rota: '' | '/transitions' = '') =>
  cy
    .request<Chamado>(rota ? 'POST' : 'PATCH', `/api/tickets/${chamado.id}${rota}`, {
      version: chamado.version,
      ...corpo,
    })
    .its('body')

Cypress.Commands.add('prepararChamado', (status: Status, campos: NovoChamado = {}) => {
  const aberto = cy.criarChamado(campos)
  if (status === 'open') return aberto
  const emAtendimento = aberto
    .then((chamado) => avancar(chamado, { assignee: 'Equipe Aplicações' }))
    .then((chamado) => avancar(chamado, { status: 'in_progress' }, '/transitions'))
  if (status === 'in_progress') return emAtendimento
  const note = 'Serviço reiniciado e emissão de nota validada.'
  return emAtendimento.then((chamado) => avancar(chamado, { status: 'resolved', note }, '/transitions'))
})
