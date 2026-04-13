<script setup>
import { computed, nextTick, reactive, ref, watch } from "vue";
import AppSelect from "../components/ui/AppSelect.vue";

const MOVEMENTS_PER_PAGE = 5;

const props = defineProps({
	assets: {
		type: Array,
		default: () => [],
	},
	monthlyStates: {
		type: Array,
		default: () => [],
	},
	transactions: {
		type: Array,
		default: () => [],
	},
	isSubmitting: {
		type: Boolean,
		default: false,
	},
	errorMessage: {
		type: String,
		default: "",
	},
	periodLabel: {
		type: String,
		default: "",
	},
	selectedYear: {
		type: Number,
		default: null,
	},
	selectedPeriodId: {
		type: String,
		default: "",
	},
});

const emit = defineEmits(["update-transaction", "delete-transaction"]);
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const isEditTransactionModalOpen = ref(false);
const deleteTransactionTarget = ref(null);
const pendingTransactionAction = ref("");
const shouldShowTransactionValidation = ref(false);
const transactionTypeOptions = Object.freeze([
	{ value: "contribution", label: "Aporte" },
	{ value: "withdrawal", label: "Saque" },
	{ value: "extraWithdrawal", label: "Saque Extra" },
]);
const transactionForm = reactive({
	id: "",
	type: "contribution",
	date: "",
	note: "",
	amount: 0,
});
const amountInput = ref(formatCurrency(0));
const activeCalculatorField = ref("");
const calculatorExpression = ref("");
const calculatorError = ref("");
const calculatorExpressionInputRef = ref(null);
const isTransactionTypeInvalid = computed(() =>
	shouldShowTransactionValidation.value && !transactionTypeOptions.some((option) => option.value === transactionForm.type),
);
const isTransactionDateInvalid = computed(() =>
	shouldShowTransactionValidation.value && !transactionForm.date,
);
const isTransactionNoteInvalid = computed(() =>
	shouldShowTransactionValidation.value && !transactionForm.note.trim(),
);
const isTransactionAmountInvalid = computed(() =>
	shouldShowTransactionValidation.value && Number(transactionForm.amount) <= 0,
);
const calculatorPreviewText = computed(() => {
	if (!calculatorExpression.value.trim()) {
		return "Resultado: R$ 0,00";
	}

	try {
		const result = evaluateCalculatorExpression(calculatorExpression.value);

		if (result < 0) {
			return "Resultado: valor negativo";
		}

		return `Resultado: ${formatCurrency(result)}`;
	} catch {
		return "Resultado: calculando...";
	}
});

const activeAssets = computed(() => props.assets.filter((asset) => asset.isActive !== false));
const selectedAnnualAssetIds = ref([]);
const movementSortState = ref(getDefaultMovementSort());
const movementPage = ref(1);

watch(
	activeAssets,
	(nextAssets, previousAssets = []) => {
		const nextAssetIds = nextAssets.map((asset) => asset.id);
		const previousAssetIds = previousAssets.map((asset) => asset.id);

		if (nextAssetIds.length === 0) {
			selectedAnnualAssetIds.value = [];
			return;
		}

		if (selectedAnnualAssetIds.value.length === 0 && previousAssetIds.length === 0) {
			selectedAnnualAssetIds.value = [...nextAssetIds];
			return;
		}

		const preservedAssetIds = selectedAnnualAssetIds.value.filter((assetId) => nextAssetIds.includes(assetId));
		const newAssetIds = nextAssetIds.filter((assetId) => !previousAssetIds.includes(assetId));
		const mergedAssetIds = [...preservedAssetIds, ...newAssetIds];

		selectedAnnualAssetIds.value = mergedAssetIds.length > 0 ? mergedAssetIds : [...nextAssetIds];
	},
	{ immediate: true },
);

const selectedAnnualAssets = computed(() =>
	activeAssets.value.filter((asset) => selectedAnnualAssetIds.value.includes(asset.id)),
);
const latestMonthlyStateMap = computed(() => {
	const monthlyStatesByAssetId = new Map();

	props.monthlyStates.forEach((monthlyState) => {
		if (!monthlyState.assetId) {
			return;
		}

		const currentMonthlyState = monthlyStatesByAssetId.get(monthlyState.assetId) || null;
		if (!currentMonthlyState || currentMonthlyState.periodId.localeCompare(monthlyState.periodId, "pt-BR") < 0) {
			monthlyStatesByAssetId.set(monthlyState.assetId, monthlyState);
		}
	});

	return monthlyStatesByAssetId;
});
const summaryTotalBalance = computed(() =>
	selectedAnnualAssets.value.reduce((total, asset) => {
		const latestMonthlyState = latestMonthlyStateMap.value.get(asset.id) || null;
		return total + Number(latestMonthlyState?.currentCapitalInvested ?? asset.initialValue ?? 0);
	}, 0),
);
const selectedPeriodLabel = computed(() => {
	const formattedPeriodLabel = formatPeriodLabel(props.selectedPeriodId);

	if (formattedPeriodLabel !== "--") {
		return formattedPeriodLabel;
	}

	return props.periodLabel || "--";
});
const selectedPeriodStateMap = computed(() => {
	const monthlyStatesByAssetId = new Map();

	props.monthlyStates.forEach((monthlyState) => {
		if (monthlyState.periodId !== props.selectedPeriodId || !monthlyState.assetId) {
			return;
		}

		monthlyStatesByAssetId.set(monthlyState.assetId, monthlyState);
	});

	return monthlyStatesByAssetId;
});
const assetPeriodRows = computed(() =>
	selectedAnnualAssets.value.map((asset) => {
		const monthlyState = selectedPeriodStateMap.value.get(asset.id) || null;
		return {
			id: asset.id,
			name: asset.name,
			color: asset.color || "#4F7CFF",
			periodLabel: selectedPeriodLabel.value || "--",
			netIncome: monthlyState ? monthlyState.monthNetIncome : null,
			grossIncome: monthlyState ? monthlyState.monthGrossIncome : null,
		};
	}),
);
const assetMap = computed(() => {
	const entries = activeAssets.value.map((asset) => [
		asset.id,
		{
			name: asset.name,
			color: asset.color || "#4F7CFF",
		},
	]);

	return new Map(entries);
});
const selectedTransactions = computed(() =>
	props.transactions.filter((transaction) => selectedAnnualAssetIds.value.includes(transaction.assetId)),
);
const annualRows = computed(() => {
	if (!props.selectedYear || selectedAnnualAssets.value.length === 0) {
		return [];
	}

	return selectedAnnualAssets.value
		.map((asset) => {
			const yearlyStates = props.monthlyStates
				.filter((monthlyState) => monthlyState.assetId === asset.id && getPeriodYear(monthlyState.periodId) === props.selectedYear)
				.sort((leftState, rightState) => leftState.periodId.localeCompare(rightState.periodId, "pt-BR"));
			const historicalStates = props.monthlyStates
				.filter((monthlyState) => monthlyState.assetId === asset.id && getPeriodYear(monthlyState.periodId) <= props.selectedYear)
				.sort((leftState, rightState) => leftState.periodId.localeCompare(rightState.periodId, "pt-BR"));
			const latestHistoricalState = historicalStates[historicalStates.length - 1] || null;
			const yearlyTransactions = selectedTransactions.value.filter((transaction) =>
				transaction.assetId === asset.id && getPeriodYear(transaction.periodId) === props.selectedYear,
			);

			return {
				id: asset.id,
				name: asset.name,
				color: asset.color || "#4F7CFF",
				label: String(props.selectedYear),
				liquidBalance: yearlyStates.reduce((total, monthlyState) => total + Number(monthlyState.monthNetIncome || 0), 0),
				totalBalance: Number(latestHistoricalState?.currentCapitalInvested ?? asset.initialValue ?? 0),
				contribution: yearlyTransactions.reduce((total, transaction) =>
					total + (transaction.type === "contribution" ? Number(transaction.amount || 0) : 0), 0),
				extraWithdrawals: yearlyTransactions.reduce((total, transaction) =>
					total + (transaction.type === "extraWithdrawal" ? Number(transaction.amount || 0) : 0), 0),
			};
		})
		.sort((leftRow, rightRow) => leftRow.name.localeCompare(rightRow.name, "pt-BR", { sensitivity: "base" }));
});
const annualTotals = computed(() => ({
	liquidBalance: annualRows.value.reduce((total, row) => total + Number(row.liquidBalance || 0), 0),
	totalBalance: annualRows.value.reduce((total, row) => total + Number(row.totalBalance || 0), 0),
	contribution: annualRows.value.reduce((total, row) => total + Number(row.contribution || 0), 0),
	extraWithdrawals: annualRows.value.reduce((total, row) => total + Number(row.extraWithdrawals || 0), 0),
}));
const withdrawalRows = computed(() =>
	selectedTransactions.value
		.filter((transaction) => transaction.type === "withdrawal" && transaction.periodId === props.selectedPeriodId)
		.map((transaction) => {
			const asset = assetMap.value.get(transaction.assetId);

			return {
				id: transaction.id,
				assetName: asset?.name || "Ativo removido",
				assetColor: asset?.color || "#4F7CFF",
				type: transaction.type,
				typeLabel: formatMovementType(transaction.type),
				periodLabel: formatPeriodLabel(transaction.periodId),
				transactionDate: transaction.transactionDate || "",
				dateLabel: formatTransactionDate(transaction.transactionDate),
				note: transaction.note || "--",
				amount: Number(transaction.amount || 0),
			};
		})
		.sort((leftRow, rightRow) => compareTransactionRows(leftRow, rightRow) * -1),
);
const periodTotals = computed(() => ({
	netIncome: assetPeriodRows.value.reduce((total, row) => total + Number(row.netIncome || 0), 0),
	grossIncome: assetPeriodRows.value.reduce((total, row) => total + Number(row.grossIncome || 0), 0),
	withdrawals: withdrawalRows.value.reduce((total, row) => total + Number(row.amount || 0), 0),
}));
const movementRows = computed(() => {
	const allowedTypes = ["contribution", "extraWithdrawal"];
	const multiplier = movementSortState.value.direction === "asc" ? 1 : -1;
	const transactionEntries = [...selectedTransactions.value];

	return transactionEntries
		.filter((transaction) => allowedTypes.includes(transaction.type) && selectedAnnualAssetIds.value.includes(transaction.assetId))
		.map((transaction) => {
			const asset = assetMap.value.get(transaction.assetId);

			return {
				id: transaction.id,
				assetName: asset?.name || "Ativo removido",
				assetColor: asset?.color || "#4F7CFF",
				type: transaction.type,
				typeLabel: formatMovementType(transaction.type),
				periodLabel: formatPeriodLabel(transaction.periodId),
				periodId: transaction.periodId,
				transactionDate: transaction.transactionDate || "",
				note: transaction.note || "--",
				amount: Number(transaction.amount || 0),
			};
		})
		.sort((leftRow, rightRow) => compareMovementRows(leftRow, rightRow) * multiplier);
});
const movementPageCount = computed(() => Math.max(1, Math.ceil(movementRows.value.length / MOVEMENTS_PER_PAGE)));
const paginatedMovementRows = computed(() => {
	const startIndex = (movementPage.value - 1) * MOVEMENTS_PER_PAGE;
	return movementRows.value.slice(startIndex, startIndex + MOVEMENTS_PER_PAGE);
});

