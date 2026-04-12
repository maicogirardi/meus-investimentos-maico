<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const props = defineProps({
	assets: {
		type: Array,
		default: () => [],
	},
	selectedPeriodLabel: {
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
});

const emit = defineEmits(["create-asset", "update-asset", "delete-asset"]);

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const isCreateModalOpen = ref(false);
const pendingSubmitMode = ref("");
const editingAssetId = ref("");
const activeCalculatorField = ref("");
const calculatorExpression = ref("");
const calculatorError = ref("");
const calculatorExpressionInputRef = ref(null);
const assetInitialValueInput = ref(formatCurrency(0));
const shouldShowValidation = ref(false);
const assetForm = reactive({
	name: "",
	institution: "",
	category: "",
	startDate: "",
	color: "#4F7CFF",
	initialValue: 0,
});

const summary = computed(() => ({
	count: props.assets.length,
	totalInitialValue: props.assets.reduce((total, asset) => total + Number(asset.initialValue || 0), 0),
}));
const isEditingAsset = computed(() => Boolean(editingAssetId.value));
const modalTitle = computed(() => (isEditingAsset.value ? "Editar ativo" : "Novo ativo"));
const submitButtonLabel = computed(() => "Salvar");
const isNameMissing = computed(() => shouldShowValidation.value && !assetForm.name.trim());
const isStartDateMissing = computed(() => shouldShowValidation.value && !assetForm.startDate);
const isInitialValueMissing = computed(() => shouldShowValidation.value && assetForm.initialValue <= 0);
const shouldReserveDateValueErrorSpace = computed(() => isStartDateMissing.value || isInitialValueMissing.value);
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
		if (!wasSubmitting || isSubmitting || !pendingSubmitMode.value) {
			return;
		}

		if (props.errorMessage) {
			pendingSubmitMode.value = "";
			return;
		}

		finalizeModalClose();
	},
);

watch(
	() => props.errorMessage,
	(value) => {
		if (value) {
			pendingSubmitMode.value = "";
		}
	},
);

function formatCurrency(value) {
	return currencyFormatter.format(Number(value || 0));
}

function generateRandomAssetColor() {
	const hue = Math.floor(Math.random() * 360);
	const saturation = 70 + Math.floor(Math.random() * 18);
	const lightness = 54 + Math.floor(Math.random() * 10);
	return hslToHex(hue, saturation, lightness);
}

function normalizeAssetColor(value) {
	const normalized = String(value || "").trim().toUpperCase();
	return /^#[\dA-F]{6}$/.test(normalized) ? normalized : "#4F7CFF";
}

function hslToHex(hue, saturation, lightness) {
	const normalizedSaturation = saturation / 100;
	const normalizedLightness = lightness / 100;
	const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
	const hueSection = hue / 60;
	const secondComponent = chroma * (1 - Math.abs((hueSection % 2) - 1));
	let red = 0;
	let green = 0;
	let blue = 0;

	if (hueSection >= 0 && hueSection < 1) {
		red = chroma;
		green = secondComponent;
	} else if (hueSection < 2) {
		red = secondComponent;
		green = chroma;
	} else if (hueSection < 3) {
		green = chroma;
		blue = secondComponent;
	} else if (hueSection < 4) {
		green = secondComponent;
		blue = chroma;
	} else if (hueSection < 5) {
		red = secondComponent;
		blue = chroma;
	} else {
		red = chroma;
		blue = secondComponent;
	}

	const match = normalizedLightness - chroma / 2;
	const toHex = (value) => Math.round((value + match) * 255).toString(16).padStart(2, "0");

	return `#${toHex(red)}${toHex(green)}${toHex(blue)}`.toUpperCase();
}

