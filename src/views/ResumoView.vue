<script setup>
import { computed } from "vue";

const props = defineProps({
	assets: {
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
});

const activeAssets = computed(() => props.assets.filter((asset) => asset.isActive !== false));
const totalInitialValue = computed(() =>
	activeAssets.value.reduce((total, asset) => total + Number(asset.initialValue || 0), 0),
);
const annualRows = computed(() => {
	if (!props.selectedYear) {
		return [];
	}

	return [
		{
			label: String(props.selectedYear),
			total: totalInitialValue.value,
			annualNetIncome: null,
			contribution: null,
			extraWithdrawal: null,
		},
	];
});

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
</script>

<template>
	<section class="summary-view">
		<section class="summary-hero">
			<div>
				<p class="eyebrow">Resumo</p>
				<h2>{{ periodLabel || "Visão consolidada" }}</h2>
			</div>

			<div class="summary-hero-stats">
				<article class="hero-stat">
					<span>Ativos</span>
					<strong>{{ activeAssets.length }}</strong>
				</article>

				<article class="hero-stat">
					<span>Total base</span>
					<strong>{{ formatCurrency(totalInitialValue) }}</strong>
				</article>
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
							<th>Ano</th>
							<th>Total</th>
							<th>Ganho anual líquido</th>
							<th>Aporte</th>
							<th>Saque extra</th>
						</tr>
					</thead>

					<tbody v-if="annualRows.length > 0">
						<tr v-for="row in annualRows" :key="row.label">
							<td>{{ row.label }}</td>
							<td>{{ formatCurrency(row.total) }}</td>
							<td>{{ formatValue(row.annualNetIncome) }}</td>
							<td>{{ formatValue(row.contribution) }}</td>
							<td>{{ formatValue(row.extraWithdrawal) }}</td>
						</tr>
					</tbody>

					<tbody v-else>
						<tr>
							<td colspan="5" class="empty-row">Selecione um período para visualizar o saldo anual.</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section class="summary-grid">
			<section class="summary-table-card">
				<header class="table-header">
					<h3>Líquido</h3>
				</header>

				<div class="table-shell">
					<table class="summary-table">
						<thead>
							<tr>
								<th>Ativo</th>
								<th>Mensal</th>
							</tr>
						</thead>

						<tbody v-if="activeAssets.length > 0">
							<tr v-for="asset in activeAssets" :key="`net-${asset.id}`">
								<td>{{ asset.name }}</td>
								<td>--</td>
							</tr>
						</tbody>

						<tbody v-else>
							<tr>
								<td colspan="2" class="empty-row">Nenhum ativo para resumir.</td>
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
								<th>Valor</th>
								<th>Mês</th>
							</tr>
						</thead>

						<tbody v-if="activeAssets.length > 0">
							<tr v-for="asset in activeAssets" :key="`gross-${asset.id}`">
								<td>--</td>
								<td>{{ periodLabel || asset.name }}</td>
							</tr>
						</tbody>

						<tbody v-else>
							<tr>
								<td colspan="2" class="empty-row">Nenhum ativo para resumir.</td>
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
								<th>Valor</th>
								<th>Data</th>
							</tr>
						</thead>

						<tbody v-if="activeAssets.length > 0">
							<tr v-for="asset in activeAssets" :key="`withdrawal-${asset.id}`">
								<td>{{ asset.name }}</td>
								<td>--</td>
								<td>--</td>
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

.summary-hero h2,
.table-header h3 {
	margin: 0;
	color: var(--text-h);
}

.summary-hero-stats {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 200px));
	gap: 12px;
}

.hero-stat {
	display: grid;
	gap: 8px;
	padding: 16px 18px;
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

.table-shell {
	overflow-x: auto;
}

.summary-table {
	width: 100%;
	border-collapse: collapse;
}

.summary-table thead th {
	padding: 14px 16px;
	text-align: left;
	font-size: 0.84rem;
	font-weight: 700;
	background: color-mix(in srgb, #79c26b 82%, white 8%);
	color: #10220f;
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

.eyebrow {
	margin: 0 0 6px;
	font-size: 0.8rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--text-soft);
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

	.summary-table thead th,
	.summary-table tbody td {
		padding: 12px 14px;
	}
}
</style>
