# Meus Investimentos

Aplicativo pessoal de investimentos em Vue 3 + Vite, com Firebase como base para autenticação, banco de dados e hosting principal.

## Stack

* Vue 3
* Vite
* Firebase Auth
* Firestore realtime
* GitHub Pages para build de desenvolvimento
* Firebase Hosting para testes reais de auth e PWA

## Direção atual

* app pessoal para acompanhar patrimônio, alocação e evolução dos investimentos
* base técnica alinhada ao projeto `financas-app`
* layout desktop first, com adaptação para tablet e mobile
* PWA preparado para uso no celular
* documentação viva em `docs/`

## Scripts

* `npm run dev`
* `npm run build`
* `npm run preview`
* `npm run deploy`
* `npm run build:firebase`
* `npm run deploy:firebase`

## Ambientes

* repositório GitHub planejado: `meus-investimentos-maico`
* GitHub Pages planejado: `https://maicogirardi.github.io/meus-investimentos-maico/`
* Firebase Hosting confirmado: `https://meus-investimentos-maico.web.app`

## Configuração local

1. O `.env` local já foi preenchido neste workspace com o app web criado no Firebase
2. Em novos ambientes, copie `.env.example` para `.env` e preencha as chaves
3. Instale dependências com `npm install`
4. Rode `npm run dev`

## Documentação

* [AGENTS.md](./AGENTS.md)
* [docs/product-plan.md](./docs/product-plan.md)
* [docs/architecture.md](./docs/architecture.md)
* [docs/firebase.md](./docs/firebase.md)
* [docs/publishing.md](./docs/publishing.md)
* [docs/roadmap.md](./docs/roadmap.md)
