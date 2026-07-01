# Fonte de Verdade do Projeto

Este arquivo concentra:

* objetivo do produto
* implementação real do projeto
* arquitetura prática
* regras financeiras atuais
* fluxo de publicação
* divergências conhecidas entre a visão desejada e o que o código entrega hoje

Se houver conflito entre documentação antiga e este arquivo, este arquivo deve ser considerado a referência principal.

## 1. Objetivo do Produto

O app existe para acompanhar patrimônio, alocação e evolução dos investimentos de forma manual, com base nos valores vistos no app do banco e em planilhas auxiliares.

Direção consolidada:

* stack alinhada ao `financas-app`
* Vue 3 + Vite + Firebase
* autenticação privada com Google
* Firestore como banco principal
* Firebase Hosting como ambiente principal de teste real
* GitHub Pages como ambiente secundário
* layout desktop first com boa adaptação para tablet e mobile
* PWA viável para uso no celular
* ações destrutivas e também botões de cancelar, fechar ou voltar devem usar visual `danger`

## 2. O Que Já Está Implementado

### Shell do App

O projeto possui navegação principal com quatro abas:

* `Home`
* `Resumo`
* `Ativos`
* `Configurações`

A base visual, o tema, a navegação inferior, o service worker e o banner de atualização seguem o mesmo raciocínio do `financas-app`.

O fluxo de instalação do PWA fica dentro de `Configurações`, com orientação textual e botão próprio quando o navegador expõe `beforeinstallprompt`.

O pacote PWA inclui ícones PNG dedicados para instalação em navegadores mobile e suporte a ícone maskable.

### Autenticação e Preferências

Funciona hoje:

* login com Google
* logout
* persistência de preferências em `users/{uid}/configs/preferences`
* sincronização realtime das preferências
* persistência de tema e cor principal

Campos usados hoje em `users/{uid}/configs/preferences`:

* `darkMode`
* `themeColor`

Observação: o filtro global de mês da Home foi removido. A Home e o Resumo agora trabalham com a leitura mais recente de cada ativo, sem depender de um período selecionado no topo.

### Ativos

Funciona hoje:

* listener realtime de ativos
* cadastro de ativo com `name`, `institution`, `category`, `startDate`, `color` e `initialValue`
* edição de ativo
* exclusão de ativo com remoção em cascata de documentos relacionados por `assetId`
* criação automática de `assetMonthlyStates/{assetId}__{periodId}` ao cadastrar o ativo

Campos usados no estado mensal:

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

### Home

A Home hoje:

* mostra o card hero `Saldo total` com a soma do saldo atual no banco dos ativos visíveis
* lista os ativos em cards operacionais
* mostra `Total investido`, `Rendimento`, `Saldo atual no banco` e `Rendimento líquido diário`
* permite registrar `Atualizar`, `Corrigir rendimento bruto`, `Aporte`, `Saque` e `Saque extra`
* aceita rendimento bruto zerado na leitura atual e permite corrigir somente o bruto de uma competência existente, sem gerar rendimento líquido nem alterar o saldo atual
* grava leituras em `dailyReadings`
* grava aportes, saques normais e saques extras em `transactions`
* atualiza `assetMonthlyStates` após cada ação

Regras da Home:

* `Total investido` usa `currentCapitalInvested`
* `Saldo atual no banco` usa `currentLiquidBalance`
* `Rendimento` usa `monthNetIncome`
* `Rendimento líquido diário` usa a leitura do próprio período:
	* se só existe uma leitura no período, mostra o valor inserido
	* se houver nova leitura no mesmo período, mostra a diferença entre a leitura anterior e a atual
	* não compara mais contra o mês anterior

### Resumo

O Resumo hoje:

