<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import AppSelect from "../components/ui/AppSelect.vue";

const props = defineProps({
	yearOptions: {
		type: Array,
		default: () => [],
	},
	monthOptions: {
		type: Array,
		default: () => [],
	},
	selectedYear: {
		type: Number,
		default: null,
	},
	selectedMonth: {
		type: Number,
		default: null,
	},
	periodLabel: {
		type: String,
		default: "",
	},
	hasSelectedPeriod: {
		type: Boolean,
		default: false,
	},
	isSubmitting: {
		type: Boolean,
		default: false,
	},
	errorMessage: {
		type: String,
		default: "",
	},
	assets: {
		type: Array,
		default: () => [],
	},
	monthlyStates: {
		type: Array,
		default: () => [],
	},
	selectedPeriodId: {
		type: String,
		default: "",
	},
});

const emit = defineEmits(["update:year", "update:month", "add-month", "delete-month", "submit-action"]);

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const actionConfigMap = Object.freeze({
	update: {
		title: "Atualizar ativo",
		description: "Informe os saldos atuais para recalcular este card no período selecionado.",
		confirmLabel: "Salvar",
		noteLabel: "",
		notePlaceholder: "",
		amountLabel: "",
		amountPlaceholder: "",
	},
	contribution: {
		title: "Registrar aporte",
		description: "Registre o valor aportado neste ativo.",
		confirmLabel: "Salvar",
		noteLabel: "Motivo do aporte",
		notePlaceholder: "Ex.: aporte mensal",
		amountLabel: "Valor do aporte",
		amountPlaceholder: "R$ 0,00",
	},
	withdrawal: {
		title: "Registrar saque",
		description: "Registre um saque normal deste ativo.",
		confirmLabel: "Salvar",
		noteLabel: "Motivo do saque",
		notePlaceholder: "Ex.: resgate parcial",
		amountLabel: "Valor do saque",
		amountPlaceholder: "R$ 0,00",
	},
	extraWithdrawal: {
		title: "Registrar saque extra",
		description: "",
		confirmLabel: "Salvar",
		noteLabel: "Motivo do saque",
		notePlaceholder: "Ex.: uso pessoal, ajuste de capital",
		amountLabel: "Valor",
		amountPlaceholder: "R$ 0,00",
	},
});

const activeAssets = computed(() => props.assets.filter((asset) => asset.isActive !== false));
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
const totalBalance = computed(() =>
	activeAssets.value.reduce((total, asset) => total + getAssetCapitalInvested(asset), 0),
);
const isWalletCardCompact = ref(false);
const isActionModalOpen = ref(false);
const shouldShowActionValidation = ref(false);
const pendingSubmitActionType = ref("");
const activeCalculatorField = ref("");
const calculatorExpression = ref("");
const calculatorError = ref("");
const calculatorExpressionInputRef = ref(null);
const actionModalState = reactive({
	type: "",
	assetId: "",
	assetName: "",
});
const actionForm = reactive({
	date: "",
	note: "",
	amount: 0,
	liquidBalance: 0,
	grossBalance: 0,
});
const amountInput = ref(formatCurrency(0));
const liquidBalanceInput = ref(formatCurrency(0));
const grossBalanceInput = ref(formatCurrency(0));

const currentActionConfig = computed(() => actionConfigMap[actionModalState.type] || null);
const isUpdateAction = computed(() => actionModalState.type === "update");
const shouldShowNoteField = computed(() => Boolean(currentActionConfig.value?.noteLabel));
const shouldShowAmountField = computed(() => Boolean(currentActionConfig.value?.amountLabel));
const isDateMissing = computed(() => shouldShowActionValidation.value && !actionForm.date);
const isNoteMissing = computed(() => shouldShowActionValidation.value && shouldShowNoteField.value && !actionForm.note.trim());
const isAmountMissing = computed(() => shouldShowActionValidation.value && shouldShowAmountField.value && actionForm.amount <= 0);
const isLiquidBalanceMissing = computed(() => shouldShowActionValidation.value && isUpdateAction.value && actionForm.liquidBalance <= 0);
const isGrossBalanceMissing = computed(() => shouldShowActionValidation.value && isUpdateAction.value && actionForm.grossBalance <= 0);
const shouldReserveAmountErrorSpace = computed(() => shouldShowAmountField.value);
const shouldReserveDateAmountErrorSpace = computed(() => isDateMissing.value || isAmountMissing.value);
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

watch(
	() => props.isSubmitting,
	(isSubmitting, wasSubmitting) => {
		if (!wasSubmitting || isSubmitting || !pendingSubmitActionType.value) {
			return;
		}

		if (props.errorMessage) {
			pendingSubmitActionType.value = "";
			return;
		}

		finalizeActionModalClose();
	},
);

watch(
	() => props.errorMessage,
	(value) => {
		if (value) {
			pendingSubmitActionType.value = "";
		}
	},
);

function formatCurrency(value) {
	return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
	if (!value) {
		return "Data não informada";
	}

	const [year, month, day] = String(value).split("-");
	if (!year || !month || !day) {
		return String(value);
	}

	return `${String(month).padStart(2, "0")}/${year}`;
}

// Localiza o snapshot mensal do ativo no período selecionado.
function getAssetMonthlyState(assetId) {
	return selectedPeriodStateMap.value.get(assetId) || null;
}

// Usa o valor mensal atual e cai no valor inicial quando necessário.
function getAssetCapitalInvested(asset) {
	return Number(getAssetMonthlyState(asset?.id)?.currentCapitalInvested ?? asset?.initialValue ?? 0);
}

