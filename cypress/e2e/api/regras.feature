# language: pt
@api
Funcionalidade: Regras do ciclo de atendimento
  Como coordenador da central de serviços
  Quero que o fluxo Aberto → Em atendimento → Resolvido seja respeitado
  Para que prazos, responsáveis e soluções sejam confiáveis

  Esquema do Cenário: Prazo de atendimento da prioridade <prioridade>
    Quando crio um chamado com prioridade "<prioridade>"
    Então o prazo vence <horas> horas depois da criação

    Exemplos:
      | prioridade | horas |
      | urgent     | 4     |
      | high       | 8     |
      | normal     | 24    |
      | low        | 48    |

  Cenário: Chamado que nem começou não pode ser resolvido
    Dado que existe um chamado aberto sem equipe
    Quando peço a transição para "resolved" com a nota "Solução aplicada e validada."
    Então a resposta tem status 409
    E a mensagem de erro é "Transição inválida para o estado atual do chamado."

  Cenário: Iniciar sem equipe falha sem alterar o chamado
    Dado que existe um chamado aberto sem equipe
    Quando peço a transição para "in_progress"
    Então a resposta tem status 409
    E a mensagem de erro é "Atribua uma equipe antes de iniciar ou retomar o atendimento."
    E o chamado continua "open" na versão 1, só com o evento de criação

  Cenário: Solução precisa de pelo menos 10 caracteres
    Dado que existe um chamado em atendimento
    Quando peço a transição para "resolved" com a nota "Resolvido"
    Então a resposta tem status 409
    E a mensagem de erro é "Descreva a solução com pelo menos 10 caracteres."

  Cenário: Equipe não pode ser removida de um chamado em atendimento
    Dado que existe um chamado em atendimento
    Quando removo a equipe do chamado
    Então a resposta tem status 409
    E a mensagem de erro é "Um chamado em atendimento precisa ter equipe atribuída."

  @regressao
  Cenário: Versão desatualizada não sobrescreve uma alteração mais nova
    Dado que existe um chamado aberto sem equipe
    E outro atendente atribuiu o chamado à "Equipe Dados"
    Quando altero a prioridade para "urgent" usando a versão 1
    Então a resposta tem status 409
    E a mensagem de erro é "Este chamado foi alterado. Recarregue antes de salvar novamente."
    E o chamado continua com a "Equipe Dados" e prioridade "normal"

  Cenário: Retomar um chamado resolvido mantém o prazo original
    Dado que existe um chamado resolvido
    Quando peço a transição para "in_progress"
    Então a resposta tem status 200
    E o prazo continua o mesmo
    E o histórico registra a resolução e a retomada

  Cenário: Comentário entra no histórico sem mudar a versão
    Dado que existe um chamado aberto sem equipe
    Quando comento "Cliente enviou o print do erro."
    Então a resposta tem status 201
    E o histórico termina com o comentário "Cliente enviou o print do erro."
    E o chamado continua na versão 1

  Cenário: Novo chamado urgente entra nos indicadores
    Dado que anotei os indicadores atuais
    Quando crio um chamado com prioridade "urgent"
    Então os indicadores "active" e "urgent" aumentam em 1

  @seguranca
  Cenário: Exportação CSV neutraliza fórmulas de planilha
    Dado que existe um chamado com o título '=HYPERLINK("http://exemplo.com")'
    Quando exporto os chamados em CSV
    Então a resposta tem status 200
    E o arquivo começa com BOM UTF-8 e traz o cabeçalho esperado
    E a linha desse chamado traz o título iniciado por apóstrofo

  @bug @BUG-05
  Cenário: Salvar sem alterações não cria versão nem evento novo
    Dado que existe um chamado aberto sem equipe
    E outro atendente atribuiu o chamado à "Equipe Dados"
    Quando salvo a mesma equipe e a mesma prioridade
    Então o chamado continua na versão 2
    E o histórico não ganha um evento repetido