watch(
	() => [
		selectedAnnualAssetIds.value.join("|"),
		movementSortState.value.key,
		movementSortState.value.direction,
		props.transactions.length,
		activeAssets.value.length,
		props.selectedYear,
	],
	() => {
		movementPage.value = 1;
	},
);

watch(
	() => props.isSubmitting,
	(isSubmitting, wasSubmitting) => {
		if (!wasSubmitting || isSubmitting || !pendingTransactionAction.value) {
			return;
		}

		if (props.errorMessage) {
			pendingTransactionAction.value = "";
			return;
		}

		closeEditTransactionModal(true);
		closeDeleteTransactionModal(true);
	},
);

watch(
	() => props.errorMessage,
	(value) => {
		if (value) {
			pendingTransactionAction.value = "";
		}
	},
);

watch(
	movementPageCount,
	(nextPageCount) => {
		if (movementPage.value > nextPageCount) {
			movementPage.value = nextPageCount;
		}
	},
	{ immediate: true },
);

function toggleAnnualAssetSelection(assetId) {
	if (!assetId) {
		return;
	}

	if (selectedAnnualAssetIds.value.includes(assetId)) {
		if (selectedAnnualAssetIds.value.length === 1) {
			return;
		}

		selectedAnnualAssetIds.value = selectedAnnualAssetIds.value.filter((currentAssetId) => currentAssetId !== assetId);
		return;
	}

	selectedAnnualAssetIds.value = [...selectedAnnualAssetIds.value, assetId];
}

function getDefaultMovementSort(sortKey = "period") {
	return {
		key: sortKey,
		direction: "asc",
	};
}

function toggleMovementSort(sortKey) {
	const currentState = movementSortState.value;

	movementSortState.value = currentState.key === sortKey
		? {
			key: sortKey,
			direction: currentState.direction === "asc" ? "desc" : "asc",
		}
		: getDefaultMovementSort(sortKey);
}

function isMovementSortActive(sortKey) {
	return movementSortState.value.key === sortKey;
}

function getMovementSortDirection(sortKey) {
	return isMovementSortActive(sortKey) ? movementSortState.value.direction : "asc";
}

function goToMovementPage(nextPage) {
	if (nextPage < 1 || nextPage > movementPageCount.value) {
		return;
	}

	movementPage.value = nextPage;
}

function openEditTransactionModal(row) {
	if (!row?.id || props.isSubmitting) {
		return;
	}

	transactionForm.id = row.id;
	transactionForm.type = row.type || "contribution";
	transactionForm.date = row.transactionDate || "";
	transactionForm.note = row.note === "--" ? "" : row.note;
	transactionForm.amount = Number(row.amount || 0);
	amountInput.value = formatCurrency(transactionForm.amount);
	closeCalculator();
	pendingTransactionAction.value = "";
	shouldShowTransactionValidation.value = false;
	isEditTransactionModalOpen.value = true;
	void nextTick(() => {
		shouldShowTransactionValidation.value = true;
	});
}

function closeEditTransactionModal(forceClose = false) {
	if (!forceClose && props.isSubmitting) {
		return;
	}

	isEditTransactionModalOpen.value = false;
	shouldShowTransactionValidation.value = false;
	transactionForm.id = "";
	transactionForm.type = "contribution";
	transactionForm.date = "";
	transactionForm.note = "";
	transactionForm.amount = 0;
	amountInput.value = formatCurrency(0);
	closeCalculator();
}

function openDeleteTransactionModal(row) {
	if (!row?.id || props.isSubmitting) {
		return;
	}

	deleteTransactionTarget.value = {
		id: row.id,
		assetName: row.assetName,
		typeLabel: row.typeLabel,
		periodLabel: row.periodLabel,
	};
	pendingTransactionAction.value = "";
}

function closeDeleteTransactionModal(forceClose = false) {
	if (!forceClose && props.isSubmitting) {
		return;
	}

	deleteTransactionTarget.value = null;
}

function isTransactionFormInvalid() {
	return (
		!transactionForm.id
		|| !transactionForm.date
		|| !transactionForm.note.trim()
		|| Number(transactionForm.amount) <= 0
		|| !transactionTypeOptions.some((option) => option.value === transactionForm.type)
	);
}

