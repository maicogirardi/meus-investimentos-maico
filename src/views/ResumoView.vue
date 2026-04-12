<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
	assets: {
		type: Array,
		default: () => [],
	},
	monthlyStates: {
		type: Array,
		default: () => [],
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

const activeAssets = computed(() => props.assets.filter((asset) => asset.isActive !== false));
const totalInitialValue = computed(() =>
	activeAssets.value.reduce((total, asset) => total + Number(asset.initialValue || 0), 0),
);
const selectedAnnualAssetIds = ref([]);

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
const selectedPeriodLabel = computed(() => {
	if (props.periodLabel) {
		return props.periodLabel;
	}

	return formatPeriodLabel(props.selectedPeriodId);
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
			withdrawals:
				monthlyState
					? Number(monthlyState.monthNormalWithdrawals || 0) + Number(monthlyState.monthExtraWithdrawals || 0)
					: null,
		};
	}),
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
			const latestYearState = yearlyStates[yearlyStates.length - 1] || null;

			return {
				id: asset.id,
				name: asset.name,
				color: asset.color || "#4F7CFF",
				label: String(props.selectedYear),
				liquidBalance: yearlyStates.reduce((total, monthlyState) => total + Number(monthlyState.monthNetIncome || 0), 0),
				grossBalance: latestYearState ? Number(latestYearState.currentGrossBalance || 0) : 0,
				contribution: yearlyStates.reduce((total, monthlyState) => total + Number(monthlyState.monthContributions || 0), 0),
				withdrawals: yearlyStates.reduce(
					(total, monthlyState) =>
						total +
						Number(monthlyState.monthNormalWithdrawals || 0) +
						Number(monthlyState.monthExtraWithdrawals || 0),
					0,
				),
			};
		})
		.sort((leftRow, rightRow) => leftRow.name.localeCompare(rightRow.name, "pt-BR", { sensitivity: "base" }));
});
const annualTotals = computed(() => ({
	liquidBalance: annualRows.value.reduce((total, row) => total + Number(row.liquidBalance || 0), 0),
	grossBalance: annualRows.value.reduce((total, row) => total + Number(row.grossBalance || 0), 0),
	contribution: annualRows.value.reduce((total, row) => total + Number(row.contribution || 0), 0),
	withdrawals: annualRows.value.reduce((total, row) => total + Number(row.withdrawals || 0), 0),
}));
const periodTotals = computed(() => ({
	netIncome: assetPeriodRows.value.reduce((total, row) => total + Number(row.netIncome || 0), 0),
	grossIncome: assetPeriodRows.value.reduce((total, row) => total + Number(row.grossIncome || 0), 0),
	withdrawals: assetPeriodRows.value.reduce((total, row) => total + Number(row.withdrawals || 0), 0),
}));

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
</script>

<template>
	<section class="summary-view">
		<section class="summary-hero">
			<div>
				<h2>Resumo</h2>
			</div>

			<div class="summary-hero-stats">
				<article class="hero-stat">
					<span>Ativos</span>
					<strong>{{ activeAssets.length }}</strong>
				</article>

				<article class="hero-stat hero-stat-total">
					<span>Saldo Total</span>
					<strong>{{ formatCurrency(totalInitialValue) }}</strong>
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

			<div class="table-shell">
				<table class="summary-table">
					<thead>
						<tr>
							<th>Ativo</th>
							<th>Per&iacute;odo</th>
							<th>Saldo l&iacute;quido</th>
							<th>Saldo total</th>
							<th>Aporte</th>
							<th>Saques</th>
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
							<td>{{ formatValue(row.grossBalance) }}</td>
							<td>{{ formatValue(row.contribution) }}</td>
							<td>{{ formatValue(row.withdrawals) }}</td>
						</tr>
						<tr class="summary-total-row">
							<td colspan="2">Total</td>
							<td>{{ formatValue(annualTotals.liquidBalance) }}</td>
							<td>{{ formatValue(annualTotals.grossBalance) }}</td>
							<td>{{ formatValue(annualTotals.contribution) }}</td>
							<td>{{ formatValue(annualTotals.withdrawals) }}</td>
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
					<table class="summary-table">
						<thead>
							<tr>
								<th>Ativo</th>
								<th>Per&iacute;odo</th>
								<th>Valor</th>
							</tr>
						</thead>

						<tbody v-if="assetPeriodRows.length > 0">
							<tr v-for="row in assetPeriodRows" :key="`withdrawal-${row.id}`">
								<td>
									<div class="asset-cell">
										<span class="asset-dot" :style="{ '--asset-color': row.color }" />
										<span>{{ row.name }}</span>
									</div>
								</td>
								<td>{{ row.periodLabel }}</td>
								<td>{{ formatValue(row.withdrawals) }}</td>
							</tr>
							<tr class="summary-total-row">
								<td colspan="2">Total</td>
								<td>{{ formatValue(periodTotals.withdrawals) }}</td>
							</tr>
						</tbody>

						<tbody v-else>
							<tr>
								<td colspan="3" class="empty-row">Nenhum saque registrado.</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>
		</section>
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

.summary-hero-stats {
	display: grid;
	grid-template-columns: minmax(0, 200px) minmax(0, 1.45fr);
	gap: 12px;
}

.hero-stat {
	display: grid;
	gap: 8px;
	padding: 16px 18px;
}

.hero-stat-total {
	min-width: min(100%, 300px);
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
	background: color-mix(in srgb, var(--color-primary) 42%, white 38%);
	color: color-mix(in srgb, #08111f 82%, var(--color-primary) 18%);
	white-space: nowrap;
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
}

.summary-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 22px;
}

.summary-table-card-wide {
	grid-column: 1 / -1;
}

@media (max-width: 1023px) {
	.summary-hero,
	.summary-hero-stats,
	.summary-grid {
		grid-template-columns: 1fr;
		display: grid;
	}
}

@media (max-width: 640px) {
	.summary-hero,
	.hero-stat,
	.table-header {
		padding: 18px;
	}

	.summary-filter-bar,
	.asset-pill-list {
		width: 100%;
	}

	.summary-table thead th,
	.summary-table tbody td {
		padding: 10px 14px;
	}
}
</style>