// Gera a data local no formato que o input aceita.
function getTodayDateInputValue() {
	const now = new Date();
	const timezoneOffset = now.getTimezoneOffset() * 60_000;
	return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

// Limpa a entrada monetária sem destruir a intenção do usuário.
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

// Converte o texto exibido em número para cálculo interno.
function parseCurrencyInput(value) {
	const normalized = normalizeCurrencyText(value);
	const [integerPart = "0", decimalPart = ""] = normalized.split(",");
	const integerValue = Number(integerPart || "0");
	const fractionValue = Number(decimalPart.padEnd(2, "0") || "0");
	return integerValue + fractionValue / 100;
}

function normalizeCalculatorExpression(value) {
	return String(value ?? "")
		.replace(/\s+/g, "")
		.replace(/,/g, ".");
}

// Quebra a expressão em tokens simples para validar a fórmula.
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

// Avalia a expressão mantendo precedência e erros legíveis.
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

// Sincroniza o valor numérico e o texto formatado do campo.
function setCurrencyField(fieldKey, nextValue) {
	const normalizedValue = Number.isFinite(nextValue) ? Number(nextValue.toFixed(2)) : 0;
	actionForm[fieldKey] = normalizedValue;

	if (fieldKey === "amount") {
		amountInput.value = formatCurrency(normalizedValue);
		return;
	}

	if (fieldKey === "liquidBalance") {
		liquidBalanceInput.value = formatCurrency(normalizedValue);
		return;
	}

	grossBalanceInput.value = formatCurrency(normalizedValue);
}

// Transforma o valor atual em base amigável para a calculadora.
function formatCalculatorInitialValue(value) {
	const numericValue = Number(value ?? 0);
	if (!Number.isFinite(numericValue)) {
		return "";
	}

	return numericValue.toFixed(2).replace(".", ",");
}

// Fecha a calculadora e limpa estado temporário.
function closeCalculator() {
	activeCalculatorField.value = "";
	calculatorExpression.value = "";
	calculatorError.value = "";
}

function handleCurrencyInput(event, fieldKey) {
	if (fieldKey === "amount") {
		handleAmountInput(event);
		return;
	}

	const parsedValue = parseCurrencyInput(event.target.value);
	setCurrencyField(fieldKey, parsedValue);
	event.target.value = normalizeCurrencyText(event.target.value);
}

function handleCurrencyFocus(event, fieldKey) {
	if (fieldKey === "amount") {
		handleAmountFocus(event);
		return;
	}

	const currentValue = Number(actionForm[fieldKey] || 0);
	event.target.value = currentValue > 0 ? normalizeCurrencyText(event.target.value) : "";
}

function handleCurrencyBlur(fieldKey) {
	if (fieldKey === "amount") {
		handleAmountBlur();
		return;
	}

	setCurrencyField(fieldKey, actionForm[fieldKey]);
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

	actionForm.amount = parsedValue;
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

	if (actionForm.amount === 0) {
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
	setCurrencyField("amount", actionForm.amount);
}

function toggleCalculator() {
	if (activeCalculatorField.value === "amount") {
		closeCalculator();
		return;
	}

	activeCalculatorField.value = "amount";
	calculatorExpression.value = formatCalculatorInitialValue(actionForm.amount);
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

		setCurrencyField("amount", result);
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

// Recarrega o formulário com um estado neutro e consistente.
function resetActionForm() {
	shouldShowActionValidation.value = false;
	actionForm.date = getTodayDateInputValue();
	actionForm.note = "";
	setCurrencyField("amount", 0);
	setCurrencyField("liquidBalance", 0);
	setCurrencyField("grossBalance", 0);
	closeCalculator();
}

// Prepara o modal com o ativo e o tipo de ação escolhidos.
function openActionModal(type, asset) {
	if (!asset?.id || props.isSubmitting) {
		return;
	}

	actionModalState.type = type;
	actionModalState.assetId = asset.id;
	actionModalState.assetName = asset.name || "Ativo";
	pendingSubmitActionType.value = "";
	resetActionForm();
	isActionModalOpen.value = true;
	void nextTick(() => {
		shouldShowActionValidation.value = true;
	});
}

// Limpa o modal sem depender de confirmação externa.
function finalizeActionModalClose() {
	isActionModalOpen.value = false;
	shouldShowActionValidation.value = false;
	pendingSubmitActionType.value = "";
	actionModalState.type = "";
	actionModalState.assetId = "";
	actionModalState.assetName = "";
	resetActionForm();
}

// Bloqueia fechamento enquanto a gravação ainda está em andamento.
function closeActionModal() {
	if (props.isSubmitting) {
		return;
	}

	finalizeActionModalClose();
}

// Valida os campos obrigatórios sem espalhar regra pelo template.
function hasActionFormErrors() {
	if (!actionForm.date) {
		return true;
	}

	if (shouldShowNoteField.value && !actionForm.note.trim()) {
		return true;
	}

	if (shouldShowAmountField.value && actionForm.amount <= 0) {
		return true;
	}

	if (isUpdateAction.value && (actionForm.liquidBalance <= 0 || actionForm.grossBalance <= 0)) {
		return true;
	}

	return false;
}

// Emite a ação só quando o formulário está coerente.
function submitAction() {
	shouldShowActionValidation.value = true;

	if (hasActionFormErrors() || !actionModalState.assetId || !actionModalState.type || props.isSubmitting) {
		return;
	}

	pendingSubmitActionType.value = actionModalState.type;
	emit("submit-action", {
		type: actionModalState.type,
		assetId: actionModalState.assetId,
		date: actionForm.date,
		note: actionForm.note.trim(),
		amount: actionForm.amount,
		liquidBalance: actionForm.liquidBalance,
		grossBalance: actionForm.grossBalance,
	});
}

// Evita capturar Enter/Escape quando o foco está em um controle editável.
function isKeyboardShortcutTargetBlocked() {
	const activeElement = document.activeElement;

	if (!(activeElement instanceof HTMLElement)) {
		return false;
	}

	const tagName = activeElement.tagName;

	return (
		activeElement.isContentEditable ||
		tagName === "INPUT" ||
		tagName === "TEXTAREA" ||
		tagName === "SELECT" ||
		tagName === "BUTTON" ||
		tagName === "A"
	);
}

// Direciona atalhos do teclado para o modal ativo.
function handleActionModalKeydown(event) {
	if (!isActionModalOpen.value || props.isSubmitting) {
		return;
	}

	if (event.key === "Escape") {
		event.preventDefault();
		closeActionModal();
		return;
	}

	if (event.key !== "Enter" || event.shiftKey || isKeyboardShortcutTargetBlocked()) {
		return;
	}

	event.preventDefault();
	submitAction();
}

// Ajusta a compactação do card principal conforme a rolagem.
function handleWindowScroll() {
	isWalletCardCompact.value = window.scrollY > 120;
}

onMounted(() => {
	handleWindowScroll();
	window.addEventListener("scroll", handleWindowScroll, { passive: true });
	window.addEventListener("keydown", handleActionModalKeydown);
});

onBeforeUnmount(() => {
	window.removeEventListener("scroll", handleWindowScroll);
	window.removeEventListener("keydown", handleActionModalKeydown);
});
</script>

<template>
	<section class="home-view">
		<section class="filter-card">
			<div class="filter-row">
				<div class="filter-selects">
					<AppSelect
						class="year-filter"
						:model-value="selectedYear"
						:options="yearOptions"
						placeholder="Ano"
						@update:model-value="$emit('update:year', $event)"
					/>

					<AppSelect
						class="month-filter"
						:model-value="selectedMonth"
						:options="monthOptions"
						placeholder="Mês"
						@update:model-value="$emit('update:month', $event)"
					/>
				</div>

				<div class="filter-spacer" />

				<div class="filter-actions">
					<button :disabled="isSubmitting" type="button" @click="$emit('add-month')">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
							<path fill-rule="evenodd" d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Zm2 0V2h7a2 2 0 0 1 2 2v6.41A7.5 7.5 0 1 0 10.5 22H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Z" clip-rule="evenodd" />
							<path fill-rule="evenodd" d="M9 16a6 6 0 1 1 12 0 6 6 0 0 1-12 0Zm6-3a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z" clip-rule="evenodd" />
						</svg>
					</button>

					<button class="danger-button month-remove-button" :disabled="isSubmitting || !hasSelectedPeriod" type="button" @click="$emit('delete-month')">
						<svg class="delete-icon-svg" width="26" height="26" viewBox="124 86 10 16" aria-hidden="true">
							<path
								d="M 126.81 89.11 L 126.81 87.61 C 126.81 87.058 127.258 86.61 127.81 86.61 L 130.81 86.61 C 131.362 86.61 131.81 87.058 131.81 87.61 L 131.81 89.11 L 124.81 89.11 L 124.918 89.901 L 133.702 89.901 L 133.81 89.11 Z M 132.31 99.11 C 132.283 99.643 131.843 100.061 131.31 100.06 L 127.31 100.06 C 126.777 100.061 126.337 99.643 126.31 99.11 L 125.036 90.767 L 133.584 90.767 Z M 130.627 98.807 L 131.493 98.807 L 131.493 91.978 L 130.627 91.978 Z M 128.902 98.807 L 129.768 98.807 L 129.768 91.978 L 128.902 91.978 Z M 127.204 98.807 L 128.07 98.807 L 128.07 91.978 L 127.204 91.978 Z"
								fill="currentColor"
								style="stroke-width: 1;"
							/>
						</svg>
					</button>
				</div>
			</div>
		</section>

		<section v-if="hasSelectedPeriod" class="wallet-card" :class="{ 'wallet-card-compact': isWalletCardCompact }">
			<div class="wallet-card-main">
				<p class="wallet-label">Saldo total</p>
				<strong class="wallet-total">{{ formatCurrency(totalBalance) }}</strong>
			</div>

			<ul v-if="activeAssets.length > 0" class="wallet-asset-list">
				<li v-for="asset in activeAssets" :key="`wallet-${asset.id}`" class="wallet-asset-row">
					<div class="wallet-asset-info">
						<span class="wallet-asset-dot" :style="{ '--asset-color': asset.color || '#4F7CFF' }" />
						<span class="wallet-asset-name">{{ asset.name }}</span>
					</div>
					<strong class="wallet-asset-value">{{ formatCurrency(getAssetCapitalInvested(asset)) }}</strong>
				</li>
			</ul>

			<div v-else class="wallet-empty-state">
				<span>Nenhum ativo cadastrado neste período.</span>
			</div>
		</section>

		<section v-if="hasSelectedPeriod && activeAssets.length > 0" class="asset-panel">
			<section class="asset-list">
				<article
					v-for="asset in activeAssets"
					:key="asset.id"
					class="asset-card"
					:style="{ '--asset-color': asset.color || '#4F7CFF' }"
				>
					<div class="asset-title-band">
						<div class="asset-title-row asset-title-row-surface">
							<span class="asset-color-dot" :style="{ '--asset-color': asset.color || '#4F7CFF' }" />
							<h3>{{ asset.name }}</h3>
						</div>
					</div>

					<div class="asset-card-top">
						<div class="asset-identity">
							<div class="asset-info-table">
								<div class="asset-info-row">
									<span class="asset-info-label">Categoria</span>
									<strong class="asset-info-value">{{ asset.category || "--" }}</strong>
								</div>

								<div class="asset-info-row">
									<span class="asset-info-label">Instituição</span>
									<strong class="asset-info-value">{{ asset.institution || "--" }}</strong>
								</div>

								<div class="asset-info-row">
									<span class="asset-info-label">Entrada</span>
									<strong class="asset-info-value">{{ formatDate(asset.startDate) }}</strong>
								</div>
							</div>
						</div>

						<div class="entry-value-card">
							<span>Valor de entrada</span>
							<strong>{{ formatCurrency(asset.initialValue) }}</strong>
						</div>
					</div>

					<div class="home-metrics-grid">
						<article class="metric-card">
							<span>Total</span>
							<strong>{{ formatCurrency(getAssetCapitalInvested(asset)) }}</strong>
						</article>

						<article class="metric-card">
							<span>Rendimento</span>
							<strong>--</strong>
						</article>

						<article class="metric-card">
							<span>Saldo atual no banco</span>
							<strong>--</strong>
						</article>

						<article class="metric-card">
							<span>Rendimento diário</span>
							<strong>--</strong>
						</article>
					</div>

					<div class="asset-actions">
						<button
							type="button"
							class="action-button action-button-primary"
							aria-label="Atualizar"
							title="Atualizar"
							:disabled="isSubmitting"
							@click="openActionModal('update', asset)"
						>
							<span class="action-button-icon" aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none" class="action-button-icon-svg action-button-icon-svg-bag">
									<path d="M12 4 12 6M12 18 12 20M15.5 8C15.1666667 6.66666667 14 6 12 6 9 6 8.5 7.95652174 8.5 9 8.5 13.140327 15.5 10.9649412 15.5 15 15.5 16.0434783 15 18 12 18 10 18 8.83333333 17.3333333 8.5 16" />
								</svg>
							</span>
							<span class="action-button-label">Atualizar</span>
						</button>
						<button
							type="button"
							class="action-button action-button-secondary"
							aria-label="Aporte"
							title="Aporte"
							:disabled="isSubmitting"
							@click="openActionModal('contribution', asset)"
						>
							<span class="action-button-icon" aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none">
									<path
										d="M12 5 12 6.5M12 17.5 12 19M15.1 8.6C14.8333333 7.53333333 13.8 7 12 7 9.3 7 8.85 8.56521739 8.85 9.4 8.85 12.7122616 15.15 10.9719529 15.15 14.2 15.15 15.0347826 14.7 16.6 12 16.6 10.2 16.6 9.16666667 16.0666667 8.9 15"
										stroke="currentColor"
										stroke-width="1.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path
										d="M12.58 3.96997H6C4.93913 3.96997 3.92178 4.39146 3.17163 5.1416C2.42149 5.89175 2 6.9091 2 7.96997V17.97C2 19.0308 2.42149 20.0482 3.17163 20.7983C3.92178 21.5485 4.93913 21.97 6 21.97H18C19.0609 21.97 20.0783 21.5485 20.8284 20.7983C21.5786 20.0482 22 19.0308 22 17.97V11.8999"
										stroke="currentColor"
										stroke-width="1.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path
										d="M21.9998 2.91992L16.3398 8.57992"
										stroke="currentColor"
										stroke-width="1.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path
										d="M20.8698 8.5798H16.3398V4.0498"
										stroke="currentColor"
										stroke-width="1.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</span>
							<span class="action-button-label">Aporte</span>
						</button>
						<button
							type="button"
							class="action-button action-button-secondary"
							aria-label="Saque"
							title="Saque"
							:disabled="isSubmitting"
							@click="openActionModal('withdrawal', asset)"
						>
							<span class="action-button-icon" aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none">
									<path
										d="M12 5 12 6.5M12 17.5 12 19M15.1 8.6C14.8333333 7.53333333 13.8 7 12 7 9.3 7 8.85 8.56521739 8.85 9.4 8.85 12.7122616 15.15 10.9719529 15.15 14.2 15.15 15.0347826 14.7 16.6 12 16.6 10.2 16.6 9.16666667 16.0666667 8.9 15"
										stroke="currentColor"
										stroke-width="1.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path
										d="M12.58 3.96997H6C4.93913 3.96997 3.92178 4.39146 3.17163 5.1416C2.42149 5.89175 2 6.9091 2 7.96997V17.97C2 19.0308 2.42149 20.0482 3.17163 20.7983C3.92178 21.5485 4.93913 21.97 6 21.97H18C19.0609 21.97 20.0783 21.5485 20.8284 20.7983C21.5786 20.0482 22 19.0308 22 17.97V11.8999"
										stroke="currentColor"
										stroke-width="1.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path
										d="M16.3398 8.57992L21.9998 2.91992"
										stroke="currentColor"
										stroke-width="1.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path
										d="M17.4805 2.91992H22.0005V7.44992"
										stroke="currentColor"
										stroke-width="1.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</span>
							<span class="action-button-label">Saque</span>
						</button>
						<button
							type="button"
							class="action-button action-button-danger"
							aria-label="Saque extra"
							title="Saque extra"
							:disabled="isSubmitting"
							@click="openActionModal('extraWithdrawal', asset)"
						>
							<span class="action-button-icon" aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none">
									<path
										d="M11.7255 17.1019C11.6265 16.8844 11.4215 16.7257 11.1734 16.6975C10.9633 16.6735 10.7576 16.6285 10.562 16.5636C10.4743 16.5341 10.392 16.5019 10.3158 16.4674L10.4424 16.1223C10.5318 16.1622 10.6239 16.1987 10.7182 16.2317L10.7221 16.2331L10.7261 16.2344C11.0287 16.3344 11.3265 16.3851 11.611 16.3851C11.8967 16.3851 12.1038 16.3468 12.2629 16.2647L12.2724 16.2598L12.2817 16.2544C12.5227 16.1161 12.661 15.8784 12.661 15.6021C12.661 15.2955 12.4956 15.041 12.2071 14.9035C12.062 14.8329 11.8559 14.7655 11.559 14.6917C11.2545 14.6147 10.9987 14.533 10.8003 14.4493C10.6553 14.3837 10.5295 14.279 10.4161 14.1293C10.3185 13.9957 10.2691 13.7948 10.2691 13.5319C10.2691 13.2147 10.3584 12.9529 10.5422 12.7315C10.7058 12.5375 10.9381 12.4057 11.2499 12.3318C11.4812 12.277 11.6616 12.1119 11.7427 11.8987C11.8344 12.1148 12.0295 12.2755 12.2723 12.3142C12.4751 12.3465 12.6613 12.398 12.8287 12.4677L12.7122 12.8059C12.3961 12.679 12.085 12.6149 11.7841 12.6149C10.7848 12.6149 10.7342 13.3043 10.7342 13.4425C10.7342 13.7421 10.896 13.9933 11.1781 14.1318L11.186 14.1357L11.194 14.1393C11.3365 14.2029 11.5387 14.2642 11.8305 14.3322C12.1322 14.4004 12.3838 14.4785 12.5815 14.5651L12.5856 14.5669L12.5897 14.5686C12.7365 14.6297 12.8624 14.7317 12.9746 14.8805L12.9764 14.8828L12.9782 14.8852C13.0763 15.012 13.1261 15.2081 13.1261 15.4681C13.1261 15.7682 13.0392 16.0222 12.8604 16.2447C12.7053 16.4377 12.4888 16.5713 12.1983 16.6531C11.974 16.7163 11.8 16.8878 11.7255 17.1019Z"
										fill="currentColor"
									/>
									<path
										d="M11.9785 18H11.497C11.3893 18 11.302 17.9105 11.302 17.8V17.3985C11.302 17.2929 11.2219 17.2061 11.1195 17.1944C10.8757 17.1667 10.6399 17.115 10.412 17.0394C10.1906 16.9648 9.99879 16.8764 9.83657 16.7739C9.76202 16.7268 9.7349 16.6312 9.76572 16.5472L10.096 15.6466C10.1405 15.5254 10.284 15.479 10.3945 15.5417C10.5437 15.6262 10.7041 15.6985 10.8755 15.7585C11.131 15.8429 11.3762 15.8851 11.611 15.8851C11.8129 15.8851 11.9572 15.8628 12.0437 15.8181C12.1302 15.7684 12.1735 15.6964 12.1735 15.6021C12.1735 15.4929 12.1158 15.411 12.0004 15.3564C11.8892 15.3018 11.7037 15.2422 11.4442 15.1777C11.1104 15.0933 10.8323 15.0039 10.6098 14.9096C10.3873 14.8103 10.1936 14.6514 10.0288 14.433C9.86396 14.2096 9.78156 13.9092 9.78156 13.5319C9.78156 13.095 9.91136 12.7202 10.1709 12.4074C10.4049 12.13 10.7279 11.9424 11.1401 11.8447C11.2329 11.8227 11.302 11.7401 11.302 11.6425V11.2C11.302 11.0895 11.3893 11 11.497 11H11.9785C12.0862 11 12.1735 11.0895 12.1735 11.2V11.6172C12.1735 11.7194 12.2487 11.8045 12.3471 11.8202C12.7082 11.8777 13.0255 11.9866 13.2989 12.1469C13.3765 12.1924 13.4073 12.2892 13.3775 12.3756L13.0684 13.2725C13.0275 13.3914 12.891 13.4417 12.7812 13.3849C12.433 13.2049 12.1007 13.1149 11.7841 13.1149C11.4091 13.1149 11.2216 13.2241 11.2216 13.4425C11.2216 13.5468 11.2773 13.6262 11.3885 13.6809C11.4998 13.7305 11.6831 13.7851 11.9386 13.8447C12.2682 13.9192 12.5464 14.006 12.773 14.1053C12.9996 14.1996 13.1953 14.356 13.3602 14.5745C13.5291 14.7929 13.6136 15.0908 13.6136 15.4681C13.6136 15.8851 13.4879 16.25 13.2365 16.5628C13.0176 16.8354 12.7145 17.0262 12.3274 17.1353C12.2384 17.1604 12.1735 17.2412 12.1735 17.3358V17.8C12.1735 17.9105 12.0862 18 11.9785 18Z"
										fill="currentColor"
									/>
									<path
										d="M9.59235 5H13.8141C14.8954 5 14.3016 6.664 13.8638 7.679L13.3656 8.843L13.2983 9C13.7702 8.97651 14.2369 9.11054 14.6282 9.382C16.0921 10.7558 17.2802 12.4098 18.1256 14.251C18.455 14.9318 18.5857 15.6958 18.5019 16.451C18.4013 18.3759 16.8956 19.9098 15.0182 20H8.38823C6.51033 19.9125 5.0024 18.3802 4.89968 16.455C4.81587 15.6998 4.94656 14.9358 5.27603 14.255C6.12242 12.412 7.31216 10.7565 8.77823 9.382C9.1696 9.11054 9.63622 8.97651 10.1081 9L10.0301 8.819L9.54263 7.679C9.1068 6.664 8.5101 5 9.59235 5Z"
										stroke="currentColor"
										stroke-width="1.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path
										d="M13.2983 9.75C13.7125 9.75 14.0483 9.41421 14.0483 9C14.0483 8.58579 13.7125 8.25 13.2983 8.25V9.75ZM10.1081 8.25C9.69391 8.25 9.35812 8.58579 9.35812 9C9.35812 9.41421 9.69391 9.75 10.1081 9.75V8.25ZM15.9776 8.64988C16.3365 8.44312 16.4599 7.98455 16.2531 7.62563C16.0463 7.26671 15.5878 7.14336 15.2289 7.35012L15.9776 8.64988ZM13.3656 8.843L13.5103 9.57891L13.5125 9.57848L13.3656 8.843ZM10.0301 8.819L10.1854 8.08521L10.1786 8.08383L10.0301 8.819ZM8.166 7.34357C7.80346 7.14322 7.34715 7.27469 7.1468 7.63722C6.94644 7.99976 7.07791 8.45607 7.44045 8.65643L8.166 7.34357ZM13.2983 8.25H10.1081V9.75H13.2983V8.25ZM15.2289 7.35012C14.6019 7.71128 13.9233 7.96683 13.2187 8.10752L13.5125 9.57848C14.3778 9.40568 15.2101 9.09203 15.9776 8.64988L15.2289 7.35012ZM13.2209 8.10709C12.2175 8.30441 11.1861 8.29699 10.1854 8.08525L9.87486 9.55275C11.0732 9.80631 12.3086 9.81521 13.5103 9.57891L13.2209 8.10709ZM10.1786 8.08383C9.47587 7.94196 8.79745 7.69255 8.166 7.34357L7.44045 8.65643C8.20526 9.0791 9.02818 9.38184 9.88169 9.55417L10.1786 8.08383Z"
										fill="currentColor"
									/>
								</svg>
							</span>
							<span class="action-button-label">Saque extra</span>
						</button>
					</div>
				</article>
			</section>
		</section>

		<section v-else-if="hasSelectedPeriod" class="empty-card">
			<h3>Nenhum ativo cadastrado.</h3>
			<p>Cadastre ativos na aba Ativos para começar a montar os cards da Home.</p>
		</section>

		<section v-else class="empty-card">
			<p class="eyebrow">Período</p>
			<h3>Nenhum mês criado.</h3>
			<p>Use o botão de adicionar para escolher o primeiro mês da carteira.</p>
		</section>
		<div v-if="isActionModalOpen" class="modal-backdrop" @click="closeActionModal">
				<div class="modal-card home-action-modal" @click.stop>
					<header class="modal-header">
						<h2>{{ currentActionConfig?.title }}</h2>
						<p v-if="currentActionConfig?.description">{{ currentActionConfig.description }}</p>
					</header>

				<div class="modal-summary-grid">
					<div class="summary-field">
						<span>Ativo</span>
						<strong>{{ actionModalState.assetName }}</strong>
					</div>

					<div class="summary-field">
						<span>Período</span>
						<strong>{{ periodLabel || "--" }}</strong>
					</div>
				</div>

				<div class="modal-grid">
					<div class="field-group" :class="{ 'field-group-full': isUpdateAction }">
						<label class="field-label" for="home-action-date">Data</label>
						<input
							id="home-action-date"
							v-model="actionForm.date"
							:class="['text-input', { 'required-empty': isDateMissing }]"
							type="date"
						/>
						<div
							v-if="isDateMissing"
							class="error-text error-text-reserved"
						>
							{{ isDateMissing ? "Informe a data." : " " }}
						</div>
					</div>

					<div v-if="isUpdateAction" class="field-group">
						<label class="field-label" for="home-liquid-balance">Saldo líquido atual</label>
						<input
							id="home-liquid-balance"
							:value="liquidBalanceInput"
							:class="['text-input', { 'required-empty': isLiquidBalanceMissing }]"
							type="text"
							inputmode="decimal"
							placeholder="R$ 0,00"
							@keydown="handleCurrencyKeydown"
							@focus="handleCurrencyFocus($event, 'liquidBalance')"
							@input="handleCurrencyInput($event, 'liquidBalance')"
							@blur="handleCurrencyBlur('liquidBalance')"
						/>
						<div v-if="isLiquidBalanceMissing" class="error-text">Informe um saldo líquido maior que zero.</div>
					</div>

					<div v-if="isUpdateAction" class="field-group">
						<label class="field-label" for="home-gross-balance">Saldo bruto atual</label>
						<input
							id="home-gross-balance"
							:value="grossBalanceInput"
							:class="['text-input', { 'required-empty': isGrossBalanceMissing }]"
							type="text"
							inputmode="decimal"
							placeholder="R$ 0,00"
							@keydown="handleCurrencyKeydown"
							@focus="handleCurrencyFocus($event, 'grossBalance')"
							@input="handleCurrencyInput($event, 'grossBalance')"
							@blur="handleCurrencyBlur('grossBalance')"
						/>
						<div v-if="isGrossBalanceMissing" class="error-text">Informe um saldo bruto maior que zero.</div>
					</div>

					<div v-if="shouldShowNoteField" class="field-group field-group-full">
						<label class="field-label" for="home-action-note">{{ currentActionConfig?.noteLabel }}</label>
						<input
							id="home-action-note"
							v-model.trim="actionForm.note"
							:class="['text-input', { 'required-empty': isNoteMissing }]"
							type="text"
							maxlength="120"
							:placeholder="currentActionConfig?.notePlaceholder"
						/>
						<div v-if="isNoteMissing" class="error-text">
							{{ actionModalState.type === "contribution" ? "Informe o motivo do aporte." : "Informe o motivo do saque." }}
						</div>
					</div>

					<div v-if="shouldShowAmountField" class="field-group" :class="{ 'field-group-full': isUpdateAction }">
						<label class="field-label" for="home-action-amount">{{ currentActionConfig?.amountLabel }}</label>
						<div class="currency-input-group">
							<div class="currency-input-shell">
								<input
									id="home-action-amount"
									:value="amountInput"
									:class="['text-input', { 'required-empty': isAmountMissing }]"
									type="text"
									inputmode="decimal"
									:placeholder="currentActionConfig?.amountPlaceholder"
									@keydown="handleCurrencyKeydown"
									@focus="handleCurrencyFocus($event, 'amount')"
									@input="handleCurrencyInput($event, 'amount')"
									@blur="handleCurrencyBlur('amount')"
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
									<label class="field-label" for="home-calculator-input">Fórmula</label>
									<div class="calculator-preview" aria-live="polite">{{ calculatorPreviewText }}</div>
									<input
										id="home-calculator-input"
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
						<div
							v-if="isAmountMissing || (isUpdateAction ? shouldReserveAmountErrorSpace : shouldReserveDateAmountErrorSpace)"
							class="error-text error-text-reserved"
							:class="{ 'is-hidden': !isAmountMissing }"
						>
							{{ isAmountMissing ? "Informe um valor maior que zero." : " " }}
						</div>
					</div>
				</div>

				<p v-if="errorMessage" class="error-text modal-error">{{ errorMessage }}</p>

				<div class="modal-actions">
					<button class="primary-button" type="button" :disabled="isSubmitting" @click="submitAction">
						{{ currentActionConfig?.confirmLabel || "Salvar" }}
					</button>
					<button class="danger-button" type="button" :disabled="isSubmitting" @click="closeActionModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.home-view {
	display: grid;
	gap: 22px;
	width: 100%;
}

.filter-card,
.wallet-card,
.asset-card,
.entry-value-card,
.metric-card,
.empty-card,
.modal-card {
	border: 1px solid var(--glass-border);
	border-radius: 22px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.filter-card {
	position: relative;
	z-index: 12;
	overflow: visible;
	display: grid;
	padding: 16px;
}

.filter-row {
	position: relative;
	z-index: 2;
	display: flex;
	gap: 12px;
	align-items: center;
	flex-wrap: nowrap;
	width: 100%;
}

.filter-selects {
	position: relative;
	z-index: 3;
	display: flex;
	gap: 12px;
	align-items: center;
	flex: 1 1 auto;
	min-width: 0;
}

.filter-spacer {
	flex: 1 1 auto;
	min-width: 0;
}

.filter-actions {
	display: flex;
	gap: 12px;
	align-items: center;
	justify-content: flex-end;
	flex: 0 0 auto;
}

.filter-row button {
	width: 36px;
	height: 36px;
	min-height: 0;
	min-width: 36px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 36px;
	padding: 0;
	border: 1px solid var(--theme-button-border);
	border-radius: 50%;
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
}

.filter-row button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.filter-actions button svg,
.filter-actions button svg * {
	fill: currentColor !important;
	stroke: currentColor !important;
}

.filter-actions .delete-icon-svg,
.filter-actions .delete-icon-svg * {
	fill: currentColor !important;
	stroke: none !important;
}

.filter-actions button svg {
	display: block;
	width: 23px;
	height: 23px;
	margin: auto;
}

.filter-row .danger-button,
.filter-row .month-remove-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
}

.year-filter {
	flex: 0 0 112px;
	min-width: 112px;
	max-width: 124px;
	height: 36px;
}

.month-filter {
	flex: 1;
	min-width: 0;
	height: 36px;
}

.wallet-card {
	position: sticky;
	top: 12px;
	z-index: 8;
	display: grid;
	gap: 28px;
	padding: 34px 32px 28px;
	width: 100%;
	justify-items: center;
	background:
		radial-gradient(circle at top center, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 38%),
		linear-gradient(
			180deg,
			color-mix(in srgb, var(--color-primary) 10%, var(--surface-elevated)) 0%,
			color-mix(in srgb, var(--glass-surface-strong) 94%, var(--surface-elevated)) 100%
		);
	border-color: color-mix(in srgb, var(--color-primary) 26%, var(--glass-border));
	box-shadow:
		0 22px 44px color-mix(in srgb, var(--color-primary) 10%, rgba(8, 17, 31, 0.16)),
		inset 0 1px 0 var(--glass-highlight);
	transition:
		padding 0.22s ease,
		gap 0.22s ease,
		border-radius 0.22s ease,
		transform 0.22s ease,
		box-shadow 0.22s ease;
}

.wallet-card-compact {
	gap: 14px;
	padding: 18px 20px 16px;
	border-radius: 18px;
}

.wallet-card-main {
	display: grid;
	gap: 6px;
	justify-items: center;
	text-align: center;
	width: 100%;
}

.wallet-label {
	margin: 0;
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.wallet-total {
	font-size: clamp(2.6rem, 5.2vw, 4.7rem);
	line-height: 1;
	letter-spacing: -0.06em;
	color: var(--text-h);
	transition: font-size 0.22s ease;
}

.wallet-card-compact .wallet-total {
	font-size: clamp(1.8rem, 3.6vw, 2.5rem);
}

.wallet-asset-list {
	display: grid;
	gap: 8px;
	list-style: none;
	padding: 0;
	margin: 0;
	width: min(100%, 460px);
}

.wallet-card-compact .wallet-asset-list {
	gap: 6px;
}

.wallet-asset-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding-top: 8px;
}

.wallet-card-compact .wallet-asset-row {
	padding-top: 4px;
}

.wallet-asset-info {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.wallet-asset-dot {
	width: 12px;
	height: 12px;
	flex: 0 0 12px;
	border-radius: 50%;
	background: var(--asset-color, var(--color-primary));
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--asset-color, var(--color-primary)) 16%, transparent);
}

.wallet-asset-name {
	min-width: 0;
	font-size: 1.05rem;
	font-weight: 500;
	color: var(--text-h);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.wallet-asset-value {
	font-size: 1rem;
	color: var(--text);
	white-space: nowrap;
}

.wallet-empty-state {
	padding-top: 8px;
	color: var(--text);
}

.asset-panel {
	position: relative;
	display: grid;
	gap: 12px;
	padding: 14px;
	padding: 16px;
	border: 1px solid var(--border);
	border-radius: 12px;
	background: var(--bg);
	box-shadow: var(--shadow);
}

.asset-title-row h3,
.empty-card h3 {
	margin: 0;
	color: var(--text-h);
}

.entry-value-card,
.metric-card {
	display: grid;
	gap: 8px;
	padding: 16px 18px;
	border-radius: 16px;
}

.entry-value-card span,
.metric-card span {
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.entry-value-card strong,
.metric-card strong {
	font-size: clamp(1.15rem, 2vw, 1.8rem);
	line-height: 1.1;
	color: var(--text-h);
}

.asset-list {
	display: grid;
	gap: 18px;
}

.asset-card {
	position: relative;
	display: grid;
	gap: 18px;
	width: 100%;
	min-width: 0;
	padding: 18px;
	border: 1px solid var(--glass-border);
	border-radius: 24px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
	-webkit-backdrop-filter: blur(22px);
	box-sizing: border-box;
}

.asset-card-top {
	display: flex;
	align-items: stretch;
	justify-content: space-between;
	gap: 18px;
}

.asset-identity {
	display: grid;
	gap: 0;
	flex: 1 1 auto;
}

.asset-title-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

.asset-title-band {
	width: 100%;
	padding: 0;
	border: 1px solid color-mix(in srgb, var(--asset-color, var(--color-primary)) 18%, var(--glass-border-strong));
	border-radius: 16px;
	background:
		linear-gradient(
			180deg,
			color-mix(in srgb, var(--asset-color, var(--color-primary)) 18%, var(--glass-surface-strong)) 0%,
			color-mix(in srgb, var(--asset-color, var(--color-primary)) 8%, var(--surface-elevated)) 100%
		);
	box-shadow:
		inset 0 1px 0 var(--glass-highlight),
		0 8px 16px color-mix(in srgb, var(--asset-color, var(--color-primary)) 10%, rgba(8, 17, 31, 0.12));
	backdrop-filter: blur(18px);
	-webkit-backdrop-filter: blur(18px);
}

.asset-title-row-surface {
	padding: 14px 16px;
	border-radius: 16px;
	background: transparent;
}

.asset-color-dot {
	width: 12px;
	height: 12px;
	flex: 0 0 12px;
	border-radius: 50%;
	background: var(--asset-color, #4F7CFF);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--asset-color, #4F7CFF) 16%, transparent);
}

.asset-info-table {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0;
	border: 1px solid rgba(255, 255, 255, 0.04);
	border-radius: 14px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.02);
}

.asset-info-row {
	display: grid;
	gap: 6px;
	padding: 12px 14px;
	border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.asset-info-row:last-child {
	border-right: 0;
}

.asset-info-label {
	font-size: 0.78rem;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.asset-info-value {
	color: var(--text-h);
}

.entry-value-card {
	min-width: 230px;
	background: rgba(255, 255, 255, 0.02);
	border-color: rgba(255, 255, 255, 0.04);
	align-self: stretch;
}

.home-metrics-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.asset-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.action-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: 14px 18px;
	border-radius: 999px;
	border: 1px solid rgba(255, 255, 255, 0.08);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%),
		rgba(24, 28, 38, 0.88);
	color: var(--text-soft);
	font-size: 1.02rem;
	font-weight: 700;
	cursor: pointer;
	opacity: 0.96;
	transition:
		transform 0.18s ease,
		opacity 0.18s ease,
		border-color 0.18s ease,
		background 0.18s ease,
		color 0.18s ease;
}

.action-button:hover:not(:disabled) {
	transform: translateY(-1px);
	opacity: 1;
}

.action-button:focus-visible {
	outline: none;
	box-shadow: 0 0 0 4px var(--input-focus-ring);
}

.action-button:disabled {
	cursor: not-allowed;
	opacity: 0.58;
	transform: none;
}

.action-button-icon {
	display: none;
	width: 26px;
	height: 26px;
	align-items: center;
	justify-content: center;
	flex: 0 0 26px;
}

.action-button-icon svg {
	width: 26px;
	height: 26px;
	display: block;
	color: currentColor;
	stroke: currentColor;
	stroke-width: 1.45;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.action-button-icon-svg-bag {
	transform: scale(1.12);
	transform-origin: center;
}

.asset-actions button svg [stroke]:not([stroke="none"]) {
	stroke: currentColor !important;
}

.asset-actions button svg [fill]:not([fill="none"]) {
	fill: currentColor !important;
}

.action-button-label {
	display: inline-block;
}

.action-button-primary {
	border-color: color-mix(in srgb, var(--color-primary) 44%, transparent);
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--glass-surface-strong) 78%, transparent);
	color: var(--text-h);
}

.action-button-secondary {
	border-color: color-mix(in srgb, var(--color-primary) 22%, var(--theme-button-border));
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 8%, transparent) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-bg);
	color: color-mix(in srgb, var(--color-primary) 28%, var(--text-h));
}