function submitTransactionEdit() {
	shouldShowTransactionValidation.value = true;

	if (isTransactionFormInvalid() || props.isSubmitting) {
		return;
	}

	pendingTransactionAction.value = "edit";
	emit("update-transaction", {
		id: transactionForm.id,
		type: transactionForm.type,
		date: transactionForm.date,
		note: transactionForm.note.trim(),
		amount: Number(transactionForm.amount),
	});
}

function confirmTransactionDelete() {
	if (!deleteTransactionTarget.value?.id || props.isSubmitting) {
		return;
	}

	pendingTransactionAction.value = "delete";
	emit("delete-transaction", deleteTransactionTarget.value.id);
}

function normalizeCurrencyText(value) {
	const raw = String(value ?? "").replace("R$ ", "");
	const sanitized = raw.replace(/[^\d,]/g, "");
	const firstCommaIndex = sanitized.indexOf(",");

	if (firstCommaIndex < 0) {
		return sanitized.replace(/^0+(?=\d)/, "");
	}

	const integerPart = sanitized.slice(0, firstCommaIndex).replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
	const decimalPart = sanitized.slice(firstCommaIndex + 1).replace(/[^\d]/g, "").slice(0, 2);

	return `${integerPart || "0"},${decimalPart}`;
}

function normalizeCalculatorExpression(value) {
	return String(value ?? "")
		.replace(/\s+/g, "")
		.replace(/,/g, ".");
}

function tokenizeCalculatorExpression(expression) {
	const tokens = [];
	let index = 0;

	while (index < expression.length) {
		const character = expression[index];

		if ("+-*/()".includes(character)) {
			tokens.push(character);
			index += 1;
			continue;
		}

		if (/\d|\./.test(character)) {
			let numberToken = character;
			index += 1;

			while (index < expression.length && /[\d.]/.test(expression[index])) {
				numberToken += expression[index];
				index += 1;
			}

			if (!/^\d+(\.\d+)?$|^\.\d+$/.test(numberToken)) {
				throw new Error("Use apenas números e uma casa decimal por valor.");
			}

			tokens.push(numberToken);
			continue;
		}

		throw new Error("Use apenas números, parênteses e + - * /.");
	}

	return tokens;
}

function evaluateCalculatorExpression(expression) {
	const normalized = normalizeCalculatorExpression(expression);

	if (!normalized) {
		throw new Error("Digite uma fórmula para calcular.");
	}

	const tokens = tokenizeCalculatorExpression(normalized);
	let currentIndex = 0;

	function parseExpression() {
		let value = parseTerm();

		while (tokens[currentIndex] === "+" || tokens[currentIndex] === "-") {
			const operator = tokens[currentIndex];
			currentIndex += 1;
			const nextValue = parseTerm();
			value = operator === "+" ? value + nextValue : value - nextValue;
		}

		return value;
	}

	function parseTerm() {
		let value = parseFactor();

		while (tokens[currentIndex] === "*" || tokens[currentIndex] === "/") {
			const operator = tokens[currentIndex];
			currentIndex += 1;
			const nextValue = parseFactor();

			if (operator === "/") {
				if (nextValue === 0) {
					throw new Error("Não é possível dividir por zero.");
				}

				value /= nextValue;
				continue;
			}

			value *= nextValue;
		}

		return value;
	}

	function parseFactor() {
		const token = tokens[currentIndex];

		if (token === "+") {
			currentIndex += 1;
			return parseFactor();
		}

		if (token === "-") {
			currentIndex += 1;
			return -parseFactor();
		}

		if (token === "(") {
			currentIndex += 1;
			const value = parseExpression();

			if (tokens[currentIndex] !== ")") {
				throw new Error("Feche os parênteses da fórmula.");
			}

			currentIndex += 1;
			return value;
		}

		if (token == null) {
			throw new Error("Fórmula incompleta.");
		}

		const numericValue = Number(token);
		if (!Number.isFinite(numericValue)) {
			throw new Error("Fórmula inválida.");
		}

		currentIndex += 1;
		return numericValue;
	}

	const result = parseExpression();

	if (currentIndex !== tokens.length) {
		throw new Error("Fórmula inválida.");
	}

	if (!Number.isFinite(result)) {
		throw new Error("Não foi possível calcular esse valor.");
	}

	return result;
}

function parseCurrencyInput(value) {
	const normalized = normalizeCurrencyText(value);
	const [integerPart = "0", decimalPart = ""] = normalized.split(",");
	const integerValue = Number(integerPart || "0");
	const fractionValue = Number(decimalPart.padEnd(2, "0") || "0");
	return integerValue + fractionValue / 100;
}

function handleCurrencyKeydown(event) {
	if (
		event.ctrlKey ||
		event.metaKey ||
		event.altKey ||
		[
			"Backspace",
			"Delete",
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
			"Tab",
			"Home",
			"End",
		].includes(event.key)
	) {
		return;
	}

	if (/^\d$/.test(event.key) || event.key === ",") {
		return;
	}

	event.preventDefault();
}

function syncAmountInput(event) {
	const target = event?.target instanceof HTMLInputElement ? event.target : null;
	const rawValue = target?.value ?? "";
	const normalizedInput = normalizeCurrencyText(rawValue);
	const parsedValue = parseCurrencyInput(normalizedInput);
	const displayValue = normalizedInput ? `R$ ${normalizedInput}` : "R$ ";

	transactionForm.amount = parsedValue;
	amountInput.value = displayValue;

	if (target && target.value !== displayValue) {
		target.value = displayValue;
	}
}

function handleAmountInput(event) {
	if (activeCalculatorField.value === "amount") {
		calculatorExpression.value = "";
		calculatorError.value = "";
	}

	syncAmountInput(event);
}

function handleAmountFocus(event) {
	const target = event?.target;

	if (transactionForm.amount === 0) {
		amountInput.value = "R$ ";

		if (target instanceof HTMLInputElement) {
			target.value = "R$ ";
			requestAnimationFrame(() => {
				target.setSelectionRange(target.value.length, target.value.length);
			});
		}
	}
}

function handleAmountBlur() {
	amountInput.value = formatCurrency(transactionForm.amount);
}

function formatCalculatorInitialValue(value) {
	const numericValue = Number(value ?? 0);
	if (!Number.isFinite(numericValue)) {
		return "";
	}

	return numericValue.toFixed(2).replace(".", ",");
}

function closeCalculator() {
	activeCalculatorField.value = "";
	calculatorExpression.value = "";
	calculatorError.value = "";
}

function toggleCalculator() {
	if (activeCalculatorField.value === "amount") {
		closeCalculator();
		return;
	}

	activeCalculatorField.value = "amount";
	calculatorExpression.value = formatCalculatorInitialValue(transactionForm.amount);
	calculatorError.value = "";

	void nextTick(() => {
		const input = calculatorExpressionInputRef.value;
		input?.focus?.();

		if (input instanceof HTMLInputElement) {
			if (input.value === "0,00") {
				input.select();
				return;
			}

			const caretPosition = input.value.length;
			input.setSelectionRange(caretPosition, caretPosition);
		}
	});
}

function applyCalculatorResult() {
	try {
		const result = evaluateCalculatorExpression(calculatorExpression.value);

		if (result < 0) {
			calculatorError.value = "O resultado precisa ser zero ou maior.";
			return;
		}

		transactionForm.amount = Number(result.toFixed(2));
		amountInput.value = formatCurrency(transactionForm.amount);
		closeCalculator();
	} catch (error) {
		calculatorError.value = error instanceof Error ? error.message : "Não foi possível calcular.";
	}
}

function handleCalculatorExpressionKeydown(event) {
	if (event.key === "Enter") {
		event.preventDefault();
		event.stopPropagation();
		applyCalculatorResult();
		return;
	}

	if (event.key !== "Escape") {
		return;
	}

	event.preventDefault();
	event.stopPropagation();
	closeCalculator();
}