function formatDate(value) {
	if (!value) {
		return "Data não informada";
	}

	const [year, month, day] = String(value).split("-");
	if (!year || !month || !day) {
		return value;
	}

	return new Intl.DateTimeFormat("pt-BR").format(new Date(Number(year), Number(month) - 1, Number(day)));
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

function setCurrencyInput(value) {
	assetForm.initialValue = Number(value ?? 0);
	assetInitialValueInput.value = formatCurrency(assetForm.initialValue);
}

function closeCalculator() {
	activeCalculatorField.value = "";
	calculatorExpression.value = "";
	calculatorError.value = "";
}

function formatCalculatorInitialValue(value) {
	const numericValue = Number(value ?? 0);
	if (!Number.isFinite(numericValue)) {
		return "";
	}

	return numericValue.toFixed(2).replace(".", ",");
}

function resetForm() {
	assetForm.name = "";
	assetForm.institution = "";
	assetForm.category = "";
	assetForm.startDate = "";
	assetForm.color = generateRandomAssetColor();
	setCurrencyInput(0);
	editingAssetId.value = "";
	shouldShowValidation.value = false;
	closeCalculator();
}

function finalizeModalClose() {
	pendingSubmitMode.value = "";
	isCreateModalOpen.value = false;
	resetForm();
}

function openCreateModal() {
	resetForm();
	isCreateModalOpen.value = true;
	void nextTick(() => {
		shouldShowValidation.value = true;
	});
}

function openEditModal(asset) {
	resetForm();
	editingAssetId.value = asset.id || "";
	assetForm.name = String(asset.name || "");
	assetForm.institution = String(asset.institution || "");
	assetForm.category = String(asset.category || "");
	assetForm.startDate = String(asset.startDate || "");
	assetForm.color = normalizeAssetColor(asset.color);
	setCurrencyInput(Number(asset.initialValue || 0));
	isCreateModalOpen.value = true;
	void nextTick(() => {
		shouldShowValidation.value = true;
	});
}

function closeCreateModal() {
	if (props.isSubmitting) {
		return;
	}

	finalizeModalClose();
}

function syncAssetColorInput(event) {
	const target = event?.target instanceof HTMLInputElement ? event.target : null;
	if (!target) {
		return;
	}

	const sanitized = target.value.toUpperCase().replace(/[^#A-F0-9]/g, "");
	const normalized = sanitized.startsWith("#") ? sanitized : `#${sanitized.replace(/^#/, "")}`;
	assetForm.color = normalized.slice(0, 7);
	target.value = assetForm.color;
}

function hasFormErrors() {
	return !assetForm.name.trim() || !assetForm.startDate || assetForm.initialValue <= 0;
}

function syncCurrencyInput(event) {
	const target = event?.target instanceof HTMLInputElement ? event.target : null;
	const rawValue = target?.value ?? "";
	const normalizedInput = normalizeCurrencyText(rawValue);
	const parsedValue = parseCurrencyInput(normalizedInput);
	const displayValue = normalizedInput ? `R$ ${normalizedInput}` : "R$ ";

	assetForm.initialValue = parsedValue;
	assetInitialValueInput.value = displayValue;

	if (target && target.value !== displayValue) {
		target.value = displayValue;
	}
}

function handleCurrencyInput(event) {
	if (activeCalculatorField.value === "initialValue") {
		calculatorExpression.value = "";
		calculatorError.value = "";
	}

	syncCurrencyInput(event);
}

function toggleCalculator() {
	if (activeCalculatorField.value === "initialValue") {
		closeCalculator();
		return;
	}

	activeCalculatorField.value = "initialValue";
	calculatorExpression.value = formatCalculatorInitialValue(assetForm.initialValue);
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

		setCurrencyInput(result);
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

function handleInitialValueFocus(event) {
	const target = event?.target;

	if (assetForm.initialValue === 0) {
		assetInitialValueInput.value = "R$ ";

		if (target instanceof HTMLInputElement) {
			target.value = "R$ ";
			requestAnimationFrame(() => {
				target.setSelectionRange(target.value.length, target.value.length);
			});
		}
	}
}

function handleInitialValueBlur() {
	setCurrencyInput(assetForm.initialValue);
}

function handleCurrencyKeydown(event) {
	const allowedKeys = [
		"Backspace",
		"Delete",
		"Tab",
		"Enter",
		"Escape",
		"ArrowLeft",
		"ArrowRight",
		"ArrowUp",
		"ArrowDown",
		"Home",
		"End",
	];

	if (
		event.ctrlKey ||
		event.metaKey ||
		allowedKeys.includes(event.key) ||
		/^\d$/.test(event.key) ||
		event.key === ","
	) {
		return;
	}

	event.preventDefault();
}

function submitAsset() {
	if (hasFormErrors()) {
		return;
	}

	const payload = {
		name: assetForm.name,
		institution: assetForm.institution,
		category: assetForm.category,
		startDate: assetForm.startDate,
		color: normalizeAssetColor(assetForm.color),
		initialValue: assetForm.initialValue,
	};

	if (isEditingAsset.value) {
		emit("update-asset", {
			id: editingAssetId.value,
			...payload,
		});
		pendingSubmitMode.value = "edit";
		return;
	}

	emit("create-asset", payload);
	pendingSubmitMode.value = "create";
}

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

function handleModalKeydown(event) {
	if (!isCreateModalOpen.value || props.isSubmitting) {
		return;
	}

	if (event.key === "Escape") {
		event.preventDefault();

		if (activeCalculatorField.value === "initialValue") {
			closeCalculator();
			return;
		}

		closeCreateModal();
		return;
	}

	if (event.key !== "Enter" || event.shiftKey || isKeyboardShortcutTargetBlocked()) {
		return;
	}

	event.preventDefault();
	submitAsset();
}

onMounted(() => {
	window.addEventListener("keydown", handleModalKeydown);
});

onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleModalKeydown);
});
</script>

<template>
	<section class="assets-view">
		<section class="hero-card">
			<div class="hero-copy">
				<p class="eyebrow">Cadastro</p>
				<h2>Adicionar ativos</h2>
			</div>

			<div class="hero-side">
				<div class="period-badge" :class="{ muted: !hasSelectedPeriod }">
					<span>Período ativo</span>
					<strong>{{ hasSelectedPeriod ? selectedPeriodLabel : "Selecione um mês na Home" }}</strong>
				</div>

				<button class="primary-button" type="button" :disabled="isSubmitting || !hasSelectedPeriod" @click="openCreateModal">
					<span class="button-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none">
							<path d="M12 5v14M5 12h14" />
						</svg>
					</span>
					Adicionar ativo
				</button>
			</div>
		</section>

		<section class="summary-grid">
			<article class="summary-card">
				<span class="summary-label">Ativos cadastrados</span>
				<strong>{{ summary.count }}</strong>
			</article>

			<article class="summary-card">
				<span class="summary-label">Capital inicial somado</span>
				<strong>{{ formatCurrency(summary.totalInitialValue) }}</strong>
			</article>
		</section>

		<p v-if="errorMessage" class="feedback-error">{{ errorMessage }}</p>

		<section v-if="assets.length > 0" class="asset-list">
			<article v-for="asset in assets" :key="asset.id" class="asset-card">
				<div class="asset-main">
					<div class="asset-header">
						<div class="asset-title-block">
							<div class="asset-title-row">
								<span class="asset-color-dot" :style="{ '--asset-color': asset.color || '#4F7CFF' }" />
								<h3>{{ asset.name }}</h3>
							</div>
							<p>{{ formatCurrency(asset.initialValue) }}</p>
						</div>

						<div class="asset-actions">
							<button
								class="icon-button asset-action-button asset-action-button-edit"
								type="button"
								aria-label="Editar ativo"
								:disabled="isSubmitting"
								@click="openEditModal(asset)"
							>
								<span class="button-icon button-icon-edit" aria-hidden="true">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
										<path d="m4 20 4.2-1 9.5-9.5a2.12 2.12 0 1 0-3-3L5.2 16 4 20Z" />
										<path d="m13.5 7.5 3 3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
									</svg>
								</span>
							</button>

							<button
								class="danger-button icon-button asset-action-button asset-action-button-delete"
								type="button"
								aria-label="Excluir ativo"
								:disabled="isSubmitting"
								@click="$emit('delete-asset', asset)"
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
					</div>

					<div class="asset-info-table" :style="{ '--asset-color': asset.color || '#4F7CFF' }">
						<div class="asset-info-row">
							<span class="asset-info-label">Categoria</span>
							<strong class="asset-info-value">{{ asset.category || "--" }}</strong>
						</div>

						<div class="asset-info-row">
							<span class="asset-info-label">Instituição</span>
							<strong class="asset-info-value">{{ asset.institution || "--" }}</strong>
						</div>

						<div class="asset-info-row">
							<span class="asset-info-label">Início</span>
							<strong class="asset-info-value">{{ formatDate(asset.startDate) }}</strong>
						</div>
					</div>
				</div>
			</article>
		</section>

		<section v-else class="empty-card">
			<p class="eyebrow">Primeiro passo</p>
			<h2>Nenhum ativo cadastrado ainda.</h2>
			<p>
				Comece registrando o primeiro ativo da carteira. O app cria automaticamente o estado inicial no mês ativo.
			</p>
		</section>

		<div v-if="isCreateModalOpen" class="modal-backdrop" @click="closeCreateModal">
			<div class="modal-card" @click.stop>
				<header class="modal-header">
					<h2>{{ modalTitle }}</h2>
				</header>

				<div class="modal-grid">
					<div class="field-group field-group-full">
						<label class="field-label" for="asset-name">Nome do ativo</label>
						<input
							id="asset-name"
							v-model.trim="assetForm.name"
							:class="['text-input', { 'required-empty': isNameMissing }]"
							type="text"
							maxlength="80"
							placeholder="Ex.: CDB Itaú 100% CDI"
						/>
						<div v-if="isNameMissing" class="error-text">Informe o nome do ativo.</div>
					</div>

					<div class="field-group">
						<label class="field-label" for="asset-institution">Instituição</label>
						<input
							id="asset-institution"
							v-model.trim="assetForm.institution"
							class="text-input"
							type="text"
							maxlength="50"
							placeholder="Ex.: Itaú"
						/>
					</div>

					<div class="field-group">
						<label class="field-label" for="asset-category">Categoria</label>
						<input
							id="asset-category"
							v-model.trim="assetForm.category"
							class="text-input"
							type="text"
							maxlength="40"
							placeholder="Ex.: CDB"
						/>
					</div>

					<div class="field-group">
						<label class="field-label" for="asset-start-date">Data inicial</label>
						<input
							id="asset-start-date"
							v-model="assetForm.startDate"
							:class="['text-input', { 'required-empty': isStartDateMissing }]"
							type="date"
						/>
						<div
							v-if="isStartDateMissing || shouldReserveDateValueErrorSpace"
							class="error-text error-text-reserved"
							:class="{ 'is-hidden': !isStartDateMissing }"
						>
							{{ isStartDateMissing ? "Informe a data inicial." : " " }}
						</div>
					</div>

					<div class="field-group">
						<label class="field-label" for="asset-initial-value">Valor inicial</label>
						<div class="currency-input-group">
							<div class="currency-input-shell">
								<input
									id="asset-initial-value"
									:value="assetInitialValueInput"
									:class="['text-input', { 'required-empty': isInitialValueMissing }]"
									type="text"
									inputmode="decimal"
									placeholder="R$ 0,00"
									@keydown="handleCurrencyKeydown($event)"
									@focus="handleInitialValueFocus($event)"
									@input="handleCurrencyInput($event)"
									@blur="handleInitialValueBlur"
								/>
								<button
									type="button"
									class="calculator-toggle"
									:class="{ 'is-open': activeCalculatorField === 'initialValue' }"
									aria-label="Abrir calculadora"
									@click="toggleCalculator"
								>
									<svg viewBox="0 0 24 24" aria-hidden="true">
										<path d="M7 3.75h10A2.25 2.25 0 0 1 19.25 6v12A2.25 2.25 0 0 1 17 20.25H7A2.25 2.25 0 0 1 4.75 18V6A2.25 2.25 0 0 1 7 3.75Z" />
										<path d="M8 7.5h8M8.75 11.25h1.5m4.5 0h1.5m-7.5 3h1.5m4.5 0h1.5m-7.5 3h1.5m4.5 0h1.5" />
									</svg>
								</button>

								<div v-if="activeCalculatorField === 'initialValue'" class="calculator-popover">
									<label class="field-label" for="asset-calculator-input">Fórmula</label>
									<div class="calculator-preview" aria-live="polite">{{ calculatorPreviewText }}</div>
									<input
										id="asset-calculator-input"
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
							v-if="isInitialValueMissing || shouldReserveDateValueErrorSpace"
							class="error-text error-text-reserved"
							:class="{ 'is-hidden': !isInitialValueMissing }"
						>
							{{ isInitialValueMissing ? "Informe um valor inicial maior que zero." : " " }}
						</div>
					</div>

					<div class="field-group field-group-full">
						<label class="field-label" for="asset-color-hex">Cor</label>
						<div class="asset-color-shell">
							<label class="asset-color-picker-button" for="asset-color-picker" :style="{ '--asset-color': assetForm.color || '#4F7CFF' }">
								<span class="asset-color-picker-core" />
							</label>

							<input
								id="asset-color-picker"
								v-model="assetForm.color"
								class="asset-color-picker-native"
								type="color"
							/>

							<input
								id="asset-color-hex"
								:value="assetForm.color"
								class="text-input asset-color-hex-input"
								type="text"
								maxlength="7"
								placeholder="#4F7CFF"
								@input="syncAssetColorInput($event)"
							/>
						</div>
					</div>
				</div>

				<p class="field-note modal-note">O estado mensal inicial será criado em Abril de 2026.</p>

				<div class="modal-actions">
					<button class="primary-button" type="button" :disabled="isSubmitting || hasFormErrors()" @click="submitAsset">
						{{ submitButtonLabel }}
					</button>
					<button class="danger-button" type="button" :disabled="isSubmitting" @click="closeCreateModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.assets-view {
	display: grid;
	gap: 18px;
	width: 100%;
}