* consome `assets`, `assetMonthlyStates`, `transactions` e `dailyReadings` em realtime
* possui filtro por ativo com pills no cabeçalho
* mostra saldo total superior com a soma do saldo atual no banco dos ativos filtrados
* mostra `Saldo anual`
* lista `Rendimento líquido`, `Rendimento bruto`, `Saques` e `Movimentações de Investimento`
* usa paginação de 5 itens em rendimentos, saques e movimentações
* mantém ordenação por coluna na tabela de movimentações

Regras do Resumo:

* `Saldo total` superior usa o último `currentLiquidBalance` de cada ativo filtrado
* `Saldo anual > Saldo total` usa o último saldo bancário conhecido de cada ano
* `Saldo anual > Saldo líquido` representa o ganho líquido do ano descontando saques mensais, sem misturar aportes e saques extras
* `Aporte` e `Saques Extras` aparecem em colunas próprias
* `Saques` lista transações `withdrawal`, incluindo saques mensais importados
* `Movimentações de Investimento` lista apenas criação do ativo, aportes e saques extras
* saques mensais não aparecem em `Movimentações de Investimento`

### Configurações

Configurações hoje:

* controla tema, cor do tema, login e logout
* expõe a instalação PWA quando disponível
* contém o importador da planilha REAL para o ativo `CDB Itaú 100% CDI`

## 3. Importação da Planilha REAL

O app possui um importador específico para a planilha de investimentos usada como referência manual.

Planilhas usadas na implementação recente:

* planilha original com fórmulas: aba `REAL`
* planilha auxiliar de importação mensal: valores de 12/2023 até 06/2026

O importador atual:

* localiza o ativo `CDB Itaú 100% CDI`
* limpa e reimporta rendimentos da planilha
* limpa e reimporta saques mensais importados
* preserva o ativo
* preserva aportes e saques extras manuais/confirmados
* grava rendimentos em `assetMonthlyStates` e `dailyReadings`
* grava saques mensais em `transactions` com `type: "withdrawal"` e motivo `Saque mensal`

Valores de referência confirmados na aba `REAL`:

* `Investimentos`: `R$ 342.000,00`
* `Rendimento`: `R$ 47.349,33`
* `TOTAL`: `R$ 389.349,33`

Saldo anual de referência na aba `REAL`:

* `dezembro 2023`: `R$ 387.568,03`
* `janeiro 2024`: `R$ 391.314,66`
* `janeiro 2025`: `R$ 421.203,79`
* `janeiro 2026`: `R$ 388.445,43`
* `janeiro 2027`: `R$ 389.349,33`

Fórmula conceitual do ganho anual líquido na planilha:

* 2024: `Saldo 2024 - Saldo 2023`
* 2025: `Saldo 2025 - Saldo 2024 - Aporte 2024`
* 2026: `Saldo 2026 - Saldo 2025 + Saque extra 2025`
* 2027: `Saldo 2027 - Saldo 2026 - Aporte 2026`

No app, essa lógica foi traduzida para a regra de produto:

* o saldo líquido anual deve mostrar o que foi ganho no ano descontando saques mensais
* aportes e saques extras ficam separados nas suas próprias colunas
* saques mensais são histórico de saque, não movimentação de investimento

## 4. Modelo de Dados

Coleções usadas pelo código atual:

* `users/{uid}/configs/preferences`
* `users/{uid}/periods/{periodId}`
* `users/{uid}/assets/{assetId}`
* `users/{uid}/assetMonthlyStates/{assetId}__{periodId}`
* `users/{uid}/dailyReadings`
* `users/{uid}/transactions`

### `transactions`

Tipos usados:

* `contribution`: aporte
* `withdrawal`: saque normal ou saque mensal
* `extraWithdrawal`: saque extra que reduz capital investido

Campos principais:

* `assetId`
* `periodId`
* `type`
* `amount`
* `note`
* `transactionDate`
* `source`
* `createdAt`
* `updatedAt`

### `dailyReadings`

Campos principais:

* `assetId`
* `periodId`
* `liquidIncome`
* `grossIncome`
* `liquidBalance`
* `grossBalance`
* `readingDate`
* `source`
* `createdAt`
* `updatedAt`