function compareMovementRows(leftRow, rightRow) {
	if (movementSortState.value.key === "date") {
		return compareTransactionRows(leftRow, rightRow);
	}

	if (movementSortState.value.key === "period") {
		return leftRow.periodId.localeCompare(rightRow.periodId, "pt-BR");
	}

	if (movementSortState.value.key === "type") {
		return leftRow.typeLabel.localeCompare(rightRow.typeLabel, "pt-BR", { sensitivity: "base" });
	}

	if (movementSortState.value.key === "note") {
		return leftRow.note.localeCompare(rightRow.note, "pt-BR", { sensitivity: "base" });
	}

	if (movementSortState.value.key === "amount") {
		return leftRow.amount - rightRow.amount;
	}

	return leftRow.assetName.localeCompare(rightRow.assetName, "pt-BR", { sensitivity: "base" });
}

function compareTransactionRows(leftRow, rightRow) {
	const dateCompare = leftRow.transactionDate.localeCompare(rightRow.transactionDate, "pt-BR");
	if (dateCompare !== 0) {
		return dateCompare;
	}

	return leftRow.id.localeCompare(rightRow.id, "pt-BR", { sensitivity: "base" });
}

function formatCurrency(value) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number(value || 0));
}

function formatValue(value) {
	return value == null ? "--" : formatCurrency(value);
}

function formatMovementType(type) {
	if (type === "contribution") {
		return "Aporte";
	}

	if (type === "withdrawal") {
		return "Saque";
	}

	if (type === "extraWithdrawal") {
		return "Saque Extra";
	}

	return "--";
}

function getPeriodYear(periodId) {
	const match = /^(\d{4})-(\d{2})$/.exec(String(periodId || ""));
	return match ? Number(match[1]) : null;
}

function formatPeriodLabel(periodId) {
	const match = /^(\d{4})-(\d{2})$/.exec(String(periodId || ""));
	if (!match) {
		return "--";
	}

	const year = Number(match[1]);
	const month = Number(match[2]);

	return `${String(month).padStart(2, "0")}/${year}`;
}

function formatTransactionDate(value) {
	const normalized = String(value || "").trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		return "--";
	}

	const [year, month, day] = normalized.split("-");
	return `${day}/${month}/${year}`;
}
</script>

