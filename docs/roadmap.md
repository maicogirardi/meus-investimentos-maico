# Roadmap

## Fase 0

* criar estrutura blank do projeto
* documentar premissas iniciais
* alinhar stack com o app de financas
* criar GitHub Pages workflow
* criar projeto Firebase, app web e Firestore

## Fase 1

* definir IA e wireframes com base nas telas de referencia
* desenhar modelo de dados inicial
* criar navegacao principal e shell do dashboard
* implementar primeiro fluxo de autenticacao Google com entrada para a pagina de configuracoes
* salvar preferencias iniciais (`darkMode` e `themeColor`) em `users/{uid}/configs/preferences`
* consolidar o sistema visual espelhado do `financas-app` com variacao azul-marinho para investimentos
* manter banner de atualizacao PWA e comportamento de tema sincronizados entre os dois apps
* manter as proximas paginas equivalentes em paridade visual literal com o `financas-app`
* consolidar a documentacao de produto, regras de calculo e modelo de dados

## Fase 2

* implementar navegacao principal com Home, Resumo, Ativos e Configuracoes
* implementar CRUD base de ativos e classificacao inicial
* criar a camada de periodos mensais
* criar a persistencia de leituras diarias por ativo
* implementar transacoes com tipos `contribution`, `normal_withdrawal` e `extra_withdrawal`
* consolidar estados mensais e calculos automaticos da Home

## Fase 3

* conectar instituicoes e contas a organizacao da carteira
* criar snapshots e historico patrimonial mais amplo
* ampliar filtros, totais e visao anual no Resumo
* estruturar a importacao futura da planilha historica

## Fase 4

* graficos, indicadores e filtros avancados
* metas, rebalanceamento e indicadores pessoais
* primeira rotina de publicacao funcional completa
