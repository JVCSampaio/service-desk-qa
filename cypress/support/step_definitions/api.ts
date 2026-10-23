import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor'
import { validarContrato } from '../contrato'
import { novoChamado, textoComTamanho } from '../dados'
import type { Chamado, Detalhe, Metricas, NovoChamado } from '../tipos'

type Resposta = Cypress.Response<any>

const CABECALHO_CSV =
  'id,title,requester,category,priority,status,assignee,created_at,resolved_at,due_at,overdue,sla_met'

/** Requisição sem falhar em 4xx/5xx: o status é verificado pelos passos "Então". */
function pedir(method: string, url: string, body?: object) {
  cy.request({ method, url, body, failOnStatusCode: false }).as('resposta')
}

const resposta = () => cy.get<Resposta>('@resposta')
const chamado = () => cy.get<Chamado>('@chamado')
const criar = (campos: NovoChamado) => pedir('POST', '/api/tickets', novoChamado(campos))

function transicao(status: string, note = '') {
  chamado().then((c) =>
    pedir('POST', `/api/tickets/${c.id}/transitions`, { version: c.version, status, note }),
  )
}

// ---------- Ações ----------

When('consulto {string}', (url: string) => pedir('GET', url))

When('crio um chamado válido pela API', () => criar({}))

When('crio um chamado com prioridade {string}', (priority: string) => criar({ priority }))

When('crio um chamado com o título {string}', (title: string) => criar({ title }))

When('crio um chamado com o campo {string} contendo {int} caracteres', (campo: string, tamanho: number) =>
  criar({ [campo]: textoComTamanho(tamanho) }),
)

When('crio um chamado com o campo {string} igual a {string}', (campo: string, valor: string) =>
  criar({ [campo]: valor }),
)

When('crio um chamado enviando também o campo {string} igual a {string}', (campo: string, valor: string) =>
  criar({ [campo]: valor }),
)

When('consulto o detalhe desse chamado', () => {
  chamado().then((c) => pedir('GET', `/api/tickets/${c.id}`))
})

When('peço a transição para {string}', (status: string) => transicao(status))

When('peço a transição para {string} com a nota {string}', (status: string, nota: string) =>
  transicao(status, nota),
)

When('altero a prioridade para {string} usando a versão {int}', (priority: string, version: number) => {
  chamado().then((c) => pedir('PATCH', `/api/tickets/${c.id}`, { version, priority }))
})

When('removo a equipe do chamado', () => {
  chamado().then((c) => pedir('PATCH', `/api/tickets/${c.id}`, { version: c.version, assignee: '' }))
})

When('salvo a mesma equipe e a mesma prioridade', () => {
  chamado().then((c) =>
    cy.detalheDoChamado(c.id).then(({ ticket }) =>
      pedir('PATCH', `/api/tickets/${c.id}`, {
        version: ticket.version,
        assignee: ticket.assignee,
        priority: ticket.priority,
      }),
    ),
  )
})

When('comento {string}', (note: string) => {
  chamado().then((c) => pedir('POST', `/api/tickets/${c.id}/comments`, { note }))
})

When('exporto os chamados em CSV', () => {
  // Em binário para enxergar o BOM: a decodificação de texto do cy.request o remove.
  cy.request({ url: '/api/export/tickets.csv', encoding: 'binary', failOnStatusCode: false }).as('resposta')
})

Given('que anotei os indicadores atuais', () => {
  cy.request<Metricas>('/api/metrics').its('body').as('indicadoresAntes')
})

// ---------- Verificações da resposta ----------

Then('a resposta tem status {int}', (status: number) => {
  resposta().then((r) =>
    expect(r.status, `status HTTP (corpo: ${JSON.stringify(r.body)?.slice(0, 300)})`).to.equal(status),
  )
})

Then('o corpo segue o contrato {string}', (nome: string) => {
  resposta().then((r) => validarContrato(r.body, nome))
})

Then('a mensagem de erro é {string}', (mensagem: string) => {
  resposta().its('body.detail').should('equal', mensagem)
})

Then('o erro de validação aponta o campo {string}', (campo: string) => {
  resposta()
    .its('body.detail')
    .then((erros: { loc: (string | number)[] }[]) => {
      expect(erros.map((e) => e.loc.at(-1))).to.include(campo)
    })
})

Then('o chamado nasce aberto, sem equipe e na versão 1', () => {
  resposta()
    .its('body')
    .should('include', { status: 'open', assignee: '', version: 1, resolved_at: null, overdue: false })
})

Then('a lista traz no máximo {int} chamados', (maximo: number) => {
  resposta().its('body.items').should('have.length.at.most', maximo)
})

