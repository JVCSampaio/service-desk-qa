# language: pt
@ui
Funcionalidade: Registro de chamados pela interface
  Como atendente da central de serviços
  Quero registrar uma demanda com título, solicitante e descrição
  Para que ela entre na fila com prazo e histórico

  Contexto:
    Dado que estou na central de chamados

  @smoke
  Cenário: Registrar um chamado válido
    Quando registro um chamado com:
      | Título      | Falha ao emitir nota fiscal                  |
      | Solicitante | Financeiro                                   |
      | Categoria   | Aplicações                                   |
      | Prioridade  | Alta                                         |
      | Descrição   | Erro 500 ao emitir nota para o cliente 4471. |
    Então vejo a confirmação de que o chamado foi criado
    E o chamado aparece no detalhe com status "Aberto" e prioridade "Alta"
    E o histórico mostra "Chamado registrado."
    E o chamado aparece na fila como "Aguardando atribuição"

  Cenário: Formulário vazio não é enviado
    Quando abro o formulário de novo chamado
    E tento criar o chamado sem preencher nada
    Então o campo "Título" fica marcado como inválido
    E nenhum chamado é enviado para a API

  @bug @BUG-03
  Cenário: Título preenchido só com espaços extras recebe aviso claro
    Quando registro um chamado com o título "    a"
    Então vejo um aviso que indica o campo "Título"
