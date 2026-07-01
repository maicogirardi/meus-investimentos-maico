# Meus Investimentos

Aplicativo pessoal de investimentos em Vue 3 + Vite, com Firebase Auth, Firestore e Firebase Hosting como ambiente principal.

## Estado Atual

Hoje o projeto já tem:

* shell principal com as abas `Home`, `Resumo`, `Ativos` e `Configurações`
* login e logout com Google
* preferências do usuário em `users/{uid}/configs/preferences`
* listeners realtime para preferências, ativos, estados mensais, transações e leituras diárias
* regras do Firestore isolando cada usuário no próprio namespace e validando os documentos principais do app
* cadastro, edição e exclusão de ativos
* ações de `Atualizar`, `Corrigir rendimento bruto`, `Aporte`, `Saque` e `Saque extra` por ativo na Home
* a atualização aceita rendimento bruto zerado enquanto o banco não fecha a competência; a correção substitui apenas o bruto de um período existente, sem alterar saldo ou rendimento líquido
* importador da planilha REAL para o CDB Itaú 100% CDI
* importação de rendimentos mensais, saques mensais e movimentações confirmadas da planilha
* resumo com saldo anual, rendimentos, saques e movimentações paginadas
* tabela `Movimentações de Investimento` mostrando apenas criação do ativo, aportes e saques extras
* base visual e PWA alinhadas ao `financas-app`

## Regras Financeiras Atuais

As regras atuais seguem a aba `REAL` da planilha de investimentos:

* `Total investido` representa o capital aplicado: valor inicial + aportes - saques extras
* `Saldo atual no banco` representa o saldo bancário atual do ativo
* saques mensais entram no histórico de `Saques`, mas não aparecem na tabela `Movimentações de Investimento`
* no `Saldo anual`, a coluna de saldo líquido representa o ganho líquido do ano descontando saques mensais, sem misturar aportes e saques extras
* o rendimento líquido diário mostra a primeira leitura do período quando só existe uma entrada; quando houver nova leitura no mesmo período, passa a mostrar a diferença contra a leitura anterior desse período

## Stack

* Vue 3
* Vite
* Firebase Auth
* Firestore
* GitHub Pages
* Firebase Hosting

## Scripts

* `npm run dev`
* `npm run build`
* `npm run preview`
* `npm run deploy`
* `npm run build:firebase`
* `npm run deploy:firebase`

## Ambientes

* Firebase Hosting: `https://meus-investimentos-maico.web.app`
* GitHub Pages: `https://maicogirardi.github.io/meus-investimentos-maico/`

## Segurança do Firestore

As regras publicadas para desenvolvimento seguro seguem o mesmo princípio do `financas-app`:

* somente usuários autenticados acessam dados
* cada usuário acessa apenas `users/{uid}` do próprio login
* `configs/preferences`, `periods`, `assets`, `assetMonthlyStates`, `transactions` e `dailyReadings` aceitam apenas os campos esperados pelo app
* valores sensíveis como datas, cores, tipos de transação e números obrigatórios são validados nas regras

## Configuração Local

1. Copie `.env.example` para `.env` se precisar montar um novo ambiente.
2. Preencha todas as variáveis `VITE_FIREBASE_*`.
3. Rode `npm install`.
4. Rode `npm run dev`.

## Publicação

O fluxo padrão de publicação é:

1. `npm run build`
2. commit e push para `main`
3. `npm run deploy` para GitHub Pages
4. `npm run build:firebase`
5. `npx firebase-tools deploy --only hosting`
6. `npx firebase-tools deploy --only firestore:rules` quando `firestore.rules` mudar

## Documentação

* [AGENTS.md](./AGENTS.md)
* [docs/product.md](./docs/product.md)

`docs/product.md` é a fonte principal de verdade do projeto. Ele concentra produto, implementação atual, arquitetura prática, fluxo de publicação e regras financeiras em uso.
