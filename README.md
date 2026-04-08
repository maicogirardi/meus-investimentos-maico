# Meus Investimentos

Aplicativo pessoal de investimentos em Vue 3 + Vite, com Firebase Auth, Firestore e Firebase Hosting como base principal.

## Estado atual

Hoje o projeto já tem:

* shell principal com as abas `Home`, `Resumo`, `Ativos` e `Configurações`
* login e logout com Google
* preferências do usuário em `users/{uid}/configs/preferences`
* listeners realtime para preferências, períodos e ativos
* criação e exclusão de períodos
* cadastro e exclusão de ativos
* criação automática de `assetMonthlyStates` ao cadastrar um ativo
* base visual e PWA alinhadas ao `financas-app`

O motor completo de investimentos ainda não está pronto. `Home` e `Resumo` continuam em estado parcial, sem cálculos, leituras diárias e transações funcionando de ponta a ponta.

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

* GitHub Pages: `https://maicogirardi.github.io/meus-investimentos-maico/`
* Firebase Hosting: `https://meus-investimentos-maico.web.app`

## Configuração local

1. Copie `.env.example` para `.env` se precisar montar um novo ambiente.
2. Preencha todas as variáveis `VITE_FIREBASE_*`.
3. Rode `npm install`.
4. Rode `npm run dev`.

## Documentação

* [AGENTS.md](./AGENTS.md)
* [docs/product.md](./docs/product.md)

`docs/product.md` agora é a fonte principal de verdade do projeto. Ele concentra produto, implementação atual, arquitetura prática, fluxo de publicação e divergências conhecidas entre a visão desejada e o que já existe no código.
