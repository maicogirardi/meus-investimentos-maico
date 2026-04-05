# Architecture

## Base atual

Estrutura inicial criada com:

* `src/App.vue` como shell visual do projeto
* `src/config/appConfig.js` para metadados e checkpoints iniciais
* `src/services/firebase.js` para bootstrap condicional do Firebase
* `public/manifest.webmanifest` e `public/sw.js` para base PWA
* `scripts/build-firebase.ps1` e `scripts/deploy-firebase.ps1` seguindo o mesmo conceito do `financas-app`

## Direção arquitetural

* frontend SPA em Vue 3
* build com Vite
* auth e banco em Firebase
* listeners realtime para dados vivos
* deploy duplo: GitHub Pages para desenvolvimento e Firebase Hosting para ambiente principal

## Módulos previstos

* `src/modules/dashboard`
* `src/modules/institutions`
* `src/modules/accounts`
* `src/modules/assets`
* `src/modules/transactions`
* `src/modules/snapshots`
* `src/modules/settings`

## Observações

* a modelagem final das coleções ainda será refinada quando definirmos as telas e regras de negócio
* o projeto começou blank de propósito para evoluir a interface com base nas referências visuais do usuário

