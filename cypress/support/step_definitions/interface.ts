import { DataTable, Given, Then, When } from '@badeball/cypress-cucumber-preprocessor'
import { comMarca, marca } from '../dados'
import type { Chamado } from '../tipos'

// Seletores por papel e rótulo acessível (Testing Library), como um usuário encontra os elementos.
const detalhe = () => cy.findByRole('region', { name: 'Detalhes do chamado' })
const linhasDaFila = () => cy.get('button[aria-label^="Abrir chamado "]')
const historico = () => cy.findByRole('heading', { name: 'Histórico de atendimento' }).parent()
const fato = (nome: string) => detalhe().contains('dt', nome).next('dd')
const chamado = () => cy.get<Chamado>('@chamado')

// Botões que alteram o chamado: depois deles a tela recarrega o detalhe (com sucesso ou erro).
// Esperar esse recarregamento evita clicar no próximo botão com uma versão antiga do chamado.
const MUTACOES = [
  'Salvar atribuição',
  'Iniciar atendimento',
  'Resolver chamado',
  'Retomar atendimento',
  'Comentar',
]

function clicar(botao: string) {
  if (!MUTACOES.includes(botao)) {
    cy.findByRole('button', { name: botao }).click()
    return
  }
  cy.intercept('GET', /\/api\/tickets\/\d+$/).as('detalheRecarregado')
  cy.findByRole('button', { name: botao }).click()
  cy.wait('@detalheRecarregado')
}

// Termos curtos: com a digitação sintética do Cypress, buscas acima de ~50 caracteres disparam
// o erro #185 do React (observação OBS-01 em docs/PLANO_DE_TESTES.md).
function buscar(termo: string) {
  cy.findByRole('textbox', { name: 'Buscar chamados' })
    .clear()
    .type(termo, { parseSpecialCharSequences: false })
}

