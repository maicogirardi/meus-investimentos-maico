# Regras de Negócio e de Cálculo

## 1. Premissas principais

Este app será alimentado diariamente com os valores vistos no app do banco.

O usuário vai informar, por ativo:

- saldo líquido atual;
- saldo bruto atual.

Movimentações do ativo serão registradas separadamente como:

- aporte;
- saque normal;
- saque extra.

---

## 2. Conceitos financeiros internos

## 2.1 Capital investido

Representa o principal efetivamente alocado no ativo.

**Fórmula acumulada:**

`capitalInvestido = valorInicial + soma(aportes) - soma(saquesExtras)`

### Regra

- aporte aumenta o capital investido;
- saque extra reduz o capital investido;
- saque normal não altera o capital investido.

---

## 2.2 Saque normal

Retirada feita a partir do rendimento.

### Regra

- não reduz o capital investido;
- reduz o saldo atual do ativo;
- deve ser considerado na conta do rendimento diário para não gerar falsa perda.

---

## 2.3 Saque extra

Retirada estrutural ou de principal.

### Regra

- reduz o capital investido;
- reduz o saldo atual do ativo;
- também deve ser neutralizado na conta do rendimento diário, para não parecer perda de mercado.

---

## 3. Leituras diárias

Cada leitura diária deve salvar:

- data;
- saldo líquido atual;
- saldo bruto atual;
- referência ao ativo;
- referência ao mês.

Essa leitura é o dado principal do cálculo diário.

---

## 4. Cálculo do rendimento líquido do dia

O rendimento líquido do dia deve ser calculado comparando a leitura atual com a leitura anterior e compensando movimentações do dia.

### Fórmula

`rendimentoLiquidoDia = saldoLiquidoAtual - saldoLiquidoAnterior - aportesDoDia + saquesNormaisDoDia + saquesExtrasDoDia`

### Motivo

- aporte entra no saldo, mas não é rendimento;
- saque normal sai do saldo, mas não é perda;
- saque extra sai do saldo, mas também não é perda de performance.

### Exemplo 1 — sem movimentação

- saldo líquido anterior = 10.000
- saldo líquido atual = 10.120
- aportes = 0
- saques normais = 0
- saques extras = 0

`rendimentoLiquidoDia = 10.120 - 10.000 = 120`

### Exemplo 2 — com aporte

- saldo líquido anterior = 10.000
- saldo líquido atual = 11.100
- aporte do dia = 1.000
- saques = 0

`rendimentoLiquidoDia = 11.100 - 10.000 - 1.000 = 100`

### Exemplo 3 — com saque normal

- saldo líquido anterior = 10.000
- saldo líquido atual = 9.950
- saque normal = 100

`rendimentoLiquidoDia = 9.950 - 10.000 + 100 = 50`

### Exemplo 4 — com saque extra

- saldo líquido anterior = 10.000
- saldo líquido atual = 8.200
- saque extra = 1.700

`rendimentoLiquidoDia = 8.200 - 10.000 + 1.700 = -100`

Nesse caso, o ativo ainda teve perda líquida real de 100 no dia, apesar da retirada.

---

## 5. Cálculo do rendimento bruto do dia

Mesma lógica do líquido.

### Fórmula

`rendimentoBrutoDia = saldoBrutoAtual - saldoBrutoAnterior - aportesDoDia + saquesNormaisDoDia + saquesExtrasDoDia`

---

## 6. Rendimento acumulado líquido

O rendimento acumulado líquido representa quanto o ativo está acima ou abaixo do principal investido.

### Fórmula

`rendimentoLiquidoAcumulado = saldoLiquidoAtual - capitalInvestidoAtual`

---

## 7. Rendimento acumulado bruto

### Fórmula

`rendimentoBrutoAcumulado = saldoBrutoAtual - capitalInvestidoAtual`

---

## 8. Total da carteira

O card principal da Home deve mostrar a soma do saldo líquido atual de todos os ativos do mês selecionado.

### Fórmula

`saldoTotalCarteira = soma(saldoLiquidoAtual de todos os ativos)`

### Observação

Se você quiser futuramente alternar entre visão líquida e bruta, o app pode ter um toggle. No MVP, recomendo exibir o total líquido como principal.

---

## 9. Totais mensais

Para cada ativo no mês:

### 9.1 Aportes do mês

`totalAportesMes = soma(aportes do período)`

### 9.2 Saques normais do mês

`totalSaquesNormaisMes = soma(saques normais do período)`

### 9.3 Saques extras do mês

`totalSaquesExtrasMes = soma(saques extras do período)`

### 9.4 Rendimento líquido do mês

`rendimentoLiquidoMes = soma(rendimentoLiquidoDia de todas as leituras do mês)`

### 9.5 Rendimento bruto do mês

`rendimentoBrutoMes = soma(rendimentoBrutoDia de todas as leituras do mês)`

---

## 10. Totais anuais

Para cada ativo no ano:

- total líquido anual = soma dos rendimentos líquidos mensais;
- total bruto anual = soma dos rendimentos brutos mensais;
- total de aportes anual = soma dos aportes do ano;
- total de saques normais anual = soma dos saques normais do ano;
- total de saques extras anual = soma dos saques extras do ano.

---

## 11. Regra de criação de novo mês

Ao criar um novo mês:

- copiar os ativos existentes;
- herdar o capital investido final do mês anterior;
- herdar o saldo líquido final do mês anterior;
- herdar o saldo bruto final do mês anterior;
- iniciar o histórico diário vazio;
- manter os totais mensais zerados até novas leituras e movimentações.

### Resumo prático

O novo mês começa com a fotografia final do mês anterior.

---

## 12. Regra de leitura inicial do mês

Na ausência de leitura diária anterior dentro do novo mês, a primeira leitura do mês deve comparar contra os valores herdados do mês anterior.

### Base de comparação

- saldo líquido base = último saldo líquido do mês anterior;
- saldo bruto base = último saldo bruto do mês anterior.

---

## 13. Regras de edição

## 13.1 Editar leitura diária

Se o usuário corrigir uma leitura diária:

- recalcular o rendimento daquele dia;
- recalcular todos os acumulados posteriores do mês, se necessário.

## 13.2 Editar movimentação

Se o usuário editar aporte ou saque:

- recalcular o rendimento do dia da movimentação;
- atualizar totais mensais e anuais;
- atualizar capital investido quando for aporte ou saque extra.

---

## 14. Regras de validação

### 14.1 Valores monetários

- aceitar zero;
- bloquear vazio em campos obrigatórios;
- bloquear texto inválido;
- bloquear negativos em aportes e saques.

### 14.2 Datas

- leitura diária deve pertencer ao período correto;
- aporte/saque deve pertencer ao período correto;
- se a data cair em outro mês, o app deve salvar no período correspondente automaticamente.

### 14.3 Exclusão do último mês

- não permitir excluir o único mês existente.

---

## 15. Recomendação importante de nomenclatura

Para evitar confusão no app, recomendo usar estes nomes:

- `Saldo líquido atual`
- `Saldo bruto atual`
- `Rendimento líquido do dia`
- `Rendimento bruto do dia`
- `Capital investido`
- `Saque normal`
- `Saque extra`

Isso deixa a regra muito mais clara do que usar apenas “saldo” e “rendimento”.

