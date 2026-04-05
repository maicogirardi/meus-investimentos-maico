# Firebase

## Objetivo

Usar Firebase como base para autenticação privada, banco de dados e hosting principal.

## Estado atual

* projeto Firebase criado com ID `meus-investimentos-maico`
* app web criado com ID `1:137709460544:web:34157b78d38b448be693a5`
* host confirmado em `https://meus-investimentos-maico.web.app`
* Firestore default criado em `southamerica-east1`
* arquivos `firebase.json` e `.firebaserc` criados
* `.env.example` criado para referência e `.env` local já preenchido neste workspace
* `src/services/firebase.js` inicializa somente com variáveis de ambiente, sem fallback hardcoded

## Configurações ativas

* projeto Firebase: `meus-investimentos-maico`
* app web: `investimentos-web`
* app id: `1:137709460544:web:34157b78d38b448be693a5`
* auth domain: `meus-investimentos-maico.firebaseapp.com`
* storage bucket: `meus-investimentos-maico.firebasestorage.app`
* firestore region: `southamerica-east1`
* host principal: `https://meus-investimentos-maico.web.app`
* organização de documentos por usuário: `users/{uid}/...`
* preferências atuais em `users/{uid}/configs/preferences`

## Estrutura sugerida

As coleções de domínio devem ficar agrupadas por usuário para suportar múltiplos logins com isolamento claro:

* `users/{uid}/configs`
* `users/{uid}/institutions`
* `users/{uid}/accounts`
* `users/{uid}/assets`
* `users/{uid}/holdings`
* `users/{uid}/transactions`
* `users/{uid}/snapshots`
* `users/{uid}/userPreferences` somente se surgir uma necessidade separada de `configs`

## Próximos passos

1. habilitar ao menos um provider no Authentication
2. fazer o primeiro deploy de regras e índices do Firestore
3. definir coleções iniciais dentro de `users/{uid}/...`
4. ligar as primeiras features reais ao backend
5. endurecer regras por escopo de usuário conforme a modelagem final

## Observação

O endereço `https://meus-investimentos-maico.web.app` já foi confirmado via CLI durante o bootstrap deste projeto.

## Authentication

O Firebase CLI atual foi suficiente para criar projeto, app web e Firestore, mas a ativação de providers de login continua mais confiável pelo console do Firebase. Para esta fase, a recomendação é:

1. abrir `Authentication > Sign-in method`
2. habilitar `Google`
3. adicionar `meus-investimentos-maico.firebaseapp.com` e `meus-investimentos-maico.web.app` nos domínios autorizados se necessário

## Segurança de chaves

* Não manter credenciais do Firebase em código-fonte versionado, mesmo para valores client-side.
* Em caso de exposição identificada em commit histórico, rotacionar a chave no Google Cloud Console e revogar a versão antiga.
* Confirmar que os ambientes de build local, CI e hosting injetam as variáveis `VITE_FIREBASE_*` antes do deploy.
