# Fonte de Verdade do Projeto

Este arquivo substitui a malha anterior de documentos. A partir de agora ele concentra:

* objetivo do produto
* implementacao real do projeto
* arquitetura pratica
* fluxo de publicacao
* divergencias conhecidas entre a visao desejada e o que o codigo entrega hoje

Se houver conflito entre documentacao antiga, este arquivo deve ser considerado a referencia principal.

## 1. Objetivo do produto

O app existe para acompanhar patrimonio, alocacao e evolucao dos investimentos de forma manual, com base nos valores vistos no app do banco.

Direcao consolidada:

* stack alinhada ao `financas-app`
* Vue 3 + Vite + Firebase
* autenticacao privada com Google
* Firestore como banco principal
* Firebase Hosting como ambiente principal de teste real
* GitHub Pages como ambiente secundario
* layout desktop first com boa adaptacao para tablet e mobile
* PWA viavel para uso no celular
* acoes destrutivas e tambem botoes de cancelar, fechar ou voltar devem usar visual `danger`

## 2. O que ja esta implementado

### Shell do app

O projeto ja possui navegacao principal com quatro abas:

* `Home`
* `Resumo`
* `Ativos`
* `Configuracoes`

A base visual, o tema, a navegacao inferior, o service worker e o banner de atualizacao seguem o mesmo raciocinio do `financas-app`.

O pacote PWA agora inclui icones PNG dedicados para instalacao em navegadores mobile e suporte a icone maskable.

### Autenticacao e preferencias

Ja funciona hoje:

* login com Google
* logout
* persistencia de preferencias em `users/{uid}/configs/preferences`
* sincronizacao realtime das preferencias
* persistencia do periodo selecionado pelo usuario

Campos usados hoje em `users/{uid}/configs/preferences`:

* `darkMode`
* `themeColor`
* `selectedYear`
* `selectedMonth`

### Periodos

Ja funciona hoje:

* listener realtime de periodos
* criacao manual de periodo
* exclusao manual de periodo
* criacao automatica de um periodo padrao quando o usuario ainda nao tem nenhum

Observacao importante:

* o periodo padrao esta hardcoded como abril de 2026 no codigo atual

### Ativos

Ja funciona hoje:

* listener realtime de ativos
* cadastro de ativo com `name`, `institution`, `category`, `startDate`, `color` e `initialValue`
* exclusao de ativo com remocao em cascata de documentos relacionados por `assetId`
* criacao automatica de `assetMonthlyStates/{assetId}__{periodId}` ao cadastrar o ativo

Campos criados hoje no estado mensal inicial:

* `assetId`
* `periodId`
* `openingCapitalInvested`
* `currentCapitalInvested`
* `openingLiquidBalance`
* `currentLiquidBalance`
* `openingGrossBalance`
* `currentGrossBalance`
* `monthNetIncome`
* `monthGrossIncome`
* `monthContributions`
* `monthNormalWithdrawals`
* `monthExtraWithdrawals`
* `lastReadingDate`

### Estado real das telas

`Home` hoje:

* permite selecionar ano e mes
* permite criar e excluir periodo
* ja mostra um card-resumo fixo da carteira no topo
* ja lista os ativos em cards operacionais com visual alinhado ao app de financas
* ja possui modais de atualizacao, aporte, saque e saque extra por ativo
* ja grava leituras diarias em `dailyReadings`
* ja grava aportes, saques normais e saques extras em `transactions`
* ja recalcula o estado mensal local do ativo apos cada acao da Home
* ainda nao recalcula o saldo total consolidado da carteira no card superior

`Resumo` hoje:

* consome `assets` e `assetMonthlyStates` em realtime
* saldo anual ja pode ser filtrado por ativo com pills no cabecalho
* rendimento liquido, rendimento bruto e saques ja mostram o nome e a cor de cada ativo
* movimentacoes ja consomem `transactions` filtradas por ativo
* tabela de movimentacoes ja possui ordenacao por ativo, periodo, tipo, motivo e valor
* tabela de movimentacoes ja possui paginacao de 5 itens por pagina
* coluna `Tipo` ja diferencia `Aporte`, `Saque` e `Saque Extra`
* durante esta fase existe massa fake temporaria na view apenas para validar layout e paginacao
* continua limitado aos dados que ja existem em `assetMonthlyStates`

`Ativos` hoje:

* ja esta funcional para cadastro, edicao e exclusao
* lista nome, valor inicial, instituicao, categoria, data inicial e cor do ativo

`Configuracoes` hoje:

* ja esta funcional para tema, cor do tema, login e logout

## 3. Escopo funcional desejado

O fluxo-alvo do produto continua este:

* o usuario informa saldo liquido atual e saldo bruto atual por ativo
* o usuario registra aportes, saques normais e saques extras separadamente
* o app calcula automaticamente rendimento diario, acumulados e saldo consolidado

Regras principais ainda validas para a fase de implementacao:

* `capitalInvestido = valorInicial + soma(aportes) - soma(saquesExtras)`
* `rendimentoLiquidoDia = saldoLiquidoAtual - saldoLiquidoAnterior - aportesDoDia + saquesNormaisDoDia + saquesExtrasDoDia`
* `rendimentoBrutoDia = saldoBrutoAtual - saldoBrutoAnterior - aportesDoDia + saquesNormaisDoDia + saquesExtrasDoDia`

Escopo-alvo por tela:

`Home`

