# Firebase

## Objetivo

Usar Firebase como base para autenticacao privada, banco de dados e hosting principal.

## Estado atual

* projeto Firebase criado com ID `meus-investimentos-maico`
* app web criado com ID `1:137709460544:web:34157b78d38b448be693a5`
* host confirmado em `https://meus-investimentos-maico.web.app`
* Firestore default criado em `southamerica-east1`
* arquivos `firebase.json` e `.firebaserc` criados
* `.env.example` criado para referencia e `.env` local ja preenchido neste workspace
* `src/services/firebase.js` inicializa somente com variaveis de ambiente, sem fallback hardcoded

## Configuracoes ativas

* projeto Firebase: `meus-investimentos-maico`
* app web: `investimentos-web`
* app id: `1:137709460544:web:34157b78d38b448be693a5`
* auth domain: `meus-investimentos-maico.firebaseapp.com`
* storage bucket: `meus-investimentos-maico.firebasestorage.app`
* firestore region: `southamerica-east1`
* host principal: `https://meus-investimentos-maico.web.app`
* organizacao de documentos por usuario: `users/{uid}/...`
* preferencias atuais em `users/{uid}/configs/preferences`

## Estrutura sugerida

As colecoes de dominio devem ficar agrupadas por usuario para suportar multiplos logins com isolamento claro.

Com a integracao da nova documentacao, o app passa a trabalhar com dois niveis:

* colecoes canonicas de dominio, alinhadas a direcao do projeto;
* entidades operacionais mensais/diarias, necessarias para o fluxo de investimentos.

### Colecoes canonicas do projeto

* `users/{uid}/configs`
* `users/{uid}/institutions`
* `users/{uid}/accounts`
* `users/{uid}/assets`
* `users/{uid}/holdings`
* `users/{uid}/transactions`
* `users/{uid}/snapshots`
* `users/{uid}/userPreferences` somente se surgir uma necessidade separada de `configs`

### Entidades operacionais que precisam ser suportadas

* periodos mensais
* estados mensais do ativo
* leituras diarias
* transacoes por tipo

Na implementacao, isso pode evoluir de duas formas:

1. colecoes dedicadas como descrito em `data_model.md`;
2. especializacao de `holdings` e `snapshots` para representar esses estados.

Ate a definicao final da primeira feature de investimentos, `data_model.md` passa a ser a referencia recomendada para a modelagem detalhada.

## Estrutura recomendada para a V1 de investimentos

Se formos seguir a modelagem detalhada dos novos documentos, a estrutura recomendada e:

* `users/{uid}/assets`
* `users/{uid}/periods`
* `users/{uid}/assetMonthlyStates`
* `users/{uid}/dailyReadings`
* `users/{uid}/transactions`
* `users/{uid}/settings`

As colecoes `institutions` e `accounts` continuam previstas como extensao natural da organizacao da carteira e podem entrar ja na V1 ou logo em seguida, conforme a ordem de implementacao escolhida.

## Proximos passos

1. habilitar ao menos um provider no Authentication
2. fazer o primeiro deploy de regras e indices do Firestore
3. fechar a estrutura inicial entre `data_model.md` e as colecoes canonicas do projeto
4. ligar as primeiras features reais ao backend
5. endurecer regras por escopo de usuario conforme a modelagem final

## Observacao

O endereco `https://meus-investimentos-maico.web.app` ja foi confirmado via CLI durante o bootstrap deste projeto.

## Authentication

O Firebase CLI atual foi suficiente para criar projeto, app web e Firestore, mas a ativacao de providers de login continua mais confiavel pelo console do Firebase. Para esta fase, a recomendacao e:

1. abrir `Authentication > Sign-in method`
2. habilitar `Google`
3. adicionar `meus-investimentos-maico.firebaseapp.com` e `meus-investimentos-maico.web.app` nos dominios autorizados se necessario

## Seguranca de chaves

* Nao manter credenciais do Firebase em codigo-fonte versionado, mesmo para valores client-side.
* Em caso de exposicao identificada em commit historico, rotacionar a chave no Google Cloud Console e revogar a versao antiga.
* Confirmar que os ambientes de build local, CI e hosting injetam as variaveis `VITE_FIREBASE_*` antes do deploy.