// Colar gera um único evento de entrada e respeita o maxlength do campo, como o navegador faz.
// O setter nativo é necessário porque o React ignora valores atribuídos direto no elemento.
function colar(seletor: Cypress.Chainable<JQuery<HTMLElement>>, texto: string) {
  seletor.then(($campo) => {
    const campo = $campo[0] as HTMLInputElement
    const valor = campo.maxLength >= 0 ? texto.slice(0, campo.maxLength) : texto
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(campo, valor)
    campo.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

// ---------- Contexto ----------

Given('que estou na central de chamados', () => {
  cy.visit('/')
  cy.findByRole('heading', { name: 'Fila de atendimento' }).should('be.visible')
})

Given('que abri esse chamado na central', () => {
  chamado().then((c) => {
    cy.visit('/')
    buscar(marca())
    cy.findByRole('button', { name: `Abrir chamado ${c.title}` }).click()
    detalhe().findByRole('heading', { name: c.title }).should('be.visible')
  })
})

Given('que uso uma tela de celular de {int} por {int} pixels', (largura: number, altura: number) => {
  cy.viewport(largura, altura)
})

Given(
  'que existem {int} chamados de um mesmo solicitante, sendo {int} urgentes',
  (total: number, urgentes: number) => {
    const requester = comMarca('Jurídico')
    for (let i = 1; i <= total; i++) {
      cy.criarChamado({
        requester,
        title: comMarca(`Revisão de contrato ${i}`),
        priority: i <= urgentes ? 'urgent' : 'low',
      })
    }
    cy.wrap(requester).as('solicitante')
  },
)

Given('que existem os chamados {string} e {string}', (primeiro: string, segundo: string) => {
  cy.criarChamado({ title: comMarca(primeiro) })
  cy.criarChamado({ title: comMarca(segundo) })
})

// Respostas simuladas com cy.intercept: só a primeira listagem falha, as seguintes vão ao servidor.
Given('que a API vai responder erro 500 uma vez ao listar chamados', () => {
  cy.intercept(
    { method: 'GET', pathname: '/api/tickets', times: 1 },
    { statusCode: 500, body: 'Internal Server Error' },
  )
})

Given('que a rede vai cair ao listar chamados', () => {
  cy.intercept({ method: 'GET', pathname: '/api/tickets', times: 1 }, { forceNetworkError: true })
})

// ---------- Registro ----------

When('abro o formulário de novo chamado', () => {
  cy.findByRole('button', { name: '+ Novo chamado' }).click()
})

When('registro um chamado com:', (tabela: DataTable) => {
  const campos = tabela.rowsHash()
  const titulo = comMarca(campos['Título'])
  cy.findByRole('button', { name: '+ Novo chamado' }).click()
  cy.findByLabelText('Título').type(titulo)
  cy.findByLabelText('Solicitante').type(campos['Solicitante'])
  cy.findByLabelText('Categoria').select(campos['Categoria'])
  cy.findByLabelText('Prioridade').select(campos['Prioridade'])
  cy.findByLabelText('Descrição').type(campos['Descrição'])
  cy.findByRole('button', { name: 'Criar chamado' }).click()
  cy.wrap(titulo).as('titulo')
})

When('registro um chamado com o título {string}', (titulo: string) => {
  cy.findByRole('button', { name: '+ Novo chamado' }).click()
  cy.findByLabelText('Título').type(titulo)
  cy.findByLabelText('Solicitante').type('Compras')
  cy.findByLabelText('Descrição').type('Acesso negado ao relatório de compras.')
  cy.findByRole('button', { name: 'Criar chamado' }).click()
})

When('tento criar o chamado sem preencher nada', () => {
  cy.intercept('POST', '/api/tickets').as('criacao')
  cy.findByRole('button', { name: 'Criar chamado' }).click()
})

Then('vejo a confirmação de que o chamado foi criado', () => {
  cy.findByRole('status')
    .invoke('text')
    .should('match', /^Chamado #\d+ criado\.$/)
})

Then(
  'o chamado aparece no detalhe com status {string} e prioridade {string}',
  (status: string, prioridade: string) => {
    cy.get<string>('@titulo').then((titulo) =>
      detalhe().findByRole('heading', { name: titulo }).should('be.visible'),
    )
    fato('Status').should('have.text', status)
    detalhe().find('.badge').should('have.text', prioridade)
  },
)

Then('o chamado aparece na fila como {string}', (situacao: string) => {
  cy.get<string>('@titulo').then((titulo) =>
    cy.findByRole('button', { name: `Abrir chamado ${titulo}` }).should('contain.text', situacao),
  )
})

Then('o campo {string} fica marcado como inválido', (rotulo: string) => {
  cy.findByLabelText(rotulo).should('match', ':invalid')
})

Then('nenhum chamado é enviado para a API', () => {
  cy.get('@criacao.all').should('have.length', 0)
})

Then('vejo um aviso que indica o campo {string}', (rotulo: string) => {
  // Aceita as duas correções possíveis: o navegador barra o campo ou a API devolve o nome dele.
  cy.findByLabelText(rotulo).then(($campo) => {
    if (!($campo[0] as HTMLInputElement).validity.valid) return
    cy.findByRole('alert').should('contain.text', rotulo)
  })
})

// ---------- Atendimento ----------

When('clico em {string}', (botao: string) => clicar(botao))

When('atribuo a equipe {string}', (equipe: string) => {
  cy.findByRole('combobox', { name: 'Equipe responsável' }).select(equipe)
  clicar('Salvar atribuição')
})

When('escrevo a nota {string}', (nota: string) => {
  cy.findByLabelText('Comentário ou solução').clear().type(nota)
})

When('outro atendente muda a prioridade do chamado para {string} pela API', (priority: string) => {
  chamado().then((c) => cy.request('PATCH', `/api/tickets/${c.id}`, { version: c.version, priority }))
})

Then('vejo o alerta {string}', (mensagem: string) => {
  cy.findByRole('alert').should('contain.text', mensagem)
})

Then('vejo a mensagem de sucesso {string}', (mensagem: string) => {
  cy.findByRole('status').should('have.text', mensagem)
})

Then('o status do chamado continua {string}', (status: string) => {
  fato('Status').should('have.text', status)
})

Then('o status do chamado passa a ser {string}', (status: string) => {
  fato('Status').should('have.text', status)
})

Then('o botão {string} fica disponível', (botao: string) => {
  cy.findByRole('button', { name: botao }).should('be.enabled')
})

Then('o botão {string} fica desabilitado', (botao: string) => {
  cy.findByRole('button', { name: botao }).should('be.disabled')
})

Then('o histórico mostra {string}', (texto: string) => {
  historico().should('contain.text', texto)
})

Then('o histórico não mostra {string}', (texto: string) => {
  historico().should('not.contain.text', texto)
})

Then('o detalhe é recarregado com a prioridade {string}', (prioridade: string) => {
  cy.findByRole('combobox', { name: 'Prioridade do chamado' })
    .find('option:selected')
    .should('have.text', prioridade)
  detalhe().find('.badge').should('have.text', prioridade)
})

// ---------- Fila ----------

When('busco por esse solicitante', () => {
  cy.get<string>('@solicitante').then(buscar)
})

When('busco por {string}', (termo: string) => buscar(comMarca(termo)))

When('colo na busca um texto de {int} caracteres', (tamanho: number) => {
  // Espera a resposta da busca: sem isso, "não vejo alerta" passaria antes de o erro chegar.
  cy.intercept({ method: 'GET', pathname: '/api/tickets' }).as('busca')
  colar(cy.findByRole('textbox', { name: 'Buscar chamados' }), 'a'.repeat(tamanho))
  cy.wait('@busca')
})

When('avanço para a próxima página', () => clicar('Próxima'))

When('filtro a prioridade {string}', (prioridade: string) => {
  cy.findByRole('combobox', { name: 'Filtrar prioridade' }).select(prioridade)
})

When('filtro o status {string}', (status: string) => {
  cy.findByRole('combobox', { name: 'Filtrar status' }).select(status)
})

Then('a fila informa {string}', (texto: string) => {
  cy.contains(texto).should('be.visible')
})

Then('a página {int} lista {int} chamado(s)', (pagina: number, quantidade: number) => {
  cy.contains(`Página ${pagina}`).should('be.visible')
  linhasDaFila().should('have.length', quantidade)
})

Then('todos os chamados listados têm prioridade {string}', (prioridade: string) => {
  linhasDaFila().each(($linha) => cy.wrap($linha).find('.badge').should('have.text', prioridade))
})

Then('a fila mostra o chamado {string}', (titulo: string) => {
  cy.findByRole('button', { name: `Abrir chamado ${comMarca(titulo)}` }).should('be.visible')
})

Then('a fila não mostra o chamado {string}', (titulo: string) => {
  cy.get(`button[aria-label="Abrir chamado ${comMarca(titulo)}"]`).should('not.exist')
})

Then('a fila mostra que nenhum chamado foi encontrado', () => {
  cy.contains('Nenhum chamado encontrado').should('be.visible')
  linhasDaFila().should('not.exist')
})

// ---------- Erros e resiliência ----------

When('clico em {string} no alerta', (botao: string) => {
  cy.findByRole('alert').findByRole('button', { name: botao }).click()
})

Then('vejo um alerta de erro com a opção {string}', (botao: string) => {
  cy.findByRole('alert').findByRole('button', { name: botao }).should('be.visible')
})

Then('o alerta de erro some', () => {
  cy.findByRole('alert').should('not.exist')
})

Then('não vejo alerta de erro', () => {
  cy.findByRole('alert').should('not.exist')
})

Then('a fila volta a listar chamados', () => {
  linhasDaFila().should('have.length.greaterThan', 0)
})

Then('vejo um alerta em português sobre a falha de conexão', () => {
  cy.findByRole('alert')
    .invoke('text')
    .should('not.contain', 'Failed to fetch')
    .and('match', /conex|rede|internet|servidor/i)
})

Then('a página não tem rolagem horizontal', () => {
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth)
  })
})

Then('o título aparece literalmente no detalhe', () => {
  chamado().then((c) => detalhe().findByRole('heading', { level: 2 }).should('have.text', c.title))
})

Then('nenhum script do título é executado', () => {
  detalhe().find('img').should('not.exist')
  cy.window().should('not.have.property', 'xss')
})