.hero-card,
.summary-card,
.asset-card,
.empty-card,
.modal-card {
	border: 1px solid var(--glass-border);
	border-radius: 24px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.hero-card {
	display: grid;
	grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr);
	gap: 18px;
	padding: 22px;
	background:
		radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 20%, transparent) 0%, transparent 48%),
		linear-gradient(180deg, color-mix(in srgb, var(--glass-surface-strong) 96%, transparent) 0%, var(--glass-surface) 100%);
}

.hero-copy {
	display: grid;
	gap: 6px;
	align-content: center;
}

.hero-side {
	display: grid;
	gap: 12px;
	align-content: start;
	justify-items: stretch;
}

.period-badge {
	display: grid;
	gap: 4px;
	padding: 14px 16px;
	border: 1px solid color-mix(in srgb, var(--color-primary) 28%, var(--glass-border-strong));
	border-radius: 18px;
	background: color-mix(in srgb, var(--color-primary) 10%, var(--glass-surface-strong));
}

.period-badge span,
.summary-label,
.eyebrow {
	font-size: 0.8rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.period-badge strong {
	color: var(--text-h);
}

.period-badge.muted {
	border-color: var(--glass-border);
	background: var(--glass-surface-strong);
}

.summary-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16px;
}

.summary-card {
	display: grid;
	gap: 10px;
	padding: 18px;
}

