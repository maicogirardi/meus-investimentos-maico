# Roadmap

## Fase 0

* criar estrutura blank do projeto
* documentar premissas iniciais
* alinhar stack com o app de finanças
* criar GitHub Pages workflow
* criar projeto Firebase, app web e Firestore

## Fase 1

* definir IA e wireframes com base nas telas de referência
* desenhar modelo de dados inicial
* criar navegação principal e shell do dashboard
* implementar primeiro fluxo de autenticação Google com entrada para a página de configurações
* salvar preferências iniciais (`darkMode` e `themeColor`) em `users/{uid}/configs/preferences`
* consolidar o sistema visual espelhado do `financas-app` com variação azul-marinho para investimentos
* manter banner de atualização PWA e comportamento de tema sincronizados entre os dois apps
* manter as próximas páginas equivalentes em paridade visual literal com o `financas-app`

## Fase 2

* conectar Firebase Auth e Firestore
* implementar CRUD base de instituições, contas e ativos dentro de `users/{uid}/...`
* criar snapshots e histórico patrimonial

## Fase 3

* gráficos, indicadores e filtros
* preferências do usuário e personalização
* primeira rotina de publicação completa