* saldo total da carteira no periodo selecionado
* cards por ativo
* leitura diaria de saldo liquido e bruto
* acoes de aporte, saque normal e saque extra
* recalculo automatico apos qualquer alteracao

`Resumo`

* historico diario por ativo
* totais do mes e do ano
* lista de transacoes por tipo
* paginacao e refinamentos finais da experiencia da tabela de movimentacoes

`Ativos`

* continuar como cadastro
* manter edicao no mesmo fluxo modal quando necessario

`Configuracoes`

* manter login, logout e preferencias visuais

## 4. Modelo de dados

### Estrutura em uso hoje

Colecoes realmente usadas pelo codigo atual:

* `users/{uid}/configs/preferences`
* `users/{uid}/periods/{periodId}`
* `users/{uid}/assets/{assetId}`
* `users/{uid}/assetMonthlyStates/{assetId}__{periodId}`

Colecoes que o codigo ja considera e agora tambem pode popular:

* `users/{uid}/dailyReadings`
* `users/{uid}/transactions`

### Estrutura planejada

Para o MVP completo, a estrutura mais coerente continua sendo:

* `users/{uid}/assets`
* `users/{uid}/periods`
* `users/{uid}/assetMonthlyStates`
* `users/{uid}/dailyReadings`
* `users/{uid}/transactions`

Colecoes de organizacao mais ampla continuam previstas, mas ainda fora da implementacao real:

* `users/{uid}/institutions`
* `users/{uid}/accounts`
* `users/{uid}/holdings`
* `users/{uid}/snapshots`

## 5. Mapa tecnico do app

Arquivos principais hoje:

* `src/App.vue`: shell principal, auth, listeners, selecao de aba e modais de periodo
* `src/views/HomeView.vue`: filtro de periodo, resumo visual e cards operacionais iniciais da Home
* `src/views/ResumoView.vue`: resumo analitico com filtro anual por ativo, leitura do estado mensal e tabela paginada de movimentacoes
* `src/views/AtivosView.vue`: CRUD visual de ativos
* `src/views/ConfiguracoesView.vue`: preferencias e sessao
* `src/services/firebase.js`: bootstrap do Firebase via `VITE_FIREBASE_*`
* `src/services/periods.js`: IDs, listener e criacao de periodos
* `src/services/assets.js`: listeners de ativos e estados mensais, criacao de ativo com estado mensal e exclusao em cascata
* `src/services/homeActions.js`: grava leituras e transacoes originadas na Home e atualiza `assetMonthlyStates`
* `public/sw.js`: cache basico do app shell e ativacao de nova versao do PWA
* `src/main.js`: registro versionado do service worker por build para exibir o banner de atualizacao como no `financas-app`
* `.github/workflows/deploy-pages.yml`: deploy automatico do GitHub Pages

## 6. Publicacao e ambientes

Scripts atuais:

* `npm run build`: build para GitHub Pages
* `npm run deploy`: fallback manual com `gh-pages`
* `npm run build:firebase`: build para Firebase Hosting
* `npm run deploy:firebase`: script de deploy para Firebase Hosting

Ambientes:

* GitHub Pages: `https://maicogirardi.github.io/meus-investimentos-maico/`
* Firebase Hosting: `https://meus-investimentos-maico.web.app`

Firebase atual:

* projeto: `meus-investimentos-maico`
* app web: `investimentos-web`
* Firestore default em `southamerica-east1`

## 7. Divergencias conhecidas para ajustar depois

Estas sao as principais divergencias entre a documentacao antiga e o codigo atual:

1. A documentacao antiga descrevia `Home`, `Resumo`, leituras diarias, transacoes e calculos como se estivessem implementados. Isso ainda nao esta pronto.
2. O app real hoje usa principalmente `preferences`, `periods`, `assets` e `assetMonthlyStates`, mas a Home ja tambem pode gravar em `dailyReadings` e `transactions`.
3. Depois do login, o app abre `Home`. Alguns documentos antigos diziam que a primeira tela autenticada era `Configuracoes`.
4. A exclusao de periodo hoje remove apenas o documento do periodo. Ela ainda nao bloqueia a exclusao do unico periodo existente, nao faz cascata e nao protege a consistencia historica.
5. O total da carteira mostrado na `Home` ainda nao esta amarrado ao estado mensal recalculado, entao o dashboard patrimonial superior ainda nao reflete o Firestore em tempo real.
6. A gravacao da Home atualiza o estado mensal do periodo selecionado e, se ele nao existir, cria um snapshot inicial com base no ultimo estado conhecido do ativo.
7. A regra de virada de mes com heranca automatica do estado final do mes anterior ainda nao existe como rotina de backend dedicada.
8. O periodo padrao inicial esta fixo em abril de 2026, o que e util para bootstrap, mas nao e uma regra de produto definitiva.
9. A tabela de movimentacoes do `Resumo` ainda usa massa fake temporaria para validar paginacao, coluna `Tipo` e comportamento responsivo antes da remocao final desses dados de teste.

## 8. Regra de manutencao da documentacao

Ao evoluir o app:

* atualizar primeiro este arquivo se a implementacao mudar comportamento, dados ou publicacao
* evitar recriar documentos separados para roadmap, Firebase, tema ou calculos enquanto este arquivo continuar claro
* se um novo arquivo voltar a ser necessario, ele deve existir para complementar este documento, nunca para repetir seu conteudo
