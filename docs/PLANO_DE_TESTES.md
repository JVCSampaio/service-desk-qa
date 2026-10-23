# Plano e estratégia de testes

Sistema sob teste: [ServiceDesk](https://github.com/JVCSampaio/service-desk) (React + TypeScript,
API FastAPI, SQLite). Os defeitos foram encontrados na versão
[`520888b`](https://github.com/JVCSampaio/service-desk/tree/520888b0b6e6150b43b35c27cd4a03503ec73733);
desde a correção no [PR #7](https://github.com/JVCSampaio/service-desk/pull/7), a suíte fixa a versão [`eb934d7`](https://github.com/JVCSampaio/service-desk/tree/eb934d7f0befa0333a173edbb353a65d549f62c4).

## 1. Objetivo

Dar confiança para liberar novas versões do ServiceDesk, cobrindo os riscos que mais afetam o
atendimento: chamados que pulam etapas, prazos calculados errado, atendentes sobrescrevendo o
trabalho uns dos outros e integrações quebrando por mudança de contrato.

## 2. Escopo

**Dentro:** todas as rotas da API; registro, atendimento, fila e mensagens de erro na interface;
tela de celular (390 px); segurança básica (campos extras, fórmula em CSV, HTML no título).

**Fora:** carga e desempenho, auditoria completa de acessibilidade, navegadores além do Chrome,
autenticação (o sistema não tem) e o modelo Power BI. A persistência entre reinícios já é coberta
pelos testes Pytest do próprio ServiceDesk.

## 3. Riscos e cobertura

| Risco                                    | Impacto | Como a suíte cobre                                                           |
| ---------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| Atendente sobrescreve alteração de outro | Alto    | Controle de versão na API (409) e na interface (alerta e recarga do detalhe) |
| Prazo de atendimento calculado errado    | Alto    | Esquema do Cenário com as quatro prioridades (4, 8, 24 e 48 h)               |
| Chamado pula etapas do fluxo             | Alto    | Transições inválidas, início sem equipe, solução curta, remoção de equipe    |
| Dados incompletos entram na fila         | Médio   | Valor-limite nos três campos de texto, valores fora da lista e campos extras |
| Contrato da API muda sem aviso           | Médio   | JSON Schema estrito em todas as respostas, inclusive erros                   |
| Planilha executa fórmula vinda do CSV    | Médio   | Título iniciado por `=` exportado com apóstrofo                              |
| Busca, filtro ou paginação errados       | Médio   | Busca por solicitante, 8 itens por página, filtro combinado, `%` literal     |
| Erro sem orientação para o atendente     | Baixo   | Falhas simuladas com `cy.intercept` (erro 500 e queda de rede)               |

## 4. Abordagem

- **Pirâmide:** 41 cenários de API (rápidos e estáveis) e 18 de interface, reservados ao que o
  usuário vê e às integrações entre tela e API.
- **BDD em português:** cada `.feature` descreve o comportamento com exemplos concretos.
  Os passos são reutilizáveis e não expõem detalhes de implementação.
- **Técnicas:** análise de valor-limite, partição de equivalência (valores fora da lista),
  tabela de estados (transições), testes negativos, injeção de falhas e teste exploratório.
- **Tags:** `@smoke` (caminho crítico), `@api`, `@ui`, `@regressao`, `@seguranca`, `@bug`
  (defeito conhecido em aberto) e `@BUG-0X` (rastreia o cenário até o defeito). O CI roda `not @bug`.

## 5. Ambiente e dados

- O ServiceDesk é clonado na versão fixada (`SUT_REF`), compilado e iniciado com um banco SQLite
  novo a cada execução. A execução diária do CI usa a `main` mais recente; outra versão pode ser
  testada pelo disparo manual do workflow.
- Os cenários criam os próprios dados pela API. Cada cenário recebe uma marca única
  (ex.: `QA-MH4K2Z1F`) usada nos títulos e nas buscas, o que o isola dos dados de demonstração
  e dos outros cenários.
- Não há espera fixa (`cy.wait(ms)`): a sincronização usa as asserções do Cypress e a espera por
  requisições interceptadas.

## 6. Critérios de entrada e saída

**Entrada:** `GET /api/health` responde 200 e o build do React foi concluído.

**Saída (gate do CI):** todos os cenários fora de `@bug` passam; formatação e tipos sem erros;
todo defeito novo é registrado em [BUGS.md](BUGS.md) com um cenário `@bug` que o reproduz e vira
issue no ServiceDesk. Corrigido o defeito, a tag passa a `@regressao` e o cenário entra no gate.

## 7. Rastreabilidade

Requisitos e critérios de aceite retirados de
[`docs/ANALISE.md`](https://github.com/JVCSampaio/service-desk/blob/520888b0b6e6150b43b35c27cd4a03503ec73733/docs/ANALISE.md)
e do README do ServiceDesk.

| Requisito                     | Critério de aceite                                                                      | Cenários                                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01 Registrar demanda        | Campos inválidos não criam chamado; criação válida gera evento                          | `validacao.feature` (16), "Criação devolve o chamado completo", `registro.feature`                                                                  |
| RF02 Atribuir atendimento     | Não iniciar sem equipe nem remover a equipe em atendimento                              | "Iniciar sem equipe falha sem alterar o chamado", "Equipe não pode ser removida...", "Iniciar sem equipe mostra a regra de negócio"                 |
| RF03 Registrar solução        | Solução com 10+ caracteres; retomada preserva histórico e prazo                         | "Solução precisa de pelo menos 10 caracteres", "Retomar um chamado resolvido...", "Atender e resolver de ponta a ponta", "Solução curta é recusada" |
| RF04 Evitar sobrescrita       | Versão antiga não substitui alteração mais recente; salvar sem mudanças não cria versão | "Versão desatualizada não sobrescreve...", "Edição simultânea não sobrescreve...", "Salvar sem alterações não cria versão nem evento novo"          |
| RF05 Consultar fila           | `%` literal; filtros e páginas respeitam o limite                                       | `fila.feature` (3), "Listagem paginada", "Parâmetro de consulta inválido" (5)                                                                       |
| RF06 Exportar informações     | CSV com prazo e status, sem executar fórmula                                            | "Exportação CSV neutraliza fórmulas de planilha"                                                                                                    |
| Prazos por prioridade         | 4, 8, 24 e 48 horas corridas desde a criação                                            | "Prazo de atendimento da prioridade..." (4)                                                                                                         |
| Indicadores                   | Novos chamados entram em ativos e urgentes                                              | "Novo chamado urgente entra nos indicadores", "Indicadores da central"                                                                              |
| Histórico                     | Comentários e transições registrados em ordem, com os nomes da tela                     | "Detalhe com histórico em ordem cronológica", "Comentário entra no histórico sem mudar a versão", "Histórico usa os mesmos nomes de status da tela" |
| Defeitos corrigidos (#1 a #6) | O comportamento corrigido não volta                                                     | 6 cenários `@regressao @BUG-0X` em `fila`, `resiliencia`, `registro`, `atendimento` e `regras`                                                      |

## 8. Sessão exploratória

**Missão:** explorar a busca, os filtros, o histórico e as mensagens de erro com valores-limite,
dados especiais e falhas de rede, para encontrar comportamentos que confundam o atendente.

**Heurísticas usadas:** limites (119, 120 e 121 caracteres; texto só com espaços), caracteres
especiais (`%`, `=`, `@`, HTML), repetição (salvar sem mudar nada), concorrência (duas pessoas
no mesmo chamado) e falhas de dependência (500 e rede).

**Resultado:** seis defeitos de severidade baixa ou média, nenhum bloqueante, todos com passos,
causa provável e cenário automatizado em [BUGS.md](BUGS.md). Viraram as issues #1 a #6 do
ServiceDesk e foram corrigidos no [PR #7](https://github.com/JVCSampaio/service-desk/pull/7). Os pontos abaixo foram observados,
mas não confirmados como defeito; continuam em aberto como sugestão de melhoria.

| ID     | Observação                                                                                                                                                                                                                                         | Recomendação                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| OBS-01 | Com a digitação sintética do Cypress, buscas acima de ~50 caracteres geram o erro #185 do React ("Maximum update depth exceeded"). Digitando no teclado, no Chrome, não reproduziu. A suíte usa termos curtos e simula colagem para textos longos. | Investigar junto com a OBS-02; o debounce elimina a rajada de atualizações. |
| OBS-02 | A busca dispara duas requisições por tecla (fila e indicadores), sem debounce: digitar 40 caracteres gera 80 requisições.                                                                                                                          | Debounce de ~300 ms e indicadores fora do ciclo da busca.                   |

## 9. Execuções locais

23/10/2026, Windows 11, Chrome 155 headless, Node.js 24 e Python 3.14.

**Antes da correção** (versão `520888b`):

- `npm test`: **53 de 53 cenários passaram** (40 de API e 13 de interface).
- `npm run test:bugs`: **6 de 6 cenários `@bug` falharam** pelo motivo documentado, confirmando
  que os defeitos estavam presentes.

**Depois da correção** (PR #7): **59 de 59 cenários passaram**, incluindo os 6 que reproduziam os
defeitos, agora marcados como `@regressao`.

O resultado de cada execução no GitHub Actions fica no resumo do workflow e no relatório
Cucumber publicado no GitHub Pages.
