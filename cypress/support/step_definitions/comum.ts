import { Before, Given } from '@badeball/cypress-cucumber-preprocessor'
import { comMarca, novaMarca } from '../dados'
import type { Chamado } from '../tipos'

Before(() => {
  novaMarca()
})

Given('que existe um chamado aberto sem equipe', () => {
  cy.criarChamado().as('chamado')
})

Given('que existe um chamado em atendimento', () => {
  cy.prepararChamado('in_progress').as('chamado')
})

Given('que existe um chamado resolvido', () => {
  cy.prepararChamado('resolved').as('chamado')
})

Given('que existe um chamado com o título {string}', (titulo: string) => {
  cy.criarChamado({ title: comMarca(titulo) }).as('chamado')
})

Given('outro atendente atribuiu o chamado à {string}', (equipe: string) => {
  cy.get<Chamado>('@chamado').then((chamado) =>
    cy.request('PATCH', `/api/tickets/${chamado.id}`, { version: chamado.version, assignee: equipe }),
  )
})
