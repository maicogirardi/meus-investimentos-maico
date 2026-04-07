# Architecture

## Base atual

* `src/App.vue` como shell visual do projeto
* `src/views/ConfiguracoesView.vue` e `src/components/navigation/BottomTabs.vue` espelhando a estrutura-base do `financas-app`
* `src/config/appConfig.js` para metadados e checkpoints iniciais
* `src/services/firebase.js` para bootstrap do Firebase
* `src/styles/variables.css`, `src/styles/theme.css` e `src/style.css` para o sistema visual compartilhado entre apps
* `public/manifest.webmanifest` e `public/sw.js` para base PWA com banner de atualizacao
* `scripts/build-firebase.ps1` e `scripts/deploy-firebase.ps1` seguindo o mesmo conceito do `financas-app`

## Direcao arquitetural

* frontend SPA em Vue 3
* build com Vite
* auth e banco em Firebase
* listeners realtime para dados vivos e sincronizacao de preferencias e visoes operacionais
* deploy duplo: GitHub Pages para desenvolvimento e Firebase Hosting para ambiente principal

## Fluxo inicial implementado

* login com Google via Firebase Auth
* pagina de configuracoes como primeira tela autenticada
* preferencias de tema (`darkMode` e `themeColor`) persistidas em Firestore no caminho `users/{uid}/configs/preferences`
* sincronizacao realtime das preferencias por `onSnapshot`
* logout pelo card de conta
* inicializacao somente com variaveis `VITE_FIREBASE_*`, sem fallback hardcoded
* mesma base de tipografia, espacamento, glass surfaces, botoes, navegacao inferior e popup de atualizacao usada no `financas-app`
* identidade visual ajustada para fundo azul-marinho no lugar do preto dominante do projeto de financas
* telas que tenham equivalente no `financas-app` devem ser reproduzidas literalmente antes de qualquer customizacao adicional

## Arquitetura funcional agora consolidada

Os documentos novos fecharam o modelo funcional do app em duas camadas:

### Camada 1: cadastro e organizacao

Responsavel por estruturar a carteira:

* instituicoes
* contas
* ativos
* preferencias do usuario

### Camada 2: operacao e historico

Responsavel por capturar a evolucao patrimonial:

* estados mensais do ativo
* leituras diarias
* transacoes por tipo
* snapshots consolidados

Essa divisao permite tela operacional rapida na Home e historico detalhado no Resumo sem forcar recalculo completo a cada interacao.

## Modelo operacional adotado

O app passa a assumir uma modelagem hibrida mensal/diaria:

* uma camada mensal para heranca de estado, totais e carregamento rapido;
* uma camada diaria para leitura de saldo liquido e bruto e calculo de rendimento;
* uma camada de transacoes para compensar movimentacoes no calculo do dia.

Em termos de documentacao:

* `business_rules.md` define a matematica do produto;
* `data_model.md` define as entidades recomendadas;
* `firebase.md` descreve como isso deve ser distribuido em `users/{uid}/...`.

## Modulos previstos

* `src/modules/dashboard`
* `src/modules/summary`
* `src/modules/institutions`
* `src/modules/accounts`
* `src/modules/assets`
* `src/modules/transactions`
* `src/modules/snapshots`
* `src/modules/settings`

## Responsabilidades esperadas dos modulos

* `dashboard`: Home operacional, filtro de periodo, total da carteira e cards por ativo.
* `summary`: visao analitica de leituras, totais mensais/anuais e historico por ativo.
* `institutions` e `accounts`: organizacao estrutural da carteira.
* `assets`: cadastro mestre e metadados do ativo.
* `transactions`: aportes, saques normais e saques extras.
* `snapshots`: leituras diarias e consolidacoes patrimoniais.
* `settings`: preferencias visuais, sessao e ajustes do usuario.

## Diretrizes de implementacao

* Toda feature nova deve nascer preparada para dados por usuario autenticado.
* Sempre que fizer sentido para a experiencia principal, priorizar `onSnapshot` e atualizacao em tempo real.
* A Home deve consumir estado consolidado, nao reconstruir historico completo no cliente.
* Regras de calculo nao devem ficar dispersas em componentes visuais; precisam ficar encapsuladas em servicos ou composables de dominio.
* A futura importacao de planilha deve conseguir criar periodos, estados mensais, transacoes e leituras sem quebrar o modelo atual.

## Observacoes

* a modelagem final das colecoes deve permanecer centrada em `users/{uid}/...`
* antes de criar novos fluxos, devemos procurar no `financas-app` componentes, estilos e interacoes equivalentes para reaproveitar o padrao
* para paginas equivalentes, o padrao e copiar layout, textos, espacamentos e hierarquia visual do `financas-app`, alterando apenas conteudo especifico de investimentos e o tema de fundo