<template>
	<section class="summary-view">
		<section class="summary-hero">
			<div>
				<h2>Resumo</h2>
			</div>

			<div class="summary-hero-stats">
				<article class="hero-stat hero-stat-total">
					<span>Saldo Total</span>
					<strong>{{ formatCurrency(summaryTotalBalance) }}</strong>
				</article>
			</div>
		</section>

		<section v-if="activeAssets.length > 0" class="summary-filter-bar" aria-label="Filtro global de ativos">
			<div class="summary-filter-copy">
				<span>Ativos visíveis</span>
			</div>

			<div class="asset-pill-list" role="tablist" aria-label="Filtro global de ativos do resumo">
				<button
					v-for="asset in activeAssets"
					:key="`global-pill-${asset.id}`"
					type="button"
					class="asset-pill"
					:class="{ 'is-active': selectedAnnualAssetIds.includes(asset.id) }"
					@click="toggleAnnualAssetSelection(asset.id)"
				>
					<span class="asset-dot" :style="{ '--asset-color': asset.color || '#4F7CFF' }" />
					<span>{{ asset.name }}</span>
				</button>
			</div>
		</section>

		<section class="summary-table-card">
			<header class="table-header">
				<h3>Saldo anual</h3>
			</header>

			<div class="table-shell table-shell-annual">
				<table class="summary-table">
					<thead>
						<tr>
							<th>Ativo</th>
							<th>Per&iacute;odo</th>
							<th>Saldo l&iacute;quido</th>
							<th>Saldo total</th>
							<th>Aporte</th>
							<th>Saques Extras</th>
						</tr>
					</thead>

					<tbody v-if="annualRows.length > 0">
						<tr v-for="row in annualRows" :key="row.id">
							<td>
								<div class="asset-cell">
									<span class="asset-dot" :style="{ '--asset-color': row.color }" />
									<span>{{ row.name }}</span>
								</div>
							</td>
							<td>{{ row.label }}</td>
							<td>{{ formatValue(row.liquidBalance) }}</td>
							<td>{{ formatValue(row.totalBalance) }}</td>
							<td>{{ formatValue(row.contribution) }}</td>
							<td>{{ formatValue(row.extraWithdrawals) }}</td>
						</tr>
						<tr class="summary-total-row">
							<td colspan="2">Total</td>
							<td>{{ formatValue(annualTotals.liquidBalance) }}</td>
							<td>{{ formatValue(annualTotals.totalBalance) }}</td>
							<td>{{ formatValue(annualTotals.contribution) }}</td>
							<td>{{ formatValue(annualTotals.extraWithdrawals) }}</td>
						</tr>
					</tbody>

					<tbody v-else>
						<tr>
							<td colspan="6" class="empty-row">
								{{ selectedAnnualAssets.length > 0 ? "Sem registros anuais para os ativos selecionados." : "Cadastre um ativo para visualizar o saldo anual." }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section class="summary-grid">
			<section class="summary-table-card">
				<header class="table-header">
					<h3>Rendimento l&iacute;quido</h3>
				</header>

				<div class="table-shell">
					<table class="summary-table">
						<thead>
							<tr>
								<th>Ativo</th>
								<th>Per&iacute;odo</th>
								<th>Valor</th>
							</tr>
						</thead>

						<tbody v-if="assetPeriodRows.length > 0">
							<tr v-for="row in assetPeriodRows" :key="`net-${row.id}`">
								<td>
									<div class="asset-cell">
										<span class="asset-dot" :style="{ '--asset-color': row.color }" />
										<span>{{ row.name }}</span>
									</div>
								</td>
								<td>{{ row.periodLabel }}</td>
								<td>{{ formatValue(row.netIncome) }}</td>
							</tr>
							<tr class="summary-total-row">
								<td colspan="2">Total</td>
								<td>{{ formatValue(periodTotals.netIncome) }}</td>
							</tr>
						</tbody>

						<tbody v-else>
							<tr>
								<td colspan="3" class="empty-row">Nenhum ativo para resumir.</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<section class="summary-table-card">
				<header class="table-header">
					<h3>Rendimento bruto</h3>
				</header>

				<div class="table-shell">
					<table class="summary-table">
						<thead>
							<tr>
								<th>Ativo</th>
								<th>Per&iacute;odo</th>
								<th>Valor</th>
							</tr>
						</thead>

						<tbody v-if="assetPeriodRows.length > 0">
							<tr v-for="row in assetPeriodRows" :key="`gross-${row.id}`">
								<td>
									<div class="asset-cell">
										<span class="asset-dot" :style="{ '--asset-color': row.color }" />
										<span>{{ row.name }}</span>
									</div>
								</td>
								<td>{{ row.periodLabel }}</td>
								<td>{{ formatValue(row.grossIncome) }}</td>
							</tr>
							<tr class="summary-total-row">
								<td colspan="2">Total</td>
								<td>{{ formatValue(periodTotals.grossIncome) }}</td>
							</tr>
						</tbody>

						<tbody v-else>
							<tr>
								<td colspan="3" class="empty-row">Nenhum ativo para resumir.</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<section class="summary-table-card summary-table-card-wide">
				<header class="table-header">
					<h3>Saques</h3>
				</header>

				<div class="table-shell">
					<table class="summary-table summary-table-withdrawals">
						<thead>
							<tr>
								<th>Ativo</th>
								<th>Data</th>
								<th>Motivo</th>
								<th>Valor</th>
								<th class="movement-actions-column">A&ccedil;&otilde;es</th>
							</tr>
						</thead>

						<tbody v-if="withdrawalRows.length > 0">
							<tr v-for="row in withdrawalRows" :key="`withdrawal-${row.id}`">
								<td>
									<div class="asset-cell">
										<span class="asset-dot" :style="{ '--asset-color': row.assetColor }" />
										<span>{{ row.assetName }}</span>
									</div>
								</td>
								<td>{{ row.dateLabel }}</td>
								<td>{{ row.note }}</td>
								<td>{{ formatCurrency(row.amount) }}</td>
								<td>
									<div class="movement-actions">
										<button
											type="button"
											class="icon-button asset-action-button asset-action-button-edit"
											aria-label="Editar movimenta&ccedil;&atilde;o"
											:disabled="isSubmitting"
											@click="openEditTransactionModal(row)"
										>
											<span class="button-icon button-icon-edit" aria-hidden="true">
												<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
													<path d="m4 20 4.2-1 9.5-9.5a2.12 2.12 0 1 0-3-3L5.2 16 4 20Z" />
													<path d="m13.5 7.5 3 3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
												</svg>
											</span>
										</button>

										<button
											type="button"
											class="danger-button icon-button asset-action-button asset-action-button-delete"
											aria-label="Excluir movimenta&ccedil;&atilde;o"
											:disabled="isSubmitting"
											@click="openDeleteTransactionModal(row)"
										>
											<span class="button-icon button-icon-delete" aria-hidden="true">
												<svg class="delete-icon-svg" width="26" height="26" viewBox="124 86 10 16" aria-hidden="true">
													<path
														d="M 126.81 89.11 L 126.81 87.61 C 126.81 87.058 127.258 86.61 127.81 86.61 L 130.81 86.61 C 131.362 86.61 131.81 87.058 131.81 87.61 L 131.81 89.11 L 124.81 89.11 L 124.918 89.901 L 133.702 89.901 L 133.81 89.11 Z M 132.31 99.11 C 132.283 99.643 131.843 100.061 131.31 100.06 L 127.31 100.06 C 126.777 100.061 126.337 99.643 126.31 99.11 L 125.036 90.767 L 133.584 90.767 Z M 130.627 98.807 L 131.493 98.807 L 131.493 91.978 L 130.627 91.978 Z M 128.902 98.807 L 129.768 98.807 L 129.768 91.978 L 128.902 91.978 Z M 127.204 98.807 L 128.07 98.807 L 128.07 91.978 L 127.204 91.978 Z"
														fill="currentColor"
														style="stroke-width: 1;"
													/>
												</svg>
											</span>
										</button>
									</div>
								</td>
							</tr>
							<tr class="summary-total-row">
								<td colspan="3">Total</td>
								<td>{{ formatValue(periodTotals.withdrawals) }}</td>
								<td></td>
							</tr>
						</tbody>

						<tbody v-else>
							<tr>
								<td colspan="5" class="empty-row">Nenhum saque registrado para o per&iacute;odo selecionado.</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>
		</section>

		<section class="summary-table-card">
			<header class="table-header">
				<h3>Movimenta&ccedil;&otilde;es</h3>
			</header>

			<div class="table-shell">
				<table class="summary-table summary-table-movements">
					<thead>
						<tr>
							<th>
								<button type="button" class="entry-sort-button entry-sort-button-start" @click="toggleMovementSort('asset')">
									<span>Ativo</span>
									<span class="sort-icon" :class="[getMovementSortDirection('asset'), { active: isMovementSortActive('asset') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</button>
							</th>
							<th>
								<button type="button" class="entry-sort-button" @click="toggleMovementSort('period')">
									<span>Per&iacute;odo</span>
									<span class="sort-icon" :class="[getMovementSortDirection('period'), { active: isMovementSortActive('period') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</button>
							</th>
							<th>
								<button type="button" class="entry-sort-button" @click="toggleMovementSort('type')">
									<span>Tipo</span>
									<span class="sort-icon" :class="[getMovementSortDirection('type'), { active: isMovementSortActive('type') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</button>
							</th>
							<th>
								<button type="button" class="entry-sort-button" @click="toggleMovementSort('note')">
									<span>Motivo</span>
									<span class="sort-icon" :class="[getMovementSortDirection('note'), { active: isMovementSortActive('note') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</button>
							</th>
							<th>
								<button type="button" class="entry-sort-button" @click="toggleMovementSort('amount')">
									<span>Valor</span>
									<span class="sort-icon" :class="[getMovementSortDirection('amount'), { active: isMovementSortActive('amount') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</button>
							</th>
							<th class="movement-actions-column">Ações</th>
						</tr>
					</thead>

					<tbody v-if="movementRows.length > 0">
						<tr v-for="row in paginatedMovementRows" :key="row.id">
							<td>
								<div class="asset-cell">
									<span class="asset-dot" :style="{ '--asset-color': row.assetColor }" />
									<span>{{ row.assetName }}</span>
								</div>
							</td>
							<td>{{ row.periodLabel }}</td>
							<td>{{ row.typeLabel }}</td>
							<td>{{ row.note }}</td>
							<td>{{ formatCurrency(row.amount) }}</td>
							<td>
								<div class="movement-actions">
									<button
										type="button"
										class="icon-button asset-action-button asset-action-button-edit"
										aria-label="Editar movimentação"
										:disabled="isSubmitting"
										@click="openEditTransactionModal(row)"
									>
										<span class="button-icon button-icon-edit" aria-hidden="true">
											<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
												<path d="m4 20 4.2-1 9.5-9.5a2.12 2.12 0 1 0-3-3L5.2 16 4 20Z" />
												<path d="m13.5 7.5 3 3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
											</svg>
										</span>
									</button>

									<button
										type="button"
										class="danger-button icon-button asset-action-button asset-action-button-delete"
										aria-label="Excluir movimentação"
										:disabled="isSubmitting"
										@click="openDeleteTransactionModal(row)"
									>
										<span class="button-icon button-icon-delete" aria-hidden="true">
											<svg class="delete-icon-svg" width="26" height="26" viewBox="124 86 10 16" aria-hidden="true">
												<path
													d="M 126.81 89.11 L 126.81 87.61 C 126.81 87.058 127.258 86.61 127.81 86.61 L 130.81 86.61 C 131.362 86.61 131.81 87.058 131.81 87.61 L 131.81 89.11 L 124.81 89.11 L 124.918 89.901 L 133.702 89.901 L 133.81 89.11 Z M 132.31 99.11 C 132.283 99.643 131.843 100.061 131.31 100.06 L 127.31 100.06 C 126.777 100.061 126.337 99.643 126.31 99.11 L 125.036 90.767 L 133.584 90.767 Z M 130.627 98.807 L 131.493 98.807 L 131.493 91.978 L 130.627 91.978 Z M 128.902 98.807 L 129.768 98.807 L 129.768 91.978 L 128.902 91.978 Z M 127.204 98.807 L 128.07 98.807 L 128.07 91.978 L 127.204 91.978 Z"
													fill="currentColor"
													style="stroke-width: 1;"
												/>
											</svg>
										</span>
									</button>
								</div>
							</td>
						</tr>
					</tbody>

					<tbody v-else>
						<tr>
							<td colspan="6" class="empty-row">
								{{ selectedAnnualAssets.length > 0 ? "Nenhuma movimentação encontrada para os ativos selecionados." : "Cadastre um ativo para visualizar as movimentações." }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<footer v-if="movementRows.length > 0" class="pagination-bar" aria-label="Paginação de movimentações">
				<button
					type="button"
					class="pagination-button"
					:disabled="movementPage === 1"
					aria-label="Página anterior"
					@click="goToMovementPage(movementPage - 1)"
				>
					<svg viewBox="0 0 16 16" aria-hidden="true">
						<path d="M10.5 3.5 6 8l4.5 4.5" />
					</svg>
				</button>

				<span class="pagination-indicator">{{ movementPage }} / {{ movementPageCount }}</span>

				<button
					type="button"
					class="pagination-button"
					:disabled="movementPage === movementPageCount"
					aria-label="Próxima página"
					@click="goToMovementPage(movementPage + 1)"
				>
					<svg viewBox="0 0 16 16" aria-hidden="true">
						<path d="M5.5 3.5 10 8l-4.5 4.5" />
					</svg>
				</button>
			</footer>
		</section>
		<div v-if="isEditTransactionModalOpen" class="modal-backdrop" @click="closeEditTransactionModal()">
			<div class="modal-card" @click.stop>
				<header class="modal-header">
					<h3>Editar movimentação</h3>
				</header>

				<div class="modal-grid">
					<div class="field-group">
						<span class="field-label">Tipo</span>
						<AppSelect
							v-model="transactionForm.type"
							:options="transactionTypeOptions"
							:invalid="isTransactionTypeInvalid"
							placeholder="Escolha o tipo"
						/>
						<div v-if="isTransactionTypeInvalid" class="error-text">Escolha um tipo.</div>
					</div>

					<div class="field-group">
						<span class="field-label">Data</span>
						<input
							v-model="transactionForm.date"
							:class="['text-input', { 'required-empty': isTransactionDateInvalid }]"
							type="date"
						/>
						<div v-if="isTransactionDateInvalid" class="error-text">Informe a data.</div>
					</div>

					<div class="field-group field-group-full">
						<span class="field-label">Motivo</span>
						<input
							v-model.trim="transactionForm.note"
							:class="['text-input', { 'required-empty': isTransactionNoteInvalid }]"
							type="text"
							maxlength="120"
							placeholder="Descreva a movimentação"
						/>
						<div v-if="isTransactionNoteInvalid" class="error-text">Informe o motivo da movimentação.</div>
					</div>

					<div class="field-group field-group-full">
						<span class="field-label">Valor</span>
						<div class="currency-input-group">
							<div class="currency-input-shell">
								<input
									:value="amountInput"
									:class="['text-input', { 'required-empty': isTransactionAmountInvalid }]"
									type="text"
									inputmode="decimal"
									placeholder="R$ 0,00"
									@keydown="handleCurrencyKeydown"
									@focus="handleAmountFocus"
									@input="handleAmountInput"
									@blur="handleAmountBlur"
								/>
								<button
									type="button"
									class="calculator-toggle"
									:class="{ 'is-open': activeCalculatorField === 'amount' }"
									aria-label="Abrir calculadora"
									@click="toggleCalculator"
								>
									<svg viewBox="0 0 24 24" aria-hidden="true">
										<path d="M7 3.75h10A2.25 2.25 0 0 1 19.25 6v12A2.25 2.25 0 0 1 17 20.25H7A2.25 2.25 0 0 1 4.75 18V6A2.25 2.25 0 0 1 7 3.75Z" />
										<path d="M8 7.5h8M8.75 11.25h1.5m4.5 0h1.5m-7.5 3h1.5m4.5 0h1.5m-7.5 3h1.5m4.5 0h1.5" />
									</svg>
								</button>

								<div v-if="activeCalculatorField === 'amount'" class="calculator-popover">
									<label class="field-label" for="summary-calculator-input">Fórmula</label>
									<div class="calculator-preview" aria-live="polite">{{ calculatorPreviewText }}</div>
									<input
										id="summary-calculator-input"
										ref="calculatorExpressionInputRef"
										v-model="calculatorExpression"
										class="text-input"
										type="text"
										inputmode="decimal"
										placeholder="Ex.: 450*3,5"
										@keydown="handleCalculatorExpressionKeydown"
									/>
									<div v-if="calculatorError" class="error-text">{{ calculatorError }}</div>
									<div class="calculator-popover-actions">
										<button type="button" class="primary-button calculator-apply-button" @click="applyCalculatorResult">
											Aplicar
										</button>
										<button type="button" class="danger-button" @click="closeCalculator">
											Cancelar
										</button>
									</div>
								</div>
							</div>
						</div>
						<div v-if="isTransactionAmountInvalid" class="error-text">Informe um valor maior que zero.</div>
					</div>
				</div>

				<p v-if="errorMessage" class="error-text modal-error">{{ errorMessage }}</p>

				<div class="modal-actions">
					<button class="primary-button" type="button" :disabled="isSubmitting" @click="submitTransactionEdit">
						Salvar
					</button>
					<button class="danger-button" type="button" :disabled="isSubmitting" @click="closeEditTransactionModal()">
						Cancelar
					</button>
				</div>
			</div>
		</div>

		<div v-if="deleteTransactionTarget" class="modal-backdrop" @click="closeDeleteTransactionModal()">
			<div class="modal-card" @click.stop>
				<header class="modal-header">
					<h3>Excluir movimentação</h3>
					<p>Confirme a exclusão da transação selecionada.</p>
				</header>

				<div class="modal-fields">
					<div class="confirm-summary-card">
						<span class="field-label">Movimentação</span>
						<strong>{{ deleteTransactionTarget.assetName }}</strong>
						<span>{{ deleteTransactionTarget.typeLabel }} • {{ deleteTransactionTarget.periodLabel }}</span>
					</div>

					<p v-if="errorMessage" class="error-text modal-error">{{ errorMessage }}</p>
				</div>

				<div class="modal-actions">
					<button class="danger-button" type="button" :disabled="isSubmitting" @click="closeDeleteTransactionModal()">
						Cancelar
					</button>
					<button class="danger-button" type="button" :disabled="isSubmitting" @click="confirmTransactionDelete">
						Excluir
					</button>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.summary-view {
	display: grid;
	gap: 22px;
	width: 100%;
}

.summary-hero,
.hero-stat,
.summary-table-card {
	border: 1px solid var(--glass-border);
	border-radius: 22px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.summary-hero {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
	padding: 24px;
}

.summary-filter-bar {
	display: grid;
	gap: 10px;
}

.summary-filter-copy span {
	font-size: 0.78rem;
	font-weight: 700;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.summary-hero h2,
.table-header h3 {
	margin: 0;
	color: var(--text-h);
}

.summary-hero h2 {
	font-size: clamp(2rem, 4vw, 3rem);
	line-height: 1;
	letter-spacing: -0.04em;
}

.summary-hero-stats {
	display: grid;
	grid-template-columns: minmax(320px, 420px);
	justify-content: end;
	gap: 12px;
}

.hero-stat {
	display: grid;
	gap: 8px;
	padding: 16px 18px;
}

.hero-stat-total {
	min-width: min(100%, 420px);
	padding: 20px 22px;
}

.hero-stat span {
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.hero-stat strong {
	font-size: clamp(1.15rem, 2vw, 1.8rem);
	line-height: 1.1;
	color: var(--text-h);
}

.hero-stat-total strong {
	font-size: clamp(1.5rem, 2.8vw, 2.45rem);
	letter-spacing: -0.03em;
}

.summary-table-card {
	display: grid;
	gap: 0;
	overflow: hidden;
}

.table-header {
	padding: 16px 18px;
	border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 86%, transparent);
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--glass-surface-strong) 78%, transparent);
}

.asset-pill-list {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.asset-pill {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 8px 12px;
	border: 1px solid color-mix(in srgb, var(--glass-border) 88%, transparent);
	border-radius: 999px;
	background: color-mix(in srgb, var(--glass-surface-strong) 82%, transparent);
	color: var(--text);
	font: inherit;
	font-size: 0.76rem;
	line-height: 1;
	cursor: pointer;
	transition:
		border-color 0.18s ease,
		background 0.18s ease,
		color 0.18s ease,
		transform 0.18s ease,
}

.asset-pill.is-active {
	transform: translateY(-1px);
	border-color: color-mix(in srgb, var(--color-primary) 42%, var(--glass-border));
	background: color-mix(in srgb, var(--color-primary) 14%, var(--glass-surface-strong));
	color: var(--text-h);
}

.asset-pill:hover {
	border-color: color-mix(in srgb, var(--color-primary) 34%, var(--glass-border));
	color: var(--text-h);
}

.table-shell {
	overflow-x: auto;
}

.summary-table {
	width: 100%;
	border-collapse: collapse;
}

.summary-table thead th {
	padding: 10px 16px;
	text-align: left;
	font-size: 0.84rem;
	font-weight: 700;
	border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 22%, var(--glass-divider));
	background:
		linear-gradient(
			180deg,
			color-mix(in srgb, var(--color-primary) 18%, var(--glass-surface-strong)) 0%,
			color-mix(in srgb, var(--color-primary) 10%, var(--glass-surface)) 100%
		);
	color: var(--text-h);
	white-space: nowrap;
}

.summary-table thead th .entry-sort-button {
	width: 100%;
}

.summary-table tbody td {
	padding: 14px 16px;
	border-top: 1px solid color-mix(in srgb, var(--glass-border) 86%, transparent);
	color: var(--text);
	white-space: nowrap;
}

.summary-table tbody tr:nth-child(even) td {
	background: color-mix(in srgb, var(--glass-surface-strong) 36%, transparent);
}

.summary-table tbody tr.summary-total-row td {
	font-weight: 700;
	color: var(--text-h);
	background: color-mix(in srgb, var(--color-primary) 10%, var(--glass-surface-strong));
}

.asset-cell {
	display: inline-flex;
	align-items: center;
	gap: 10px;
}

.asset-dot {
	width: 8px;
	height: 8px;
	flex: 0 0 8px;
	border-radius: 50%;
	background: var(--asset-color, #4F7CFF);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--asset-color, #4F7CFF) 16%, transparent);
}

.empty-row {
	text-align: center;
	color: var(--text-soft);
	white-space: normal !important;
	overflow-wrap: anywhere;
	word-break: break-word;
}

.entry-sort-button {
	display: inline-flex;
	align-items: flex-end;
	justify-content: center;
	gap: 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	font-weight: inherit;
	cursor: pointer;
	user-select: none;
}

.entry-sort-button-start {
	justify-content: flex-start;
}

.summary-table-movements .entry-sort-button {
	justify-content: flex-start;
}

.entry-sort-button:hover {
	color: inherit;
}

.sort-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	align-self: flex-end;
	color: currentColor;
	transition: transform 0.18s ease;
}

.sort-icon svg {
	width: 18px;
	height: 18px;
	fill: currentColor;
}

.sort-icon.active {
	color: var(--color-primary);
}

.sort-icon.asc {
	transform: rotate(0deg);
}

.sort-icon.desc {
	transform: rotate(180deg);
}

.summary-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 22px;
}

.summary-table-card-wide {
	grid-column: 1 / -1;
}

.pagination-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 12px 16px 16px;
	border-top: 1px solid color-mix(in srgb, var(--glass-border) 86%, transparent);
	background: color-mix(in srgb, var(--glass-surface-strong) 42%, transparent);
}

