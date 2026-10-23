# language: pt
@ui
Funcionalidade: Erros, segurança e layout da interface
  Como atendente
  Quero mensagens claras e uma tela que funcione no celular
  Para continuar trabalhando mesmo quando algo dá errado

  Cenário: Erro do servidor ao carregar a fila permite recarregar
    Dado que a API vai responder erro 500 uma vez ao listar chamados
    E que estou na central de chamados
    Então vejo um alerta de erro com a opção "Recarregar"
    Quando clico em "Recarregar" no alerta
    Então o alerta de erro some
    E a fila volta a listar chamados

  @seguranca
  Cenário: HTML no título é exibido como texto, sem ser executado
    Dado que existe um chamado com o título '<img src=x onerror="window.xss=1">'
    E que abri esse chamado na central
    Então o título aparece literalmente no detalhe
    E nenhum script do título é executado

  Cenário: Tela de celular sem rolagem horizontal
    Dado que uso uma tela de celular de 390 por 844 pixels
    E que estou na central de chamados
    Então a página não tem rolagem horizontal

  @regressao @BUG-02
  Cenário: Alerta de erro some quando a consulta seguinte dá certo
    Dado que a API vai responder erro 500 uma vez ao listar chamados
    E que estou na central de chamados
    Quando filtro o status "Aberto"
    Então a fila volta a listar chamados
    E o alerta de erro some

  @regressao @BUG-06
  Cenário: Queda de rede mostra mensagem em português
    Dado que a rede vai cair ao listar chamados
    E que estou na central de chamados
    Então vejo um alerta em português sobre a falha de conexão
