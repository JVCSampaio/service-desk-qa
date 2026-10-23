# language: pt
@api
Funcionalidade: Contrato da API de chamados
  Como sistema que integra com o ServiceDesk
  Quero respostas com formato estável e códigos HTTP corretos
  Para consumir a API sem quebrar quando ela evoluir

  @smoke
  Cenário: Serviço disponível e com banco acessível
    Quando consulto "/api/health"
    Então a resposta tem status 200
    E o corpo segue o contrato "saude"

  @smoke
  Cenário: Criação devolve o chamado completo
    Quando crio um chamado válido pela API
    Então a resposta tem status 201
    E o corpo segue o contrato "chamado"
    E o chamado nasce aberto, sem equipe e na versão 1

  Cenário: Listagem paginada
    Quando consulto "/api/tickets?limit=5&offset=0"
    Então a resposta tem status 200
    E o corpo segue o contrato "lista-de-chamados"
    E a lista traz no máximo 5 chamados

  Cenário: Detalhe com histórico em ordem cronológica
    Dado que existe um chamado aberto sem equipe
    Quando consulto o detalhe desse chamado
    Então a resposta tem status 200
    E o corpo segue o contrato "detalhe-do-chamado"
    E o histórico começa pelo evento "created"

  Cenário: Indicadores da central
    Quando consulto "/api/metrics"
    Então a resposta tem status 200
    E o corpo segue o contrato "metricas"

  Cenário: Chamado inexistente
    Quando consulto "/api/tickets/999999"
    Então a resposta tem status 404
    E o corpo segue o contrato "erro"
    E a mensagem de erro é "Chamado não encontrado."

  Esquema do Cenário: Parâmetro de consulta inválido: <parametro>
    Quando consulto "/api/tickets?<parametro>"
    Então a resposta tem status 422
    E o corpo segue o contrato "erro-de-validacao"

    Exemplos:
      | parametro     |
      | limit=0       |
      | limit=101     |
      | offset=-1     |
      | status=closed |
      | priority=max  |