.pagination-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	padding: 0;
	border: 1px solid transparent;
	border-radius: 999px;
	background: transparent;
	color: var(--text-soft);
	cursor: pointer;
	transition:
		border-color 0.18s ease,
		background 0.18s ease,
		color 0.18s ease,
		transform 0.18s ease,
		box-shadow 0.18s ease;
}

.pagination-button svg {
	width: 14px;
	height: 14px;
	display: block;
	fill: none;
	stroke: currentColor;
	stroke-linecap: round;
	stroke-linejoin: round;
	stroke-width: 1.8;
}

.pagination-button:hover:not(:disabled) {
	color: var(--text-h);
}

.pagination-button:focus-visible {
	outline: none;
	border-color: color-mix(in srgb, var(--color-primary) 54%, transparent);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.pagination-button:disabled {
	opacity: 0.42;
	cursor: default;
	transform: none;
}

.pagination-indicator {
	min-width: 56px;
	text-align: center;
	font-size: 0.78rem;
	letter-spacing: 0.08em;
	color: var(--text-soft);
}

@media (max-width: 1023px) {
	.summary-hero,
	.summary-hero-stats,
	.summary-grid {
		grid-template-columns: 1fr;
		display: grid;
	}

	.table-shell,
	.table-shell-annual {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
}

@media (max-width: 640px) {
	.summary-view {
		padding-inline: 10px;
		box-sizing: border-box;
	}

	.summary-hero,
	.hero-stat,
	.table-header {
		padding: 18px;
	}

	.summary-filter-bar,
	.asset-pill-list {
		width: 100%;
	}

	.table-shell,
	.table-shell-annual {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.summary-grid .summary-table:not(.summary-table-withdrawals) {
		table-layout: fixed;
	}

	.summary-grid .summary-table thead th:nth-child(1),
	.summary-grid .summary-table tbody td:nth-child(1) {
		width: 52%;
	}

	.summary-grid .summary-table thead th:nth-child(2),
	.summary-grid .summary-table tbody td:nth-child(2) {
		width: 20%;
	}

	.summary-grid .summary-table thead th:nth-child(3),
	.summary-grid .summary-table tbody td:nth-child(3) {
		width: 28%;
	}

	.summary-table thead th,
	.summary-table tbody td {
		padding: 10px 12px;
	}

	.summary-grid .summary-table thead th,
	.summary-grid .summary-table tbody td {
		padding: 10px 8px;
		font-size: 0.92rem;
	}

	.summary-grid .summary-table thead th {
		font-size: 0.78rem;
	}

	.summary-grid .asset-cell {
		display: flex;
		min-width: 0;
		gap: 8px;
	}

	.summary-grid .asset-cell span:last-child {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.86rem;
	}

	.summary-table-movements thead th:nth-child(1),
	.summary-table-movements tbody td:nth-child(1),
	.summary-table-withdrawals thead th:nth-child(1),
	.summary-table-withdrawals tbody td:nth-child(1) {
		width: 24%;
	}

	.summary-table-movements thead th:nth-child(2),
	.summary-table-movements tbody td:nth-child(2),
	.summary-table-withdrawals thead th:nth-child(2),
	.summary-table-withdrawals tbody td:nth-child(2) {
		width: 16%;
	}

	.summary-table-movements thead th:nth-child(3),
	.summary-table-movements tbody td:nth-child(3),
	.summary-table-withdrawals thead th:nth-child(3),
	.summary-table-withdrawals tbody td:nth-child(3) {
		width: 18%;
	}

	.summary-table-movements thead th:nth-child(4),
	.summary-table-movements tbody td:nth-child(4),
	.summary-table-withdrawals thead th:nth-child(4),
	.summary-table-withdrawals tbody td:nth-child(4) {
		width: 26%;
	}

	.summary-table-movements thead th:nth-child(5),
	.summary-table-movements tbody td:nth-child(5),
	.summary-table-withdrawals thead th:nth-child(5),
	.summary-table-withdrawals tbody td:nth-child(5) {
		width: 16%;
	}

	.summary-table-movements thead th,
	.summary-table-movements tbody td,
	.summary-table-withdrawals thead th,
	.summary-table-withdrawals tbody td {
		padding: 10px 8px;
		font-size: 0.92rem;
	}

	.summary-table-movements thead th,
	.summary-table-withdrawals thead th {
		font-size: 0.78rem;
	}

	.summary-table-movements .asset-cell,
	.summary-table-withdrawals .asset-cell {
		display: flex;
		min-width: 0;
		gap: 8px;
	}

	.summary-table-movements .asset-cell span:last-child,
	.summary-table-withdrawals .asset-cell span:last-child {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.86rem;
	}

	.pagination-bar {
		padding: 10px 12px 14px;
	}
}

.movement-actions-column {
	text-align: right;
}

.movement-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.asset-action-button {
	width: 38px;
	height: 38px;
	padding: 0;
	display: inline-grid;
	place-items: center;
	border-radius: 14px;
}

.primary-button,
.danger-button,
.icon-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	border: 1px solid var(--theme-button-border);
	border-radius: 18px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-bg);
	color: var(--text-soft);
	cursor: pointer;
	outline: none;
	appearance: none;
	-webkit-appearance: none;
	-webkit-tap-highlight-color: transparent;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	transition:
		transform 0.18s ease,
		background 0.18s ease,
		border-color 0.18s ease,
		color 0.18s ease,
		box-shadow 0.18s ease,
		opacity 0.18s ease;
}

.primary-button,
.danger-button {
	padding: 11px 16px;
	font: inherit;
	font-weight: 600;
}

.icon-button {
	width: 42px;
	height: 42px;
	padding: 0;
	border-radius: 50%;
	flex: 0 0 42px;
}

.primary-button:hover,
.icon-button:hover {
	transform: translateY(-1px);
	border-color: var(--theme-button-hover-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-hover-bg);
	color: var(--text-h);
}

.primary-button:focus-visible,
.icon-button:focus-visible,
.danger-button:focus-visible,
.text-input:focus-visible {
	border-color: color-mix(in srgb, var(--color-primary) 54%, var(--theme-button-hover-border));
	box-shadow:
		0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.primary-button:disabled,
.danger-button:disabled,
.icon-button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
	transform: none;
}

.primary-button {
	border-color: color-mix(in srgb, var(--color-primary) 46%, var(--glass-border-strong));
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--color-primary) 18%, var(--glass-surface-strong));
	color: color-mix(in srgb, var(--color-primary) 62%, white);
}

