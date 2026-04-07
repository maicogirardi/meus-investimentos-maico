# App de Investimentos — Visão de Produto

## Objetivo

Aplicativo pessoal para acompanhamento manual da carteira de investimentos, com atualização **diária** a partir dos valores exibidos no app do banco.

O foco do produto é permitir que o usuário alimente rapidamente:

- saldo líquido atual do ativo;
- saldo bruto atual do ativo;
- aportes;
- saques normais;
- saques extras.

A partir disso, o app calcula automaticamente:

- rendimento líquido do dia;
- rendimento bruto do dia;
- rendimento acumulado do mês;
- rendimento acumulado do ano;
- saldo total da carteira.

---

## Princípio central do app

O usuário **não vai digitar o rendimento manualmente mês a mês**.

Em vez disso, o usuário vai informar diariamente o que vê no banco:

- valor total líquido atual;
- valor total bruto atual.

O app então compara esse valor com o último valor salvo e calcula quanto o ativo rendeu no dia.

---

## Conceito financeiro usado no app

O app separa o que é:

- **capital investido**
- **rendimento**
- **movimentação de principal**
- **movimentação de rendimento**

Essa separação é importante porque hoje você usa uma planilha em que parte dos saques reduz o rendimento, enquanto outro tipo de saque reduz o principal. Essa lógica é boa e vale a pena manter no app.

### 1. Capital investido

É o valor base do ativo, formado por:

- valor inicial
- mais aportes
- menos saques extras

**Fórmula:**

`capitalInvestido = valorInicial + aportesAcumulados - saquesExtrasAcumulados`

### 2. Saque normal

É uma retirada feita do rendimento do ativo.

Exemplos:

- retirada mensal de lucro;
- retirada pequena de rendimento para uso pessoal.

Esse saque **não reduz o capital investido**.

### 3. Saque extra

É uma retirada maior, tratada como saída de principal ou mudança estrutural da carteira.

Exemplos:

- compra de outro ativo;
- compra de imóvel;
- retirada grande do montante principal.

Esse saque **reduz o capital investido**.

---

## Melhor ajuste de regra para o seu uso

Pelo seu uso atual, a modelagem mais adequada é:

- o usuário alimenta diariamente apenas:
	- saldo líquido atual;
	- saldo bruto atual;
- o app registra separadamente:
	- aporte;
	- saque normal;
	- saque extra;
- o app calcula o rendimento do dia com base na diferença entre o valor atual e o anterior, compensando movimentações.

Isso é melhor do que digitar manualmente “rendimento do dia” porque:

- reduz erro manual;
- acompanha melhor o app do banco;
- mantém histórico consistente;
- separa rentabilidade real de movimentação financeira.

---

## Estrutura das telas

## 1. Home

Tela principal e operacional do app.

### Elementos

- filtro de ano e mês;
- botão de adicionar mês;
- botão de excluir mês;
- card principal com saldo total da carteira;
- lista de cards dos ativos.

### Card de ativo

Cada card deve mostrar:

- nome do ativo;
- saldo líquido atual;
- saldo bruto atual;
- rendimento líquido do dia;
- rendimento bruto do dia;
- capital investido;
- total de aportes do mês;
- total de saques normais do mês;
- total de saques extras do mês;
- botão de aporte;
- botão de saque normal;
- botão de saque extra;
- botão de editar leitura diária.

### Comportamento esperado

No dia a dia, o fluxo ideal da Home é:

1. selecionar o mês;
2. abrir o card do ativo;
3. digitar saldo líquido atual;
4. digitar saldo bruto atual;
5. salvar;
6. o app recalcula automaticamente os rendimentos.

---

## 2. Resumo

Tela analítica do ativo.

Deve exibir por ativo:

- lista diária de saldo líquido;
- lista diária de saldo bruto;
- rendimento líquido diário;
- rendimento bruto diário;
- totais do mês;
- totais do ano;
- lista de aportes;
- lista de saques normais;
- lista de saques extras.

---

## 3. Ativos

Tela de cadastro.

Campos mínimos:

- nome do ativo;
- data do investimento;
- valor inicial.

Campos opcionais:

- instituição;
- categoria;
- observações.

---

## 4. Configurações

Já existente no app base.

Itens:

- light/dark mode;
- cor do tema;
- login/logout.

---

## Unidade principal do app

O app vai funcionar em cima de duas camadas:

### Camada 1 — Período mensal

Usada para:

- filtro de mês/ano;
- totais mensais;
- herança de valores para o mês seguinte.

### Camada 2 — Leituras diárias

Usada para:

- registrar saldo líquido e bruto do dia;
- calcular rendimento diário;
- construir o histórico do mês.

Essa combinação resolve o seu uso real.

---

## Regra para virada de mês

Quando um novo mês for criado:

- o mês novo recebe os valores finais do mês anterior;
- o capital investido é herdado;
- a última leitura líquida vira ponto de partida do novo mês;
- a última leitura bruta vira ponto de partida do novo mês;
- o histórico diário do novo mês começa vazio;
- o usuário volta a alimentar dia a dia.

---

## Importação futura

Posteriormente, o app deve permitir importar automaticamente os meses já existentes da planilha.

Idealmente, a importação deve criar:

- períodos;
- snapshots mensais;
- leituras diárias, se existirem;
- aportes;
- saques normais;
- saques extras.

Esse item fica fora do MVP, mas a modelagem já deve nascer preparada para isso.

