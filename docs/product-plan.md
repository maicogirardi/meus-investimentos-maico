# Product Plan

## Objetivo

Criar um app pessoal de investimentos com a mesma disciplina de stack, docs e publicacao do `financas-app`, mas orientado a patrimonio, alocacao e evolucao dos ativos.

O produto agora passa a assumir explicitamente um fluxo operacional baseado em:

* leitura diaria de saldo liquido e saldo bruto por ativo;
* registro separado de aporte, saque normal e saque extra;
* calculo automatico de rendimento diario, mensal, anual e saldo consolidado da carteira.

## Premissas ja definidas

* base tecnica em Vue + Vite + Firebase
* uso pessoal, com autenticacao privada
* desktop first, mas responsivo para tablet e mobile
* PWA para uso no celular
* GitHub Pages para desenvolvimento e Firebase Hosting como ambiente principal de testes reais
* alinhamento visual e estrutural com o `financas-app` sempre que houver tela equivalente

## Decisoes consolidadas

* Home, Resumo, Ativos e Configuracoes formam a navegacao principal.
* O usuario nao informa rendimento manualmente.
* `business_rules.md` passa a ser a referencia principal de calculo.
* `data_model.md` passa a ser a referencia principal da modelagem de investimento.
* O app deve nascer pronto para futura importacao da planilha historica.
* O dominio principal continua centrado em patrimonio, instituicao, conta, ativo, movimentacao e snapshots.

## Escopo inicial

* dashboard de patrimonio consolidado com leitura rapida do saldo total
* cadastro de ativos e organizacao por instituicao, conta e categoria
* captura de leituras diarias por ativo
* registro de aportes, saques normais e saques extras
* consolidacao mensal e historico analitico por ativo
* preferencias do usuario no Firebase

## Referencias de consistencia

* reaproveitar padroes do `financas-app` em scripts, publicacao, convencoes e organizacao de documentacao
* incorporar aprendizados do `maico-codex-starter-kit` assim que o conteudo dele estiver disponivel no workspace ou acessivel pelo conector

## Estado de bootstrap

* projeto local iniciado em Git
* app blank criado e buildando com sucesso
* projeto Firebase criado com ID `meus-investimentos-maico`
* app web do Firebase criado e conectado ao `.env` local
* host principal confirmado em `https://meus-investimentos-maico.web.app`

## Documentos-chave

* `product.md` para comportamento e estrutura de telas
* `business_rules.md` para formulas e validacoes
* `data_model.md` para entidades e regras de persistencia
* `architecture.md` para encaixe tecnico no app

## Decisoes ainda abertas

* quais classes de ativo entram na V1
* qual recorte de dashboards analiticos entra antes do primeiro publish funcional
* quando introduzir importacao semiautomatica da planilha historica
