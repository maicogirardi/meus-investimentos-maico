# Product Plan

## Objetivo

Criar um app pessoal de investimentos com a mesma disciplina de stack, docs e publicação do `financas-app`, mas orientado a patrimônio, alocação e evolução dos ativos.

## Premissas já definidas

* base técnica em Vue + Vite + Firebase
* uso pessoal, com autenticação privada
* desktop first, mas responsivo para tablet e mobile
* PWA para uso no celular
* GitHub Pages para desenvolvimento e Firebase Hosting como ambiente principal de testes reais

## Escopo inicial

* dashboard de patrimônio consolidado
* visão por instituição e conta
* cadastro de ativos e movimentações
* snapshots de patrimônio para histórico
* preferências do usuário no Firebase

## Referências de consistência

* reaproveitar padrões do `financas-app` em scripts, publicação, convenções e organização de documentação
* incorporar aprendizados do `maico-codex-starter-kit` assim que o conteúdo dele estiver disponível no workspace ou acessível pelo conector

## Estado de bootstrap

* projeto local iniciado em Git
* app blank criado e buildando com sucesso
* projeto Firebase criado com ID `meus-investimentos-maico`
* app web do Firebase criado e conectado ao `.env` local
* host principal confirmado em `https://meus-investimentos-maico.web.app`

## Decisões pendentes

* quais classes de ativo entram na V1
* se a rentabilidade será calculada internamente desde a V1 ou em etapa posterior
* quais dashboards e gráficos entram antes do primeiro publish funcional