.action-button-danger {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
}

.metric-card {
	background: rgba(255, 255, 255, 0.02);
	border: 1px solid rgba(255, 255, 255, 0.04);
}

.empty-card {
	display: grid;
	gap: 10px;
	padding: 22px;
}

.empty-card p {
	color: var(--text);
	line-height: 1.6;
}

.eyebrow {
	margin: 0;
	font-size: 0.8rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.modal-backdrop {
	position: fixed;
	inset: 0;
	z-index: 40;
	display: grid;
	place-items: center;
	padding: 24px;
	background: rgba(5, 10, 20, 0.62);
	backdrop-filter: blur(8px);
}

.home-action-modal {
	width: min(100%, 580px);
	display: grid;
	gap: 18px;
	padding: 24px;
	border-radius: 24px;
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--glass-surface-strong) 94%, transparent) 0%, var(--glass-surface) 100%);
}

.modal-header {
	display: grid;
	gap: 6px;
}

.modal-header h2 {
	margin: 0;
	color: var(--text-h);
}

.modal-header p,
.field-note {
	margin: 0;
	font-size: 12px;
	line-height: 1.4;
	color: var(--text-soft);
}

.modal-summary-grid,
.modal-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.summary-field,
.field-group {
	display: grid;
	gap: 8px;
}