.summary-card strong {
	font-size: clamp(1.6rem, 3.4vw, 2.5rem);
	line-height: 1;
	letter-spacing: -0.05em;
	color: var(--text-h);
}

.feedback-error {
	margin: 0;
	padding: 12px 14px;
	border: 1px solid var(--danger-border);
	border-radius: 16px;
	background: var(--danger-bg);
	color: var(--danger-text);
}

.asset-list {
	display: grid;
	gap: 14px;
}

.asset-card {
	display: grid;
	padding: 18px;
}

.asset-main {
	display: grid;
	gap: 12px;
}

.asset-header {
	display: flex;
	align-items: start;
	justify-content: space-between;
	gap: 12px;
}

.asset-title-block {
	display: grid;
	gap: 6px;
}

.asset-title-row {
	display: flex;
	align-items: center;
	gap: 10px;
}

.asset-color-dot,
.tag-color-dot {
	width: 12px;
	height: 12px;
	flex: 0 0 12px;
	border-radius: 50%;
	background: var(--asset-color, #4F7CFF);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--asset-color, #4F7CFF) 16%, transparent);
}

.asset-title-block h3 {
	margin: 0;
	font-size: 1.15rem;
	color: var(--text-h);
}

.asset-title-block p {
	color: var(--text);
}

.asset-actions {
	display: flex;
	align-items: center;
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

.asset-action-button-edit {
	border-color: color-mix(in srgb, var(--color-primary) 46%, var(--glass-border-strong));
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--color-primary) 18%, var(--glass-surface-strong));
	color: color-mix(in srgb, var(--color-primary) 62%, white);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.asset-action-button-edit:hover {
	border-color: color-mix(in srgb, var(--color-primary) 62%, var(--glass-border-strong));
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--color-primary) 22%, var(--glass-surface-strong));
	color: color-mix(in srgb, var(--color-primary) 42%, white);
}

