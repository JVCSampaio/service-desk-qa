# language: pt
@ui
Funcionalidade: Atendimento de um chamado pela interface
  Como atendente
  Quero atribuir, iniciar, comentar, resolver e retomar chamados
  Para manter a fila e o histórico corretos

  Cenário: Iniciar sem equipe mostra a regra de negócio
    Dado que existe um chamado aberto sem equipe
    E que abri esse chamado na central
    Quando clico em "Iniciar atendimento"
    Então vejo o alerta "Atribua uma equipe antes de iniciar ou retomar o atendimento."
    E o status do chamado continua "Aberto"

  @smoke
  Cenário: Atender e resolver de ponta a ponta
    Dado que existe um chamado aberto sem equipe
    E que abri esse chamado na central
    Quando atribuo a equipe "Equipe Aplicações"
    E clico em "Iniciar atendimento"
    E escrevo a nota "Certificado renovado e emissão de teste concluída."
    E clico em "Resolver chamado"
    Então o status do chamado passa a ser "Resolvido"
    E o botão "Retomar atendimento" fica disponível
    E o histórico mostra "Certificado renovado e emissão de teste concluída."

  Cenário: Solução curta é recusada
    Dado que existe um chamado em atendimento
    E que abri esse chamado na central
    Quando escrevo a nota "Feito."
    E clico em "Resolver chamado"
    Então vejo o alerta "Descreva a solução com pelo menos 10 caracteres."
    E o status do chamado continua "Em atendimento"

  Cenário: Comentário só é liberado a partir de 3 caracteres
    Dado que existe um chamado aberto sem equipe
    E que abri esse chamado na central
    Quando escrevo a nota "ok"
    Então o botão "Comentar" fica desabilitado
    Quando escrevo a nota "Cliente reenviou o print do erro."
    E clico em "Comentar"
    Então vejo a mensagem de sucesso "Comentário registrado."
    E o histórico mostra "Cliente reenviou o print do erro."

  @regressao
  Cenário: Edição simultânea não sobrescreve o trabalho de outro atendente
    Dado que existe um chamado aberto sem equipe
    E que abri esse chamado na central
    Quando outro atendente muda a prioridade do chamado para "urgent" pela API
    E atribuo a equipe "Equipe Dados"
    Então vejo o alerta "Este chamado foi alterado. Recarregue antes de salvar novamente."
    E o detalhe é recarregado com a prioridade "Urgente"

  @regressao @BUG-04
  Cenário: Histórico usa os mesmos nomes de status da tela
    Dado que existe um chamado em atendimento
    E que abri esse chamado na central
    Então o histórico mostra "Aberto → Em atendimento"
    E o histórico não mostra "in_progress"
