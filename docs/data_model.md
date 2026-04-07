# Modelo de Dados Sugerido

## 1. Visão geral

A modelagem ideal para este app é híbrida:

- uma camada mensal para organização e consolidação;
- uma camada diária para leituras e cálculo de rendimento.

---

## 2. Coleções sugeridas

Tudo segregado por usuário autenticado.

- `users/{userId}/assets`
- `users/{userId}/periods`
- `users/{userId}/assetMonthlyStates`
- `users/{userId}/dailyReadings`
- `users/{userId}/transactions`
- `users/{userId}/settings`

---

## 3. assets

Cadastro mestre dos ativos.

```json
{
	"id": "asset_001",
	"name": "CDB-DI Itaú 100% CDI",
	"institution": "Itaú",
	"category": "CDB",
	"startDate": "2026-01-10",
	"initialValue": 1000,
	"isActive": true,
	"createdAt": "timestamp",
	"updatedAt": "timestamp"
}
```

### Campos principais

- `name`
- `startDate`
- `initialValue`

### Campos opcionais

- `institution`
- `category`

---

## 4. periods

Recorte mensal do app.

```json
{
	"id": "2026-03",
	"year": 2026,
	"month": 3,
	"label": "Mar/2026",
	"createdAt": "timestamp"
}
```

---

## 5. assetMonthlyStates

Estado consolidado do ativo em cada mês.

```json
{
	"id": "asset_001__2026-03",
	"assetId": "asset_001",
	"periodId": "2026-03",
	"openingCapitalInvested": 1000,
	"currentCapitalInvested": 1200,
	"openingLiquidBalance": 1180,
	"currentLiquidBalance": 1365,
	"openingGrossBalance": 1200,
	"currentGrossBalance": 1400,
	"monthNetIncome": 85,
	"monthGrossIncome": 110,
	"monthContributions": 300,
	"monthNormalWithdrawals": 50,
	"monthExtraWithdrawals": 100,
	"lastReadingDate": "2026-03-26",
	"createdAt": "timestamp",
	"updatedAt": "timestamp"
}
```

### Função dessa entidade

Ela acelera a Home e os totais do Resumo sem precisar recalcular tudo toda vez.

### Campos importantes

- `openingCapitalInvested`
- `currentCapitalInvested`
- `openingLiquidBalance`
- `currentLiquidBalance`
- `openingGrossBalance`
- `currentGrossBalance`
- `monthNetIncome`
- `monthGrossIncome`
- `monthContributions`
- `monthNormalWithdrawals`
- `monthExtraWithdrawals`

---

## 6. dailyReadings

Leituras diárias digitadas pelo usuário.

```json
{
	"id": "reading_001",
	"assetId": "asset_001",
	"periodId": "2026-03",
	"date": "2026-03-26",
	"liquidBalance": 1365,
	"grossBalance": 1400,
	"netIncomeDay": 15,
	"grossIncomeDay": 18,
	"baseLiquidBalance": 1350,
	"baseGrossBalance": 1382,
	"createdAt": "timestamp",
	"updatedAt": "timestamp"
}
```

### Observação

`baseLiquidBalance` e `baseGrossBalance` podem ser gravados por auditoria, mas também podem ser apenas calculados em memória.

---

## 7. transactions

Uma única coleção para movimentações, diferenciada por tipo.

```json
{
	"id": "tx_001",
	"assetId": "asset_001",
	"periodId": "2026-03",
	"date": "2026-03-26",
	"type": "contribution",
	"amount": 300,
	"description": "Aporte mensal",
	"createdAt": "timestamp",
	"updatedAt": "timestamp"
}
```

### Tipos válidos

- `contribution`
- `normal_withdrawal`
- `extra_withdrawal`

### Vantagem

Uma coleção única simplifica filtros, importações e relatórios.

---

## 8. settings

Pode reaproveitar a estrutura do app atual.

```json
{
	"themeMode": "dark",
	"themeColor": "#aa3bff"
}
```

---

## 9. Relacionamentos

### 9.1 Asset -> Monthly State

Um ativo pode ter vários estados mensais.

### 9.2 Asset -> Daily Readings

Um ativo pode ter várias leituras diárias.

### 9.3 Asset -> Transactions

Um ativo pode ter vários aportes e saques.

### 9.4 Period -> Monthly State / Reading / Transaction

Todos os registros operacionais também pertencem a um período.

---

## 10. Regras de geração de registros

## 10.1 Ao criar um ativo

Criar:

- registro em `assets`;
- `assetMonthlyState` no mês atual.

Valores iniciais sugeridos:

- `openingCapitalInvested = initialValue`
- `currentCapitalInvested = initialValue`
- `openingLiquidBalance = initialValue`
- `currentLiquidBalance = initialValue`
- `openingGrossBalance = initialValue`
- `currentGrossBalance = initialValue`
- `monthNetIncome = 0`
- `monthGrossIncome = 0`

---

## 10.2 Ao criar novo mês

Para cada ativo existente, criar um novo `assetMonthlyState` com herança do mês anterior.

### Regras

- `openingCapitalInvested = previous.currentCapitalInvested`
- `currentCapitalInvested = previous.currentCapitalInvested`
- `openingLiquidBalance = previous.currentLiquidBalance`
- `currentLiquidBalance = previous.currentLiquidBalance`
- `openingGrossBalance = previous.currentGrossBalance`
- `currentGrossBalance = previous.currentGrossBalance`
- `monthNetIncome = 0`
- `monthGrossIncome = 0`
- `monthContributions = 0`
- `monthNormalWithdrawals = 0`
- `monthExtraWithdrawals = 0`

---

## 10.3 Ao salvar leitura diária

Criar ou atualizar em `dailyReadings`:

- `liquidBalance`
- `grossBalance`
- `netIncomeDay`
- `grossIncomeDay`

Depois atualizar o `assetMonthlyState` correspondente:

- `currentLiquidBalance`
- `currentGrossBalance`
- `monthNetIncome`
- `monthGrossIncome`
- `lastReadingDate`

---

## 10.4 Ao salvar transação

Criar item em `transactions`.

Depois atualizar o `assetMonthlyState`:

### Se `contribution`

- soma em `monthContributions`
- aumenta `currentCapitalInvested`

### Se `normal_withdrawal`

- soma em `monthNormalWithdrawals`
- não altera `currentCapitalInvested`

### Se `extra_withdrawal`

- soma em `monthExtraWithdrawals`
- reduz `currentCapitalInvested`

---

## 11. Índices práticos

Se usar Firestore, os filtros mais comuns serão:

- por `periodId`
- por `assetId`
- por `date`

### Consultas frequentes

- listar estados mensais por período;
- listar leituras por ativo e período;
- listar transações por ativo e período;
- listar transações por data.

---

## 12. Importação futura da planilha

Para suportar a importação posterior, o ideal é que o parser da planilha gere:

- `periods`
- `assetMonthlyStates`
- `transactions`
- opcionalmente `dailyReadings`

Se a planilha antiga não tiver histórico diário completo, tudo bem. O app pode começar com os estados mensais importados e passar a registrar o diário a partir dali.