### Regras de Segurança no Firestore

As regras publicadas seguem o padrão do `financas-app`:

* acesso liberado apenas para usuário autenticado
* isolamento estrito por `uid` dentro de `users/{uid}`
* validação dos schemas usados em `configs/preferences`, `periods`, `assets`, `assetMonthlyStates`, `transactions` e `dailyReadings`
* bloqueio implícito de coleções e campos que o app não usa hoje

## 5. Mapa Técnico do App

Arquivos principais:

* `src/App.vue`: shell principal, auth, listeners, seleção de aba, importação e integração das views
* `src/views/HomeView.vue`: Home operacional, cards por ativo e modais de ações
* `src/views/ResumoView.vue`: resumo analítico, saldo anual, rendimentos, saques e movimentações de investimento
* `src/views/AtivosView.vue`: CRUD visual de ativos
* `src/views/ConfiguracoesView.vue`: preferências, sessão, PWA e importação da planilha
* `src/services/firebase.js`: bootstrap do Firebase via `VITE_FIREBASE_*`
* `src/services/periods.js`: IDs, listener e criação de períodos
* `src/services/assets.js`: listeners de ativos, estados mensais, transações e leituras
* `src/services/homeActions.js`: grava leituras e transações originadas na Home e atualiza `assetMonthlyStates`
* `src/services/investmentSheetImport.js`: importação dos dados da planilha REAL
* `public/sw.js`: cache básico do app shell e ativação de nova versão do PWA
* `src/main.js`: registro versionado do service worker por build
* `.github/workflows/deploy-pages.yml`: deploy automático do GitHub Pages

## 6. Publicação e Ambientes

Scripts atuais:

* `npm run build`: build para GitHub Pages
* `npm run deploy`: fallback manual com `gh-pages`
* `npm run build:firebase`: build para Firebase Hosting
* `npm run deploy:firebase`: script de deploy para Firebase Hosting

Ambientes:

* Firebase Hosting: `https://meus-investimentos-maico.web.app`
* GitHub Pages: `https://maicogirardi.github.io/meus-investimentos-maico/`

Firebase atual:

* projeto: `meus-investimentos-maico`
* app web: `investimentos-web`
* Firestore default em `southamerica-east1`
* `firestore.rules` deve ser publicado junto sempre que houver mudança de schema ou liberação de nova coleção no cliente

Fluxo manual usado para publicar:

1. `npm run build`
2. `git add -A`
3. `git commit -m "..."`
4. `git push origin main`
5. `npm run deploy`
6. `npm run build:firebase`
7. `npx firebase-tools deploy --only hosting`
8. `npx firebase-tools deploy --only firestore:rules` quando `firestore.rules` mudar

## 7. Divergências Conhecidas Para Ajustar Depois

1. O importador ainda é específico para o ativo `CDB Itaú 100% CDI` e para os valores conhecidos da planilha atual.
2. A regra de rendimento diário está preparada para múltiplas leituras no mesmo período, mas ainda precisa ser validada com uma nova entrada diária real.
3. A tabela `Saques` lista os saques mensais, mas ainda pode precisar de filtros próprios quando houver mais ativos e mais tipos de saque.
4. O app ainda não tem backend dedicado para recompor toda a linha do tempo automaticamente quando dados antigos forem alterados diretamente no Firestore.
5. Coleções de organização ampla como `institutions`, `accounts`, `holdings` e `snapshots` continuam planejadas, mas ainda fora da implementação real.

## 8. Regra de Manutenção da Documentação

Ao evoluir o app:

* atualizar primeiro este arquivo se a implementação mudar comportamento, dados ou publicação
* evitar recriar documentos separados para roadmap, Firebase, tema ou cálculos enquanto este arquivo continuar claro
* se um novo arquivo voltar a ser necessário, ele deve existir para complementar este documento, nunca para repetir seu conteúdo