.danger-button,
.asset-action-button-delete {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
}

.danger-button:hover,
.asset-action-button-delete:hover {
	border-color: var(--danger-border-strong);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
	color: var(--danger-text);
}

.asset-action-button-edit {
	border-color: color-mix(in srgb, var(--color-primary) 46%, var(--glass-border-strong));
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--color-primary) 18%, var(--glass-surface-strong));
	color: color-mix(in srgb, var(--color-primary) 62%, white);
}

.asset-action-button-edit:hover {
	border-color: color-mix(in srgb, var(--color-primary) 62%, var(--glass-border-strong));
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--color-primary) 22%, var(--glass-surface-strong));
	color: color-mix(in srgb, var(--color-primary) 42%, white);
}

.button-icon,
.icon-button svg {
	width: 20px;
	height: 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.button-icon svg,
.icon-button svg {
	width: 20px;
	height: 20px;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.button-icon-edit,
.button-icon-delete {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 26px;
	height: 26px;
}

.delete-icon-svg {
	display: block;
	width: 26px;
	height: 26px;
	flex: 0 0 26px;
	margin: 0 auto;
}

.delete-icon-svg,
.delete-icon-svg * {
	fill: currentColor !important;
	stroke: none !important;
}

.button-icon svg[fill="white"],
.button-icon svg [fill="white"] {
	fill: currentColor;
}

.button-icon svg [stroke="white"] {
	stroke: currentColor;
}

.modal-backdrop {
	position: fixed;
	inset: 0;
	z-index: 40;
	display: grid;
	place-items: center;
	padding: 24px;
	background: rgba(6, 10, 18, 0.52);
	backdrop-filter: blur(12px);
}

.modal-card {
	width: min(100%, 460px);
	gap: 12px;
	padding: 18px;
	border: 1px solid var(--glass-border);
	border-radius: 22px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.modal-header {
	display: grid;
	gap: 0;
}

.modal-fields {
	display: grid;
	gap: 14px;
}

.modal-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px 12px;
	align-items: start;
}

.field-group {
	display: grid;
	gap: 6px;
	align-content: start;
}

.field-group-full {
	grid-column: 1 / -1;
}

.field-label {
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.text-input {
	width: 100%;
	min-height: 48px;
	padding: 12px 14px;
	border: 1px solid var(--glass-border-strong);
	border-radius: 16px;
	background: var(--input-surface);
	color: var(--text);
	font: inherit;
	outline: none;
	box-sizing: border-box;
}

.text-input::placeholder {
	color: color-mix(in srgb, var(--text-soft) 72%, transparent);
}

.required-empty {
	background: var(--validation-error-bg);
	border: 1px solid var(--validation-error-border) !important;
	box-shadow: 0 0 0 2px var(--validation-error-ring);
}

.required-empty::placeholder {
	color: var(--validation-error-text);
	font-style: italic;
}

.field-group:has(.required-empty) .field-label,
.field-group:has(.app-select.is-invalid) .field-label {
	color: var(--validation-error-text);
}

.required-empty:focus-visible {
	border-color: var(--validation-error-border);
	box-shadow:
		0 0 0 3px var(--validation-error-ring),
		inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.modal-actions {
	display: flex;
	justify-content: flex-start;
	gap: 10px;
	margin-top: 20px;
}

.confirm-summary-card {
	display: grid;
	gap: 6px;
	padding: 14px 16px;
	border: 1px solid color-mix(in srgb, var(--danger-border) 82%, var(--glass-border));
	border-radius: 16px;
	background: color-mix(in srgb, var(--danger-bg) 72%, var(--glass-surface-strong));
}

.confirm-summary-card strong {
	color: var(--text-h);
}

.error-text {
	font-size: 13px;
	color: var(--validation-error-text);
}

.modal-error {
	margin: 0;
}

.currency-input-group {
	display: block;
}

.currency-input-shell {
	position: relative;
	display: flex;
	align-items: center;
}

.currency-input-shell input {
	padding-right: 54px;
}

.calculator-toggle {
	position: absolute;
	top: 50%;
	right: 12px;
	width: 18px;
	height: 18px;
	padding: 0;
	border: 0;
	background: transparent;
	box-shadow: none;
	color: var(--text-soft);
	transform: translateY(-50%);
}

.calculator-toggle:hover,
.calculator-toggle.is-open {
	color: var(--color-primary);
	background: transparent;
	border: 0;
	box-shadow: none;
	transform: translateY(-50%);
}

.calculator-toggle svg {
	width: 18px;
	height: 18px;
	stroke: currentColor;
	stroke-width: 1.8;
	fill: none;
}

.calculator-popover {
	position: absolute;
	top: calc(100% + 10px);
	right: 0;
	z-index: 5;
	display: grid;
	gap: 10px;
	width: min(280px, calc(100vw - 72px));
	padding: 14px;
	border: 1px solid var(--glass-border-strong);
	border-radius: 18px;
	background: color-mix(in srgb, var(--glass-surface) 92%, rgba(8, 17, 31, 0.94));
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.calculator-preview {
	padding: 10px 12px;
	border: 1px solid var(--glass-border);
	border-radius: 12px;
	background: color-mix(in srgb, var(--glass-surface-strong) 72%, transparent);
	color: var(--text-soft);
	font-size: 0.92rem;
}

.calculator-popover-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.calculator-apply-button {
	min-width: 88px;
}

.modal-grid :deep(.app-select__trigger) {
	min-height: 48px;
	padding: 12px 52px 12px 14px;
	border: 1px solid var(--glass-border-strong);
	border-radius: 16px;
	background: var(--input-surface);
	color: var(--text);
	box-sizing: border-box;
}

.modal-grid :deep(.app-select__label) {
	color: var(--text);
}

.modal-grid :deep(.app-select.is-invalid .app-select__trigger) {
	background: var(--validation-error-bg);
	border-color: var(--validation-error-border);
	box-shadow: 0 0 0 2px var(--validation-error-ring);
}

@media (max-width: 640px) {
	.modal-grid {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
