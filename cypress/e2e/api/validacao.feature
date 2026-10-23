# language: pt
@api
Funcionalidade: Validação dos dados de um novo chamado
  Como responsável pela qualidade da fila de atendimento
  Quero que a API recuse chamados fora das regras de preenchimento
  Para que cada demanda chegue com contexto suficiente

  Limites: título de 5 a 120 caracteres, descrição de 10 a 3000 e solicitante de 2 a 80,
  sem contar espaços nas pontas. Os exemplos usam análise de valor-limite (logo abaixo,
  no limite e logo acima).

  Esquema do Cenário: <campo> com <tamanho> caracteres devolve <status>
    Quando crio um chamado com o campo "<campo>" contendo <tamanho> caracteres
    Então a resposta tem status <status>

    Exemplos: Título
      | campo | tamanho | status |
      | title | 4       | 422    |
      | title | 5       | 201    |
      | title | 120     | 201    |
      | title | 121     | 422    |

    Exemplos: Descrição
      | campo       | tamanho | status |
      | description | 9       | 422    |
      | description | 10      | 201    |
      | description | 3000    | 201    |
      | description | 3001    | 422    |

    Exemplos: Solicitante
      | campo     | tamanho | status |
      | requester | 1       | 422    |
      | requester | 2       | 201    |
      | requester | 80      | 201    |
      | requester | 81      | 422    |

  Cenário: Espaços nas pontas não contam para o tamanho mínimo
    Quando crio um chamado com o título "   abc   "
    Então a resposta tem status 422
    E o erro de validação aponta o campo "title"

  Esquema do Cenário: Valor fora da lista em <campo>
    Quando crio um chamado com o campo "<campo>" igual a "<valor>"
    Então a resposta tem status 422
    E o erro de validação aponta o campo "<campo>"

    Exemplos:
      | campo    | valor      |
      | category | Financeiro |
      | priority | critica    |

  @seguranca
  Cenário: Campo fora do contrato é recusado
    # Impede criar um chamado já resolvido por atribuição em massa (mass assignment).
    Quando crio um chamado enviando também o campo "status" igual a "resolved"
    Então a resposta tem status 422
    E o erro de validação aponta o campo "status"