.summary-field {
	padding: 14px 16px;
	border: 1px solid var(--glass-border);
	border-radius: 18px;
	background: color-mix(in srgb, var(--glass-surface-strong) 82%, transparent);
}

.summary-field span,
.field-label {
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.summary-field strong {
	color: var(--text-h);
}

.field-group-full {
	grid-column: 1 / -1;
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

.text-input:focus-visible {
	border-color: var(--input-focus-border);
	box-shadow: 0 0 0 4px var(--input-focus-ring);
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

.field-group:has(.required-empty) .field-label {
	color: var(--validation-error-text);
}

.required-empty:focus-visible {
	border-color: var(--validation-error-border);
	box-shadow:
		0 0 0 3px var(--validation-error-ring),
		inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.error-text-reserved {
	min-height: 18px;
}

.error-text-reserved.is-hidden {
	visibility: hidden;
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
	transform: translateY(-50%);
	color: color-mix(in srgb, var(--input-text) 72%, transparent);
}

.calculator-toggle:hover,
.calculator-toggle.is-open {
	transform: translateY(-50%);
	color: var(--text-h);
	border: 0;
	background: transparent;
	box-shadow: none;
}

.calculator-toggle svg {
	width: 18px;
	height: 18px;
	fill: none;
	stroke: currentColor;
	stroke-width: 1.8;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.calculator-popover {
	position: fixed;
	top: 50%;
	left: 50%;
	bottom: auto;
	z-index: 60;
	display: grid;
	gap: 8px;
	width: min(360px, calc(100vw - 56px));
	padding: 14px;
	border: 1px solid var(--glass-border-strong);
	border-radius: 18px;
	background:
		linear-gradient(180deg, var(--glass-highlight) 0%, transparent 100%),
		var(--glass-surface-strong);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
	transform: translate(-50%, -50%);
}

.calculator-preview {
	padding-top: 2px;
	padding-bottom: 2px;
	border-top: 1px solid color-mix(in srgb, var(--glass-border-strong) 88%, transparent);
	color: color-mix(in srgb, var(--text-soft) 78%, #000);
	font-size: 13px;
	font-style: italic;
}

.calculator-popover-actions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: 10px;
}

.calculator-apply-button {
	min-width: 96px;
}

.error-text {
	color: var(--validation-error-text);
	font-size: 13px;
}

.modal-error {
	margin: 0;
}

.modal-actions {
	display: flex;
	justify-content: flex-start;
	gap: 10px;
}

.primary-button,
.danger-button {
	min-height: 48px;
	padding: 0 18px;
	border: 1px solid transparent;
	border-radius: 16px;
	font: inherit;
	font-weight: 700;
	cursor: pointer;
	transition:
		transform 0.18s ease,
		opacity 0.18s ease,
		border-color 0.18s ease,
		background 0.18s ease,
		color 0.18s ease;
}

.primary-button {
	border-color: color-mix(in srgb, var(--color-primary) 24%, var(--glass-border));
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--glass-surface-strong) 90%, transparent);
	color: var(--text-h);
}

.danger-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
}

.primary-button:hover:not(:disabled),
.danger-button:hover:not(:disabled) {
	transform: translateY(-1px);
}

.primary-button:focus-visible,
.danger-button:focus-visible {
	outline: none;
	box-shadow: 0 0 0 4px var(--input-focus-ring);
}

.primary-button:disabled,
.danger-button:disabled {
	cursor: not-allowed;
	opacity: 0.58;
	transform: none;
}

@media (max-width: 1023px) {
	.asset-card-top,
	.home-metrics-grid {
		grid-template-columns: 1fr;
		display: grid;
	}

	.entry-value-card {
		min-width: 0;
	}

	.asset-info-table {
		grid-template-columns: 1fr;
	}

	.asset-info-row {
		border-right: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--asset-color, var(--glass-border)) 14%, var(--glass-border));
	}

	.asset-info-row:last-child {
		border-bottom: 0;
	}

	.wallet-card {
		top: 10px;
	}
}

