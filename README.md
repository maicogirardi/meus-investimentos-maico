# Meus Investimentos

Aplicativo pessoal de investimentos em Vue 3 + Vite, com Firebase como base para autenticacao, banco de dados e hosting principal.

## Stack

* Vue 3
* Vite
* Firebase Auth
* Firestore realtime
* GitHub Pages com GitHub Actions
* Firebase Hosting para testes reais de auth e PWA

## Direcao atual

* app pessoal para acompanhar patrimonio, alocacao e evolucao dos investimentos
* base tecnica alinhada ao projeto `financas-app`
* layout desktop first, com adaptacao para tablet e mobile
* PWA preparado para uso no celular
* documentacao viva em `docs/`

## Fluxo inicial implementado

* login com Google para acesso privado
* primeira interacao autenticada em tela de Configuracoes
* preferencias iniciais (`darkMode` e `themeColor`) salvas em `users/{uid}/configs/preferences`
* listener realtime para atualizar tema em tempo real
* acao de logout no card de conta
* inicializacao do Firebase exclusivamente por variaveis `VITE_FIREBASE_*` em `.env`
* base visual alinhada ao `financas-app`, com mesmo sistema de tema, navegacao inferior e banner de atualizacao do PWA
* paginas equivalentes devem copiar literalmente a estrutura visual do `financas-app`, mudando apenas o necessario para o dominio de investimentos e para a paleta azul-marinho

## Regra funcional central

O usuario nao informa rendimento manualmente. O fluxo do produto passa a ser:

* registrar saldo liquido atual e saldo bruto atual por ativo
* registrar aportes, saques normais e saques extras separadamente
* deixar o app calcular automaticamente rendimento diario, acumulados e saldo consolidado da carteira

As definicoes detalhadas ficam em `docs/product.md`, `docs/business_rules.md` e `docs/data_model.md`.

## Scripts

* `npm run dev`
* `npm run build`
* `npm run preview`
* `npm run deploy`
* `npm run build:firebase`
* `npm run deploy:firebase`

## Bases de build

* `npm run build` gera a build do GitHub Pages com base `/meus-investimentos-maico/`
* `npm run build:firebase` gera a build do Firebase Hosting com base `/`
* `npm run deploy:firebase` usa essa build do Firebase antes de publicar

## Ambientes

* repositorio GitHub planejado: `meus-investimentos-maico`
* GitHub Pages planejado: `https://maicogirardi.github.io/meus-investimentos-maico/`
* Firebase Hosting confirmado: `https://meus-investimentos-maico.web.app`

## Configuracao local

1. O `.env` local ja foi preenchido neste workspace com o app web criado no Firebase
2. Em novos ambientes, copie `.env.example` para `.env` e preencha todas as chaves obrigatorias do app web no Firebase
3. Instale dependencias com `npm install`
4. Rode `npm run dev`

## Firebase atual

* projeto criado: `meus-investimentos-maico`
* app web criado: `investimentos-web`
* Firestore criado em `southamerica-east1`
* regras e indices do Firestore versionados no repositorio

## GitHub Pages

* workflow criado em `.github/workflows/deploy-pages.yml`
* a publicacao acontece automaticamente a cada push no branch `main`
* o repositorio precisa usar `Settings > Pages > Source: GitHub Actions`

## Documentacao

* [AGENTS.md](./AGENTS.md)
* [docs/README.md](./docs/README.md)
* [docs/product.md](./docs/product.md)
* [docs/business_rules.md](./docs/business_rules.md)
* [docs/data_model.md](./docs/data_model.md)
* [docs/product-plan.md](./docs/product-plan.md)
* [docs/architecture.md](./docs/architecture.md)
* [docs/firebase.md](./docs/firebase.md)
* [docs/publishing.md](./docs/publishing.md)
* [docs/roadmap.md](./docs/roadmap.md)
* [docs/theme.md](./docs/theme.md)
