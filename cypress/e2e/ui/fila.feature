# language: pt
@ui
Funcionalidade: Fila de atendimento
  Como atendente
  Quero buscar, filtrar e paginar os chamados
  Para encontrar rapidamente o que preciso atender

  Cenário: Busca pelo solicitante com páginas de 8 chamados
    Dado que existem 9 chamados de um mesmo solicitante, sendo 2 urgentes
    E que estou na central de chamados
    Quando busco por esse solicitante
    Então a fila informa "9 chamado(s) no filtro"
    E a página 1 lista 8 chamados
    Quando avanço para a próxima página
    Então a página 2 lista 1 chamado

  Cenário: Filtro de prioridade combinado com a busca
    Dado que existem 9 chamados de um mesmo solicitante, sendo 2 urgentes
    E que estou na central de chamados
    Quando busco por esse solicitante
    E filtro a prioridade "Urgente"
    Então a fila informa "2 chamado(s) no filtro"
    E todos os chamados listados têm prioridade "Urgente"

  @regressao
  Cenário: Busca trata o % como texto, não como curinga
    Dado que existem os chamados "Desconto de 100% não aplicado" e "Desconto de 1000 não aplicado"
    E que estou na central de chamados
    Quando busco por "100% não aplicado"
    Então a fila mostra o chamado "Desconto de 100% não aplicado"
    E a fila não mostra o chamado "Desconto de 1000 não aplicado"

  @regressao @BUG-01
  Cenário: Busca acima do limite de 120 caracteres não mostra erro genérico
    Dado que estou na central de chamados
    Quando colo na busca um texto de 121 caracteres
    Então não vejo alerta de erro
    E a fila mostra que nenhum chamado foi encontrado