@media (max-width: 640px) {
	.filter-row {
		align-items: center;
		flex-wrap: nowrap;
		gap: 6px;
	}

	.filter-spacer {
		display: none;
	}

	.filter-selects {
		display: flex;
		flex-wrap: nowrap;
		gap: 6px;
		flex: 1 1 auto;
		min-width: 0;
	}

	.filter-selects > .year-filter {
		flex: 0 0 72px;
		width: 72px;
		min-width: 72px;
		height: 32px;
		font-size: 12px;
		--app-select-min-height: 32px;
	}

	.filter-selects > .month-filter {
		flex: 1;
		min-width: 0;
		height: 32px;
		font-size: 12px;
		--app-select-min-height: 32px;
	}

	.filter-selects :deep(.app-select__trigger) {
		height: 100%;
		min-height: var(--app-select-min-height, 32px);
		padding: 4px 32px 4px 8px;
		font-size: inherit;
	}

	.filter-selects :deep(.app-select__chevron) {
		width: 14px;
		height: 14px;
	}

	.filter-actions {
		display: flex;
		gap: 6px;
		flex: 0 0 auto;
		margin-left: auto;
	}

	.filter-row button {
		width: 32px !important;
		height: 32px !important;
		min-width: 32px !important;
		flex: 0 0 32px !important;
	}

	.filter-actions button svg {
		width: 16px;
		height: 16px;
	}

	.wallet-card,
	.asset-panel,
	.asset-card,
	.entry-value-card,
	.metric-card,
	.empty-card {
		padding: 18px;
	}

	.wallet-total {
		font-size: 2.3rem;
	}

	.asset-identity {
		display: none;
	}

	.asset-card-top {
		gap: 12px;
	}

	.asset-actions {
		flex-wrap: nowrap;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.action-button {
		width: calc((100% - 24px) / 4);
		max-width: 60px;
		min-width: 0;
		flex: 0 1 calc((100% - 24px) / 4);
		aspect-ratio: 1;
		padding: 0;
		display: grid;
		place-items: center;
		border-radius: 999px;
		gap: 0;
	}

	.action-button-icon {
		display: inline-grid;
		place-items: center;
		width: 30px;
		height: 30px;
		flex-basis: 30px;
	}

	.action-button-icon svg {
		width: 30px;
		height: 30px;
	}

	.action-button-label {
		display: none;
	}

	.modal-backdrop {
		padding: 16px;
	}

	.home-action-modal,
	.modal-summary-grid,
	.modal-grid {
		grid-template-columns: 1fr;
	}

	.home-action-modal {
		padding: 18px;
	}

	.modal-actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (min-width: 1024px) {
	.filter-selects > .year-filter {
		width: 280px !important;
		flex: 0 0 280px !important;
		min-width: 280px !important;
		height: 48px;
		--app-select-min-height: 48px;
	}

	.filter-selects > .month-filter {
		flex: 1;
		min-width: 320px;
		height: 48px;
		--app-select-min-height: 48px;
	}

	.filter-selects :deep(.app-select__trigger) {
		height: 100%;
		min-height: var(--app-select-min-height, 48px);
	}

	.filter-row button {
		width: 48px;
		height: 48px;
		flex: 0 0 48px;
	}
}
</style>
