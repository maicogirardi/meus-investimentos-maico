# Roadmap

## Direcao desta etapa

O proximo ciclo deve transformar a base atual do projeto em um MVP operacional de carteira com a mesma fundacao visual e estrutural do `financas-app`, mas com regras proprias para leitura diaria de saldo, calculo automatico de rendimento e heranca mensal.

As proximas entregas devem priorizar:

* paridade visual com o `financas-app` em navegacao inferior, tema, cards, modais e estrutura geral
* Home como tela operacional principal
* modelagem hibrida `assets + periods + assetMonthlyStates + dailyReadings + transactions + settings`
* calculos centralizados em camada de dominio, nunca espalhados em componentes visuais
* persistencia segregada por `users/{uid}/...`
* preparacao explicita para futura importacao automatica da planilha historica

## Fase 0 - Base do projeto

* criar estrutura blank do projeto
* documentar premissas iniciais
* alinhar stack com o app de financas
* criar GitHub Pages workflow
* criar projeto Firebase, app web e Firestore

## Fase 1 - Fundacao visual e tecnica

* definir IA e wireframes com base nas telas de referencia
* desenhar modelo de dados inicial
* criar navegacao principal e shell do dashboard
* implementar primeiro fluxo de autenticacao Google com entrada para a pagina de configuracoes
* salvar preferencias iniciais (`darkMode` e `themeColor`) em `users/{uid}/configs/preferences`
* consolidar o sistema visual espelhado do `financas-app` com variacao azul-marinho para investimentos
* manter banner de atualizacao PWA e comportamento de tema sincronizados entre os dois apps
* manter as proximas paginas equivalentes em paridade visual literal com o `financas-app`
* consolidar a documentacao de produto, regras de calculo e modelo de dados

## Fase 2 - MVP operacional da carteira

### 2.1 Navegacao e shell

* implementar as 4 abas finais: Home, Resumo, Ativos e Configuracoes
* reaproveitar a navegacao inferior e o comportamento geral do `financas-app`
* manter Configuracoes como tela compartilhada, com login, logout, tema e cor

### 2.2 Camada de dados do MVP

* consolidar as colecoes `assets`, `periods`, `assetMonthlyStates`, `dailyReadings`, `transactions` e `settings`
* garantir segregacao por usuario autenticado em `users/{uid}/...`
* definir ids e relacionamentos para suportar importacao futura sem remapeamento manual
* criar consultas e listeners realtime para periodo atual, estados mensais e preferencias

### 2.3 Motor de calculo

* implementar servicos ou composables de dominio para as formulas obrigatorias
* calcular `capitalInvestido = valorInicial + soma(aportes) - soma(saquesExtras)`
* calcular rendimento liquido e bruto do dia a partir das leituras e movimentacoes do dia
* calcular rendimento acumulado liquido e bruto do ativo no mes
* calcular saldo total da carteira como soma dos saldos liquidos atuais do periodo selecionado
* preparar agregacoes mensais e anuais sem depender de digitacao manual de rendimento

### 2.4 Home

* implementar filtro de ano e mes
* implementar acao de adicionar mes
* implementar acao de excluir mes com bloqueio para o unico mes existente
* criar card principal fixo com saldo total da carteira
* criar lista de cards por ativo com foco operacional
* permitir editar saldo liquido atual e saldo bruto atual diretamente no fluxo principal
* disponibilizar acoes de registrar `contribution`, `normal_withdrawal` e `extra_withdrawal`
* permitir criar ou atualizar leitura diaria do ativo
* recalcular automaticamente totais e rendimentos apos qualquer alteracao

### 2.5 Ativos

* implementar CRUD de ativos com campos minimos `name`, `startDate` e `initialValue`
* suportar campos opcionais `institution` e `category`
* ao criar um ativo, gerar tambem o `assetMonthlyState` do mes selecionado
* manter confirmacao de exclusao e impacto consistente com o restante do app

### 2.6 Resumo

* criar a visao historica por ativo dentro do mes selecionado
* exibir leituras diarias com saldo liquido, saldo bruto, rendimento liquido e rendimento bruto
* exibir totais do mes e totais do ano por ativo
* listar aportes, saques normais e saques extras com contexto de data

## Fase 3 - Virada de mes e consistencia historica

* implementar a regra de criacao de novo mes copiando os ativos existentes
* herdar do mes anterior `capital investido final`, `saldo liquido final` e `saldo bruto final`
* iniciar o novo mes com historico diario vazio e totais mensais zerados
* recalcular a carteira inteira quando houver exclusao de mes, ativo ou transacao relevante
* adicionar confirmacoes explicitas para exclusao de mes, ativo e transacoes
* revisar regras de borda para ativos sem leitura no dia e meses sem movimentacao

## Fase 4 - Organizacao ampliada da carteira

* conectar instituicoes e contas a organizacao da carteira
* ampliar classificacao por categoria e carteira
* criar snapshots e historico patrimonial mais amplo
* ampliar filtros, totais e visao anual no Resumo
* estruturar a importacao futura da planilha historica

## Fase 5 - Evolucao do produto

* graficos, indicadores e filtros avancados
* metas, rebalanceamento e indicadores pessoais
* automacoes para importacao assistida e conciliacao de historico
* primeira rotina de publicacao funcional completa

## Proximos passos recomendados

Para o proximo ciclo de implementacao, a ordem mais segura e produtiva e:

1. finalizar a shell com as 4 abas e espelhar literalmente a estrutura visual equivalente do `financas-app`
2. implementar `periods`, `assets` e `assetMonthlyStates` com listeners do periodo ativo
3. criar o motor de calculo central para capital investido, rendimentos diarios e totais mensais
4. entregar a Home completa com leitura diaria e registro de movimentacoes
5. entregar o CRUD de Ativos com criacao automatica do estado mensal inicial
6. entregar o Resumo por ativo com listas diarias, totais do mes e totais do ano
7. finalizar a regra de virada de mes e preparar a base para importacao da planilha
