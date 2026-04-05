# Firebase

## Objetivo

Usar Firebase como base para autenticação privada, banco de dados e hosting principal.

## Estado atual

* projeto Firebase criado com ID `meus-investimentos-maico`
* app web criado com ID `1:137709460544:web:34157b78d38b448be693a5`
* host confirmado em `https://meus-investimentos-maico.web.app`
* arquivos `firebase.json` e `.firebaserc` criados
* `.env.example` criado para referência e `.env` local já preenchido neste workspace
* `src/services/firebase.js` pronto para inicializar somente quando as variáveis estiverem preenchidas

## Configurações ativas

* projeto Firebase: `meus-investimentos-maico`
* app web: `investimentos-web`
* app id: `1:137709460544:web:34157b78d38b448be693a5`
* auth domain: `meus-investimentos-maico.firebaseapp.com`
* storage bucket: `meus-investimentos-maico.firebasestorage.app`
* host principal: `https://meus-investimentos-maico.web.app`

## Próximos passos

1. habilitar Authentication
2. criar Firestore Database
3. definir regras e coleções iniciais
4. fazer o primeiro deploy para validar hosting + SPA fallback
5. ligar as primeiras features reais ao backend

## Observação

O endereço `https://meus-investimentos-maico.web.app` já foi confirmado via CLI durante o bootstrap deste projeto.
