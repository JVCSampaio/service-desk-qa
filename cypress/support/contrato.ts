import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import chamado from '../contratos/chamado.schema.json'
import detalhe from '../contratos/detalhe-do-chamado.schema.json'
import erro from '../contratos/erro.schema.json'
import erroDeValidacao from '../contratos/erro-de-validacao.schema.json'
import lista from '../contratos/lista-de-chamados.schema.json'
import metricas from '../contratos/metricas.schema.json'
import saude from '../contratos/saude.schema.json'

// Contratos estritos (additionalProperties: false): um campo novo ou removido na API
// quebra o teste e obriga a revisar o schema de forma consciente.
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of [chamado, detalhe, erro, erroDeValidacao, lista, metricas, saude]) ajv.addSchema(schema)

export function validarContrato(corpo: unknown, nome: string) {
  const validar = ajv.getSchema(nome)
  if (!validar) throw new Error(`Contrato desconhecido: ${nome}`)
  const valido = validar(corpo)
  const erros = (validar.errors ?? []).map((e) => `${e.instancePath || '(raiz)'} ${e.message}`).join('; ')
  expect(valido, `corpo segue o contrato "${nome}"${erros ? ` — ${erros}` : ''}`).to.equal(true)
}