Then('o histórico começa pelo evento {string}', (tipo: string) => {
  resposta()
    .its('body.events')
    .then((eventos: Detalhe['events']) => {
      expect(eventos[0].kind).to.equal(tipo)
      const ids = eventos.map((e) => e.id)
      expect(ids, 'eventos em ordem cronológica').to.deep.equal([...ids].sort((a, b) => a - b))
    })
})

Then('o prazo vence {int} horas depois da criação', (horas: number) => {
  resposta()
    .its('body')
    .then((c: Chamado) => {
      expect(Date.parse(c.due_at) - Date.parse(c.created_at)).to.equal(horas * 60 * 60 * 1000)
    })
})

Then('o prazo continua o mesmo', () => {
  chamado().then((antes) => resposta().its('body.due_at').should('equal', antes.due_at))
})

// ---------- Estado no servidor depois da ação ----------

Then(
  'o chamado continua {string} na versão {int}, só com o evento de criação',
  (status: string, versao: number) => {
    chamado().then((c) =>
      cy.detalheDoChamado(c.id).then(({ ticket, events }) => {
        expect(ticket.status).to.equal(status)
        expect(ticket.version).to.equal(versao)
        expect(events.map((e) => e.kind)).to.deep.equal(['created'])
      }),
    )
  },
)

Then('o chamado continua com a {string} e prioridade {string}', (equipe: string, prioridade: string) => {
  chamado().then((c) =>
    cy.detalheDoChamado(c.id).its('ticket').should('include', { assignee: equipe, priority: prioridade }),
  )
})

Then('o chamado continua na versão {int}', (versao: number) => {
  chamado().then((c) => cy.detalheDoChamado(c.id).its('ticket.version').should('equal', versao))
})

Then('o histórico registra a resolução e a retomada', () => {
  chamado().then((c) =>
    cy.detalheDoChamado(c.id).then(({ events }) => {
      const transicoes = events.filter((e) => e.kind === 'transition').map((e) => e.note)
      expect(transicoes.at(-2)).to.match(/^in_progress → resolved\./)
      expect(transicoes.at(-1)).to.match(/^resolved → in_progress\./)
    }),
  )
})

Then('o histórico termina com o comentário {string}', (nota: string) => {
  chamado().then((c) =>
    cy
      .detalheDoChamado(c.id)
      .its('events')
      .then((eventos: Detalhe['events']) => {
        expect(eventos.at(-1)).to.include({ kind: 'comment', note: nota })
      }),
  )
})

Then('o histórico não ganha um evento repetido', () => {
  chamado().then((c) =>
    cy.detalheDoChamado(c.id).then(({ events }) => {
      const notas = events.filter((e) => e.kind === 'updated').map((e) => e.note)
      expect(notas, 'eventos de atualização').to.have.length(new Set(notas).size)
    }),
  )
})

Then(
  'os indicadores {string} e {string} aumentam em 1',
  (primeiro: keyof Metricas, segundo: keyof Metricas) => {
    cy.get<Metricas>('@indicadoresAntes').then((antes) =>
      cy.request<Metricas>('/api/metrics').then(({ body: depois }) => {
        expect(depois[primeiro], primeiro).to.equal(Number(antes[primeiro]) + 1)
        expect(depois[segundo], segundo).to.equal(Number(antes[segundo]) + 1)
      }),
    )
  },
)

// ---------- Exportação CSV ----------

const bytesDoCsv = (r: Resposta) => Uint8Array.from(String(r.body), (c) => c.charCodeAt(0))
const linhasDoCsv = (r: Resposta) => new TextDecoder().decode(bytesDoCsv(r)).split(/\r?\n/)

Then('o arquivo começa com BOM UTF-8 e traz o cabeçalho esperado', () => {
  resposta().then((r) => {
    expect(r.headers['content-type']).to.contain('text/csv')
    expect([...bytesDoCsv(r).slice(0, 3)], 'BOM UTF-8 para o Excel').to.deep.equal([0xef, 0xbb, 0xbf])
    expect(linhasDoCsv(r)[0]).to.equal(CABECALHO_CSV)
  })
})

Then('a linha desse chamado traz o título iniciado por apóstrofo', () => {
  chamado().then((c) =>
    resposta().then((r) => {
      const linha = linhasDoCsv(r).find((l) => l.startsWith(`${c.id},`))
      expect(linha, `linha do chamado ${c.id}`).to.be.a('string')
      // Com aspas por causa das aspas internas: "'=HYPERLINK(""http://...
      expect(linha).to.match(new RegExp(`^${c.id},"?'=HYPERLINK`))
    }),
  )
})
