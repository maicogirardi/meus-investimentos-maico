# Fonte de Verdade do Projeto

Este arquivo substitui a malha anterior de documentos. A partir de agora ele concentra:

* objetivo do produto
* implementação real do projeto
* arquitetura prática
* fluxo de publicação
* divergências conhecidas entre a visão desejada e o que o código entrega hoje

Se houver conflito entre documentação antiga, este arquivo deve ser considerado a referência principal.

## 1. Objetivo do produto

O app existe para acompanhar patrimônio, alocação e evolução dos investimentos de forma manual, com base nos valores vistos no app do banco.

Direção consolidada:

* stack alinhada ao `financas-app`
* Vue 3 + Vite + Firebase
* autenticação privada com Google
* Firestore como banco principal
* Firebase Hosting como ambiente principal de teste real
* GitHub Pages como ambiente secundário
* layout desktop first com boa adaptação para tablet e mobile
* PWA viável para uso no celular

## 2. O que já está implementado

### Shell do app

O projeto já possui navegação principal com quatro abas:

* `Home`
* `Resumo`
* `Ativos`
* `Configurações`

A base visual, o tema, a navegação inferior, o service worker e o banner de atualização seguem o mesmo raciocínio do `financas-app`.

### Autenticação e preferências

Já funciona hoje:

* login com Google
* logout
* persistência de preferências em `users/{uid}/configs/preferences`
* sincronização realtime das preferências
* persistência do período selecionado pelo usuário

Campos usados hoje em `users/{uid}/configs/preferences`:

* `darkMode`
* `themeColor`
* `selectedYear`
* `selectedMonth`

### Períodos

Já funciona hoje:

* listener realtime de períodos
* criação manual de período
* exclusão manual de período
* criação automática de um período padrão quando o usuário ainda não tem nenhum

Observação importante:

* o período padrão está hardcoded como abril de 2026 no código atual

### Ativos

Já funciona hoje:

* listener realtime de ativos
* cadastro de ativo com `name`, `institution`, `category`, `startDate` e `initialValue`
* exclusão de ativo com remoção em cascata de documentos relacionados por `assetId`
* criação automática de `assetMonthlyStates/{assetId}__{periodId}` ao cadastrar o ativo

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

* permite selecionar ano e mês
* permite criar e excluir período
* mostra apenas um card-resumo ainda estático
* ainda não lista ativos nem calcula saldo total da carteira

`Resumo` hoje:

* continua como placeholder

`Ativos` hoje:

* já está funcional para cadastro e exclusão
* lista nome, valor inicial, instituição, categoria e data inicial

`Configurações` hoje:

* já está funcional para tema, cor do tema, login e logout

## 3. Escopo funcional desejado

O fluxo-alvo do produto continua este:

* o usuário informa saldo líquido atual e saldo bruto atual por ativo
* o usuário registra aportes, saques normais e saques extras separadamente
* o app calcula automaticamente rendimento diário, acumulados e saldo consolidado

Regras principais ainda válidas para a fase de implementação:

* `capitalInvestido = valorInicial + soma(aportes) - soma(saquesExtras)`
* `rendimentoLiquidoDia = saldoLiquidoAtual - saldoLiquidoAnterior - aportesDoDia + saquesNormaisDoDia + saquesExtrasDoDia`
* `rendimentoBrutoDia = saldoBrutoAtual - saldoBrutoAnterior - aportesDoDia + saquesNormaisDoDia + saquesExtrasDoDia`

Escopo-alvo por tela:

`Home`

* saldo total da carteira no período selecionado
* cards por ativo
* leitura diária de saldo líquido e bruto
* ações de aporte, saque normal e saque extra
* recálculo automático após qualquer alteração

`Resumo`

* histórico diário por ativo
* totais do mês e do ano
* lista de transações por tipo

`Ativos`

* continuar como cadastro mestre
* evoluir para edição quando necessário

`Configurações`

* manter login, logout e preferências visuais

## 4. Modelo de dados

### Estrutura em uso hoje

Coleções realmente usadas pelo código atual:

* `users/{uid}/configs/preferences`
* `users/{uid}/periods/{periodId}`
* `users/{uid}/assets/{assetId}`
* `users/{uid}/assetMonthlyStates/{assetId}__{periodId}`

Coleções que o código já considera em alguns fluxos, mas ainda não popula:

* `users/{uid}/dailyReadings`
* `users/{uid}/transactions`

### Estrutura planejada

Para o MVP completo, a estrutura mais coerente continua sendo:

* `users/{uid}/assets`
* `users/{uid}/periods`
* `users/{uid}/assetMonthlyStates`
* `users/{uid}/dailyReadings`
* `users/{uid}/transactions`

Coleções de organização mais ampla continuam previstas, mas ainda fora da implementação real:

* `users/{uid}/institutions`
* `users/{uid}/accounts`
* `users/{uid}/holdings`
* `users/{uid}/snapshots`

## 5. Mapa técnico do app

Arquivos principais hoje:

* `src/App.vue`: shell principal, auth, listeners, seleção de aba e modais de período
* `src/views/HomeView.vue`: filtro de período e card principal ainda parcial
* `src/views/ResumoView.vue`: placeholder
* `src/views/AtivosView.vue`: CRUD visual de ativos
* `src/views/ConfiguracoesView.vue`: preferências e sessão
* `src/services/firebase.js`: bootstrap do Firebase via `VITE_FIREBASE_*`
* `src/services/periods.js`: IDs, listener e criação de períodos
* `src/services/assets.js`: listener, criação de ativo com estado mensal e exclusão em cascata
* `public/sw.js`: cache básico e fluxo de atualização do PWA
* `.github/workflows/deploy-pages.yml`: deploy automático do GitHub Pages

## 6. Publicação e ambientes

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

## 7. Divergências conhecidas para ajustar depois

Estas são as principais divergências entre a documentação antiga e o código atual:

1. A documentação antiga descrevia `Home`, `Resumo`, leituras diárias, transações e cálculos como se estivessem implementados. Isso ainda não está pronto.
2. O app real hoje usa apenas `preferences`, `periods`, `assets` e `assetMonthlyStates`. As coleções `institutions`, `accounts`, `holdings`, `snapshots`, `dailyReadings` e `transactions` ainda não fazem parte do fluxo completo.
3. Depois do login, o app abre `Home`. Alguns documentos antigos diziam que a primeira tela autenticada era `Configurações`.
4. A exclusão de período hoje remove apenas o documento do período. Ela ainda não bloqueia a exclusão do único período existente, não faz cascata e não protege a consistência histórica.
5. O total da carteira mostrado na `Home` ainda é estático em `0`, então o dashboard patrimonial ainda não consome `assetMonthlyStates`.
6. A regra de virada de mês com herança do estado final do mês anterior ainda não existe no backend nem no frontend.
7. O período padrão inicial está fixo em abril de 2026, o que é útil para bootstrap, mas não é uma regra de produto definitiva.

## 8. Regra de manutenção da documentação

Ao evoluir o app:

* atualizar primeiro este arquivo se a implementação mudar comportamento, dados ou publicação
* evitar recriar documentos separados para roadmap, Firebase, tema ou cálculos enquanto este arquivo continuar claro
* se um novo arquivo voltar a ser necessário, ele deve existir para complementar este documento, nunca para repetir seu conteúdo
