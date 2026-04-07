# Prompt para o Codex

Use o app de finanças já existente como base visual e estrutural para construir o app **Meus Investimentos**. O objetivo é criar um app pessoal para acompanhamento de carteira de investimentos com atualização diária baseada no saldo exibido no app do banco.

## Estrutura de navegação

O app deve ter 4 abas:

1. Home
2. Resumo
3. Ativos
4. Configurações

A navegação inferior, tema, estilo dos cards, modais e comportamento geral devem reaproveitar o máximo possível do app de finanças anterior.

---

## Regra central do produto

O usuário **não vai informar rendimento manualmente**.

O usuário vai atualizar diariamente, em cada ativo:

- saldo líquido atual;
- saldo bruto atual.

O sistema deve calcular automaticamente:

- rendimento líquido do dia;
- rendimento bruto do dia;
- rendimento acumulado do mês;
- rendimento acumulado do ano;
- saldo total da carteira.

Além disso, o sistema deve registrar movimentações separadas por tipo:

- aporte
- saque normal
- saque extra

### Significado dos tipos

**Aporte**
- aumenta o capital investido.

**Saque normal**
- é uma retirada do rendimento;
- não reduz o capital investido.

**Saque extra**
- é uma retirada estrutural ou de principal;
- reduz o capital investido.

---

## Fórmulas obrigatórias

### Capital investido

`capitalInvestido = valorInicial + soma(aportes) - soma(saquesExtras)`

### Rendimento líquido do dia

`rendimentoLiquidoDia = saldoLiquidoAtual - saldoLiquidoAnterior - aportesDoDia + saquesNormaisDoDia + saquesExtrasDoDia`

### Rendimento bruto do dia

`rendimentoBrutoDia = saldoBrutoAtual - saldoBrutoAnterior - aportesDoDia + saquesNormaisDoDia + saquesExtrasDoDia`

### Rendimento líquido acumulado

`rendimentoLiquidoAcumulado = saldoLiquidoAtual - capitalInvestidoAtual`

### Rendimento bruto acumulado

`rendimentoBrutoAcumulado = saldoBrutoAtual - capitalInvestidoAtual`

### Saldo total da carteira

`saldoTotalCarteira = soma(saldoLiquidoAtual de todos os ativos no mês selecionado)`

---

## Modelagem recomendada

Implementar uma modelagem híbrida com:

- `assets`
- `periods`
- `assetMonthlyStates`
- `dailyReadings`
- `transactions`
- `settings`

### transactions.type

Valores válidos:

- `contribution`
- `normal_withdrawal`
- `extra_withdrawal`

---

## Regra de criação de novo mês

Ao criar um novo mês:

- copiar os ativos existentes;
- herdar do mês anterior:
	- capital investido final
	- saldo líquido final
	- saldo bruto final
- iniciar os totais do novo mês em zero;
- iniciar o histórico diário vazio.

---

## Tela Home

A Home é a tela principal operacional.

### Deve conter

- filtro de ano e mês;
- botão adicionar mês;
- botão excluir mês;
- card principal fixo no topo com saldo total da carteira;
- lista de cards por ativo.

### Card de ativo

Cada card deve mostrar:

- nome do ativo;
- saldo líquido atual editável;
- saldo bruto atual editável;
- rendimento líquido do dia;
- rendimento bruto do dia;
- capital investido atual;
- total de aportes do mês;
- total de saques normais do mês;
- total de saques extras do mês;
- ações para:
	- registrar aporte
	- registrar saque normal
	- registrar saque extra
	- editar leitura do dia

### Comportamento

Quando o usuário salvar saldo líquido e bruto do dia:

- criar ou atualizar a leitura diária;
- recalcular rendimento líquido e bruto do dia;
- recalcular totais mensais;
- atualizar o saldo total da carteira.

---

## Tela Resumo

Deve permitir visualizar o histórico de cada ativo.

### Exibir por ativo

- lista diária de leituras do mês;
- saldo líquido por dia;
- saldo bruto por dia;
- rendimento líquido por dia;
- rendimento bruto por dia;
- totais do mês;
- totais do ano;
- lista de aportes;
- lista de saques normais;
- lista de saques extras.

---

## Tela Ativos

CRUD de ativos.

### Criar ativo

Campos mínimos:

- nome
- data do investimento
- valor inicial

Campos opcionais:

- instituição
- categoria

### Ao criar ativo

Criar também o `assetMonthlyState` do mês selecionado com base no valor inicial.

---

## Configurações

Reaproveitar a tela já pronta:

- light/dark mode
- cor do tema
- login/logout

---

## Persistência

Segregar tudo por usuário autenticado.

Estrutura sugerida:

- `users/{userId}/assets`
- `users/{userId}/periods`
- `users/{userId}/assetMonthlyStates`
- `users/{userId}/dailyReadings`
- `users/{userId}/transactions`
- `users/{userId}/settings`

---

## Regras de UX

- usar BRL em todos os valores;
- exibir datas em formato brasileiro;
- confirmar exclusão de mês, ativo e transações;
- não permitir excluir o único mês existente;
- recalcular tudo automaticamente após qualquer alteração;
- manter visual coerente com o app de finanças já existente.

---

## Observação importante

Este app precisa nascer preparado para uma futura importação automática da planilha já existente. Portanto, a modelagem deve suportar criação automática de períodos, estados mensais e transações históricas.

