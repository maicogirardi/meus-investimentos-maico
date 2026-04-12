# Meus Investimentos

Aplicativo pessoal de investimentos em Vue 3 + Vite, com Firebase Auth, Firestore e Firebase Hosting como base principal.

## Estado atual

Hoje o projeto ja tem:

* shell principal com as abas `Home`, `Resumo`, `Ativos` e `Configuracoes`
* login e logout com Google
* preferencias do usuario em `users/{uid}/configs/preferences`
* listeners realtime para preferencias, periodos e ativos
* criacao e exclusao de periodos
* cadastro e exclusao de ativos
* criacao automatica de `assetMonthlyStates` ao cadastrar um ativo
* tabela de movimentacoes no `Resumo` com ordenacao por coluna, coluna `Tipo` e paginacao de 5 itens por pagina
* base visual e PWA alinhadas ao `financas-app`

O motor completo de investimentos ainda nao esta pronto. `Home` e `Resumo` continuam em estado parcial, sem calculos, leituras diarias e transacoes funcionando de ponta a ponta.

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

## Configuracao local

1. Copie `.env.example` para `.env` se precisar montar um novo ambiente.
2. Preencha todas as variaveis `VITE_FIREBASE_*`.
3. Rode `npm install`.
4. Rode `npm run dev`.

## Documentacao

* [AGENTS.md](./AGENTS.md)
* [docs/product.md](./docs/product.md)

`docs/product.md` agora e a fonte principal de verdade do projeto. Ele concentra produto, implementacao atual, arquitetura pratica, fluxo de publicacao e divergencias conhecidas entre a visao desejada e o que ja existe no codigo.
