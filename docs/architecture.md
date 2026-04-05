# Architecture

## Base atual

Estrutura inicial criada com:

* `src/App.vue` como shell visual do projeto
* `src/views/ConfiguracoesView.vue` e `src/components/navigation/BottomTabs.vue` espelhando a estrutura-base do `financas-app`
* `src/config/appConfig.js` para metadados e checkpoints iniciais
* `src/services/firebase.js` para bootstrap do Firebase
* `src/styles/variables.css`, `src/styles/theme.css` e `src/style.css` para o sistema visual compartilhado entre apps
* `public/manifest.webmanifest` e `public/sw.js` para base PWA com banner de atualização
* `scripts/build-firebase.ps1` e `scripts/deploy-firebase.ps1` seguindo o mesmo conceito do `financas-app`

## Direção arquitetural

* frontend SPA em Vue 3
* build com Vite
* auth e banco em Firebase
* listeners realtime para dados vivos
* deploy duplo: GitHub Pages para desenvolvimento e Firebase Hosting para ambiente principal

## Fluxo inicial implementado

* login com Google via Firebase Auth
* página de configurações como primeira tela autenticada
* preferências de tema (`darkMode` e `themeColor`) persistidas em Firestore no caminho `users/{uid}/configs/preferences`
* sincronização realtime das preferências por `onSnapshot`
* logout pelo card de conta
* inicialização somente com variáveis `VITE_FIREBASE_*`, sem fallback hardcoded
* mesma base de tipografia, espaçamento, glass surfaces, botões, navegação inferior e popup de atualização usada no `financas-app`
* identidade visual ajustada para fundo azul-marinho no lugar do preto dominante do projeto de finanças
* telas que tenham equivalente no `financas-app` devem ser reproduzidas literalmente antes de qualquer customização adicional

## Módulos previstos

* `src/modules/dashboard`
* `src/modules/institutions`
* `src/modules/accounts`
* `src/modules/assets`
* `src/modules/transactions`
* `src/modules/snapshots`
* `src/modules/settings`

## Observações

* a modelagem final das coleções deve permanecer centrada em `users/{uid}/...`
* antes de criar novos fluxos, devemos procurar no `financas-app` componentes, estilos e interações equivalentes para reaproveitar o padrão
* para páginas equivalentes, o padrão é copiar layout, textos, espaçamentos e hierarquia visual do `financas-app`, alterando apenas conteúdo específico de investimentos e o tema de fundo