.asset-action-button-edit:focus-visible {
	border-color: color-mix(in srgb, var(--color-primary) 62%, var(--glass-border-strong));
	box-shadow:
		0 0 0 2px color-mix(in srgb, var(--color-primary) 18%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.asset-action-button-delete {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.asset-action-button-delete:hover {
	border-color: var(--danger-border-strong);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
	color: var(--danger-text);
}

.asset-action-button-delete:focus-visible {
	border-color: var(--danger-border-strong);
	box-shadow:
		0 0 0 2px color-mix(in srgb, var(--danger-text) 14%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.asset-info-table {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0;
	border: 1px solid color-mix(in srgb, var(--asset-color, var(--glass-border)) 16%, var(--glass-border));
	border-radius: 16px;
	overflow: hidden;
	background: color-mix(in srgb, var(--glass-surface-strong) 58%, transparent);
}

.asset-info-row {
	display: grid;
	gap: 6px;
	padding: 12px 14px;
	border-right: 1px solid color-mix(in srgb, var(--asset-color, var(--glass-border)) 14%, var(--glass-border));
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

.empty-card {
	display: grid;
	gap: 10px;
	padding: 24px;
	text-align: center;
	justify-items: center;
}

.empty-card p:last-child {
	max-width: 48ch;
	color: var(--text);
}

.primary-button,
.secondary-button,
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
.secondary-button,
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
.secondary-button:hover,
.icon-button:hover {
	transform: translateY(-1px);
	border-color: var(--theme-button-hover-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-hover-bg);
	color: var(--text-h);
}

.primary-button:focus-visible,
.secondary-button:focus-visible,
.icon-button:focus-visible {
	border-color: color-mix(in srgb, var(--color-primary) 54%, var(--theme-button-hover-border));
	box-shadow:
		0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled,
.icon-button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
	transform: none;
}

.danger-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
}

.danger-button:hover {
	border-color: var(--danger-border-strong);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
	color: var(--danger-text);
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

.button-icon svg {
	color: currentColor;
}

.button-icon svg[fill="white"],
.button-icon svg [fill="white"] {
	fill: currentColor;
}

.button-icon svg [stroke="white"] {
	stroke: currentColor;
}

.button-icon-edit {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 26px;
	height: 26px;
}

.icon-button svg.fill-icon {
	stroke: none;
	fill: currentColor;
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
	display: grid;
	gap: 18px;
	width: min(100%, 640px);
	padding: 22px;
}

.modal-header {
	display: grid;
	gap: 6px;
}

.modal-header p,
.modal-note {
	color: var(--text);
}

.modal-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.field-group {
	display: grid;
	gap: 8px;
	align-content: start;
}

.field-group-full {
	grid-column: 1 / -1;
}

.field-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-h);
}

.asset-color-shell {
	position: relative;
	display: grid;
	grid-template-columns: 58px minmax(0, 1fr);
	gap: 12px;
	align-items: center;
	min-height: 68px;
	padding: 10px 14px;
	border: 1px solid color-mix(in srgb, var(--color-primary) 32%, var(--input-border));
	border-radius: 18px;
	box-shadow:
		0 0 0 1px color-mix(in srgb, var(--color-primary) 8%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.asset-color-picker-button {
	position: relative;
	display: inline-grid;
	place-items: center;
	width: 46px;
	height: 46px;
	border-radius: 50%;
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--asset-color) 24%, transparent) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--glass-surface-strong) 82%, transparent);
	border: 1px solid color-mix(in srgb, var(--asset-color) 34%, var(--glass-border));
	box-shadow:
		0 0 0 3px color-mix(in srgb, var(--asset-color) 18%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.14);
	cursor: pointer;
}

.asset-color-picker-core {
	width: 34px;
	height: 34px;
	border-radius: 50%;
	background: var(--asset-color, #4F7CFF);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.asset-color-picker-native {
	position: absolute;
	opacity: 0;
	pointer-events: none;
}

.asset-color-hex-input {
	min-height: 46px;
	text-transform: uppercase;
}

.text-input {
	width: 100%;
	min-height: 46px;
	padding: 10px 14px;
	border: 1px solid var(--input-border);
	border-radius: 14px;
	box-sizing: border-box;
	background: var(--input-surface);
	color: var(--input-text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	outline: none;
	transition:
		border-color 0.18s ease,
		box-shadow 0.18s ease,
		background-color 0.18s ease,
		color 0.18s ease;
}

.text-input::placeholder {
	color: var(--input-placeholder);
}

.text-input:focus-visible {
	border-color: var(--input-focus-border);
	box-shadow:
		0 0 0 3px var(--input-focus-ring),
		inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.text-input:disabled {
	cursor: not-allowed;
	background: var(--input-disabled-bg);
	color: var(--text-soft);
	opacity: 0.88;
}

.text-input[type="date"]::-webkit-calendar-picker-indicator {
	cursor: pointer;
	filter: opacity(0.72);
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

.field-note {
	font-size: 12px;
	line-height: 1.4;
	color: var(--text-soft);
}

.error-text {
	color: var(--validation-error-text);
	font-size: 13px;
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

.modal-actions {
	display: flex;
	justify-content: flex-start;
	gap: 10px;
}

@media (max-width: 860px) {
	.hero-card {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 640px) {
	.assets-view {
		gap: 14px;
	}

	.hero-card,
	.summary-card,
	.asset-card,
	.empty-card {
		padding: 16px;
		border-radius: 20px;
	}

	.summary-grid,
	.modal-grid {
		grid-template-columns: 1fr;
	}

	.asset-header {
		flex-direction: row;
		align-items: flex-start;
	}

	.asset-title-block {
		min-width: 0;
		flex: 1 1 auto;
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

	.asset-actions {
		justify-content: flex-end;
	}

	.modal-backdrop {
		padding: 14px;
	}

	.modal-card {
		width: 100%;
		padding: 18px;
		border-radius: 22px;
	}

	.calculator-popover {
		width: min(360px, calc(100vw - 28px));
	}

	.modal-actions {
		flex-direction: row;
		align-items: stretch;
	}

	.modal-actions > button {
		flex: 1 1 0;
		min-width: 0;
	}
}
</style>
