import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { buildPeriodId } from "./periods";

const monthLabels = Object.freeze([
	"Janeiro",
	"Fevereiro",
	"Março",
	"Abril",
	"Maio",
	"Junho",
	"Julho",
	"Agosto",
	"Setembro",
	"Outubro",
	"Novembro",
	"Dezembro",
]);

const importSource = "sheet-real";

const cleanupPeriodIds = Object.freeze([
	"2024-01",
	"2024-03",
	"2024-04",
	"2024-05",
	"2024-10",
	"2024-11",
	"2025-02",
	"2025-05",
	"2025-06",
	"2025-07",
	"2025-08",
	"2025-09",
	"2025-10",
	"2025-12",
	"2026-01",
	"2026-02",
	"2026-03",
	"2026-04",
	"2026-05",
	"2026-06",
]);

const sheetMovements = Object.freeze([
	{ type: "contribution", amount: 14000, transactionDate: "2024-01-10", note: "Aporte janeiro/2024 - planilha REAL" },
	{ type: "extraWithdrawal", amount: 60000, transactionDate: "2025-09-15", note: "Saque extra janeiro/2025 - planilha REAL" },
	{ type: "contribution", amount: 3000, transactionDate: "2026-06-15", note: "Aporte janeiro/2026 - planilha REAL" },
]);

const sheetReadingsSource = "sheet-readings";

const sheetReadings = Object.freeze([
	{ periodId: "2023-12", readingDate: "2023-12-31", grossIncome: 2568.03, liquidIncome: 1868.03 },
	{ periodId: "2024-01", readingDate: "2024-01-31", grossIncome: 3746.63, liquidIncome: 3068.04 },
	{ periodId: "2024-02", readingDate: "2024-02-29", grossIncome: 3150.74, liquidIncome: 2957.50 },
	{ periodId: "2024-03", readingDate: "2024-03-31", grossIncome: 3121.09, liquidIncome: 2568.06 },
	{ periodId: "2024-04", readingDate: "2024-04-30", grossIncome: 3502.71, liquidIncome: 2985.56 },
	{ periodId: "2024-05", readingDate: "2024-05-31", grossIncome: 3304.13, liquidIncome: 2437.16 },
	{ periodId: "2024-06", readingDate: "2024-06-30", grossIncome: 3146.76, liquidIncome: 3127.55 },
	{ periodId: "2024-07", readingDate: "2024-07-31", grossIncome: 3649.45, liquidIncome: 2793.17 },
	{ periodId: "2024-08", readingDate: "2024-08-31", grossIncome: 3521.76, liquidIncome: 2946.05 },
	{ periodId: "2024-09", readingDate: "2024-09-30", grossIncome: 3416.11, liquidIncome: 2604.25 },
	{ periodId: "2024-10", readingDate: "2024-10-31", grossIncome: 3483.84, liquidIncome: 3311.50 },
	{ periodId: "2024-11", readingDate: "2024-11-30", grossIncome: 3228.65, liquidIncome: 2469.49 },
	{ periodId: "2024-12", readingDate: "2024-12-31", grossIncome: 3808.53, liquidIncome: 4466.84 },
	{ periodId: "2025-01", readingDate: "2025-01-31", grossIncome: 4298.39, liquidIncome: 3416.62 },
	{ periodId: "2025-02", readingDate: "2025-02-28", grossIncome: 4249.26, liquidIncome: 3729.26 },
	{ periodId: "2025-03", readingDate: "2025-03-31", grossIncome: 4166.95, liquidIncome: 3284.14 },
	{ periodId: "2025-04", readingDate: "2025-04-30", grossIncome: 4624.72, liquidIncome: 4195.17 },
	{ periodId: "2025-05", readingDate: "2025-05-31", grossIncome: 5027.10, liquidIncome: 3571.68 },
	{ periodId: "2025-06", readingDate: "2025-06-30", grossIncome: 4891.61, liquidIncome: 3828.02 },
	{ periodId: "2025-07", readingDate: "2025-07-31", grossIncome: 5745.01, liquidIncome: 4756.65 },
	{ periodId: "2025-08", readingDate: "2025-08-31", grossIncome: 4915.56, liquidIncome: 4231.06 },
	{ periodId: "2025-09", readingDate: "2025-09-30", grossIncome: 4820.26, liquidIncome: 3791.97 },
	{ periodId: "2025-10", readingDate: "2025-10-31", grossIncome: 5036.61, liquidIncome: 4149.72 },
	{ periodId: "2025-11", readingDate: "2025-11-30", grossIncome: 4181.84, liquidIncome: 5626.16 },
	{ periodId: "2025-12", readingDate: "2025-12-31", grossIncome: 4220.40, liquidIncome: 3955.40 },
	{ periodId: "2026-01", readingDate: "2026-01-31", grossIncome: 5070.13, liquidIncome: 4167.60 },
	{ periodId: "2026-02", readingDate: "2026-02-28", grossIncome: 3949.86, liquidIncome: 3352.89 },
	{ periodId: "2026-03", readingDate: "2026-03-31", grossIncome: 4584.77, liquidIncome: 3890.28 },
	{ periodId: "2026-04", readingDate: "2026-04-30", grossIncome: 4338.94, liquidIncome: 3683.59 },
	{ periodId: "2026-05", readingDate: "2026-05-31", grossIncome: 4256.22, liquidIncome: 3794.16 },
	{ periodId: "2026-06", readingDate: "2026-06-30", grossIncome: 2785.75, liquidIncome: 2539.44 },
]);

const sheetCurrentTotalIncome = 47349.33;
const sheetAnnualBalances = Object.freeze({
	2023: 387568.03,
	2024: 421203.79,
	2025: 388445.43,
	2026: 389349.33,
});

const sheetWithdrawalsSource = "sheet-withdrawals";
const sheetWithdrawalNote = "Saque mensal";

const sheetWithdrawals = Object.freeze([
	{ amount: 2380.61, transactionDate: "2024-03-18" },
	{ amount: 1715.25, transactionDate: "2024-04-18" },
	{ amount: 250.88, transactionDate: "2024-04-27" },
	{ amount: 1000.64, transactionDate: "2024-05-18" },
	{ amount: 8000.00, transactionDate: "2024-10-23" },
	{ amount: 1325.36, transactionDate: "2024-11-19" },
	{ amount: 2984.45, transactionDate: "2025-02-07" },
	{ amount: 1115.00, transactionDate: "2025-05-19" },
	{ amount: 840.66, transactionDate: "2025-06-20" },
	{ amount: 501.00, transactionDate: "2025-07-18" },
	{ amount: 2301.42, transactionDate: "2025-08-18" },
	{ amount: 4635.87, transactionDate: "2025-09-20" },
	{ amount: 4100.00, transactionDate: "2025-10-18" },
	{ amount: 0.00, transactionDate: "2025-11-18" },
	{ amount: 4815.81, transactionDate: "2025-12-19" },
	{ amount: 7880.84, transactionDate: "2026-01-19" },
	{ amount: 4800.64, transactionDate: "2026-02-19" },
	{ amount: 2605.51, transactionDate: "2026-03-19" },
	{ amount: 3225.49, transactionDate: "2026-04-17" },
	{ amount: 5011.58, transactionDate: "2026-05-18" },
]);

function normalizeAmount(value) {
	const normalized = Number(value);
	return Number.isFinite(normalized) ? Number(normalized.toFixed(2)) : 0;
}

function buildTransactionId(movement) {
	const cents = Math.round(normalizeAmount(movement.amount) * 100);
	return `real-itau-${movement.type}-${movement.transactionDate}-${cents}`;
}

function buildPeriodLabel(periodId) {
	const [yearText, monthText] = periodId.split("-");
	const monthIndex = Number(monthText) - 1;
	return `${monthLabels[monthIndex] || monthText} de ${yearText}`;
}

function getPeriodIdFromDate(dateLabel) {
	return dateLabel.slice(0, 7);
}

function buildMonthlyStates(asset, periods) {
	let currentCapitalInvested = normalizeAmount(asset.initialValue);
	let currentLiquidBalance = currentCapitalInvested;
	let currentGrossBalance = currentCapitalInvested;

	return periods.map((periodId) => {
		const openingCapitalInvested = currentCapitalInvested;
		const openingLiquidBalance = currentLiquidBalance;
		const openingGrossBalance = currentGrossBalance;
		const periodMovements = sheetMovements
			.filter((movement) => getPeriodIdFromDate(movement.transactionDate) === periodId)
			.sort((leftMovement, rightMovement) => leftMovement.transactionDate.localeCompare(rightMovement.transactionDate, "pt-BR"));
		let monthContributions = 0;
		let monthNormalWithdrawals = 0;
		let monthExtraWithdrawals = 0;

		periodMovements.forEach((movement) => {
			const amount = normalizeAmount(movement.amount);

			if (movement.type === "contribution") {
				currentCapitalInvested = normalizeAmount(currentCapitalInvested + amount);
				currentLiquidBalance = normalizeAmount(currentLiquidBalance + amount);
				currentGrossBalance = normalizeAmount(currentGrossBalance + amount);
				monthContributions = normalizeAmount(monthContributions + amount);
				return;
			}

			if (movement.type === "extraWithdrawal") {
				currentCapitalInvested = normalizeAmount(Math.max(0, currentCapitalInvested - amount));
				currentLiquidBalance = normalizeAmount(Math.max(0, currentLiquidBalance - amount));
				currentGrossBalance = normalizeAmount(Math.max(0, currentGrossBalance - amount));
				monthExtraWithdrawals = normalizeAmount(monthExtraWithdrawals + amount);
			}
		});

		return {
			assetId: asset.id,
			periodId,
			openingCapitalInvested,
			currentCapitalInvested,
			openingLiquidBalance,
			currentLiquidBalance,
			openingGrossBalance,
			currentGrossBalance,
			monthNetIncome: normalizeAmount(currentLiquidBalance - currentCapitalInvested),
			monthGrossIncome: normalizeAmount(currentGrossBalance - currentCapitalInvested),
			monthContributions,
			monthNormalWithdrawals,
			monthExtraWithdrawals,
			lastReadingDate: "",
		};
	});
}

function getImportPeriodIds() {
	return Array.from(new Set(sheetMovements.map((movement) => getPeriodIdFromDate(movement.transactionDate))));
}

export function getInvestmentSheetMovementCount() {
	return sheetMovements.length;
}

export function getInvestmentSheetReadingCount() {
	return sheetReadings.length;
}

export function getInvestmentSheetWithdrawalCount() {
	return sheetWithdrawals.filter((withdrawal) => normalizeAmount(withdrawal.amount) > 0).length;
}

function getPeriodEndDate(periodId) {
	const [yearText, monthText] = periodId.split("-");
	const year = Number(yearText);
	const month = Number(monthText);
	const lastDay = new Date(year, month, 0).getDate();
	return `${yearText}-${monthText}-${String(lastDay).padStart(2, "0")}`;
}

function buildReadingId(assetId, reading) {
	return `${sheetReadingsSource}-${assetId}-${reading.periodId}`;
}

function buildWithdrawalId(assetId, withdrawal) {
	const cents = Math.round(normalizeAmount(withdrawal.amount) * 100);
	return `${sheetWithdrawalsSource}-${assetId}-${withdrawal.transactionDate}-${cents}`;
}

function getCapitalForPeriod(asset, transactions, periodId) {
	return normalizeAmount(
		transactions
			.filter((transaction) => String(transaction.periodId || "").slice(0, 7) <= periodId)
			.reduce((total, transaction) => {
				const amount = normalizeAmount(transaction.amount);
				if (transaction.type === "contribution") {
					return total + amount;
				}

				if (transaction.type === "extraWithdrawal") {
					return total - amount;
				}

				return total;
			}, normalizeAmount(asset.initialValue)),
	);
}

function getMonthlyMovementTotals(transactions, periodId) {
	return transactions
		.filter((transaction) => String(transaction.periodId || "").slice(0, 7) === periodId)
		.reduce((totals, transaction) => {
			const amount = normalizeAmount(transaction.amount);
			if (transaction.type === "contribution") {
				totals.monthContributions = normalizeAmount(totals.monthContributions + amount);
			} else if (transaction.type === "withdrawal") {
				totals.monthNormalWithdrawals = normalizeAmount(totals.monthNormalWithdrawals + amount);
			} else if (transaction.type === "extraWithdrawal") {
				totals.monthExtraWithdrawals = normalizeAmount(totals.monthExtraWithdrawals + amount);
			}

			return totals;
		}, {
			monthContributions: 0,
			monthNormalWithdrawals: 0,
			monthExtraWithdrawals: 0,
		});
}

export async function importInvestmentSheetReadings(uid, asset) {
	const db = getFirebaseDb();
	const assetId = String(asset?.id || "").trim();
	if (!db || !uid || !assetId) {
		throw new Error("Importação inválida.");
	}

	const timestamp = serverTimestamp();
	const transactionsRef = collection(db, "users", uid, "transactions");
	const monthlyStatesRef = collection(db, "users", uid, "assetMonthlyStates");
	const dailyReadingsRef = collection(db, "users", uid, "dailyReadings");
	const [transactionsSnapshot, monthlyStatesSnapshot, dailyReadingsSnapshot] = await Promise.all([
		getDocs(query(transactionsRef, where("assetId", "==", assetId))),
		getDocs(query(monthlyStatesRef, where("assetId", "==", assetId))),
		getDocs(query(dailyReadingsRef, where("assetId", "==", assetId))),
	]);
	const existingTransactions = transactionsSnapshot.docs.map((transactionDoc) => transactionDoc.data() || {});
	const importedWithdrawals = sheetWithdrawals
		.filter((withdrawal) => normalizeAmount(withdrawal.amount) > 0)
		.map((withdrawal) => ({
			assetId,
			periodId: getPeriodIdFromDate(withdrawal.transactionDate),
			type: "withdrawal",
			amount: normalizeAmount(withdrawal.amount),
			note: sheetWithdrawalNote,
			transactionDate: withdrawal.transactionDate,
			source: sheetWithdrawalsSource,
		}));
	const transactions = [
		...existingTransactions.filter((transaction) => transaction.source !== sheetWithdrawalsSource),
		...importedWithdrawals,
	];
	const monthlyStateMap = new Map(monthlyStatesSnapshot.docs.map((monthlyStateDoc) => [
		monthlyStateDoc.data()?.periodId,
		monthlyStateDoc,
	]));
	const batch = writeBatch(db);

	dailyReadingsSnapshot.docs.forEach((dailyReadingDoc) => {
		batch.delete(dailyReadingDoc.ref);
	});

	transactionsSnapshot.docs.forEach((transactionDoc) => {
		if (transactionDoc.data()?.source === sheetWithdrawalsSource) {
			batch.delete(transactionDoc.ref);
		}
	});

	importedWithdrawals.forEach((withdrawal) => {
		batch.set(doc(db, "users", uid, "transactions", buildWithdrawalId(assetId, withdrawal)), {
			...withdrawal,
			createdAt: timestamp,
			updatedAt: timestamp,
		});
	});

	sheetReadings.forEach((reading) => {
		const [yearText, monthText] = reading.periodId.split("-");
		const year = Number(yearText);
		const month = Number(monthText);
		const capital = getCapitalForPeriod(asset, transactions, reading.periodId);
		const isLatestReading = reading.periodId === sheetReadings.at(-1).periodId;
		const annualBalance = sheetAnnualBalances[year];
		const liquidBalance = normalizeAmount(isLatestReading
			? capital + sheetCurrentTotalIncome
			: annualBalance ?? capital + reading.liquidIncome);
		const grossBalance = normalizeAmount(isLatestReading
			? capital + sheetCurrentTotalIncome
			: annualBalance ?? capital + reading.grossIncome);
		const movementTotals = getMonthlyMovementTotals(transactions, reading.periodId);
		const monthlyStateDoc = monthlyStateMap.get(reading.periodId);
		const monthlyStateRef = monthlyStateDoc?.ref || doc(db, "users", uid, "assetMonthlyStates", `${assetId}__${reading.periodId}`);
		const existingState = monthlyStateDoc?.data() || {};
		const readingDate = reading.readingDate || getPeriodEndDate(reading.periodId);

		batch.set(
			doc(db, "users", uid, "periods", reading.periodId),
			{
				year,
				month,
				label: buildPeriodLabel(reading.periodId),
				createdAt: existingState.createdAt || timestamp,
				updatedAt: timestamp,
			},
			{ merge: true },
		);

		batch.set(
			monthlyStateRef,
			{
				assetId,
				periodId: reading.periodId,
				openingCapitalInvested: normalizeAmount(existingState.openingCapitalInvested ?? capital),
				currentCapitalInvested: capital,
				openingLiquidBalance: normalizeAmount(existingState.openingLiquidBalance ?? capital),
				currentLiquidBalance: liquidBalance,
				openingGrossBalance: normalizeAmount(existingState.openingGrossBalance ?? capital),
				currentGrossBalance: grossBalance,
				monthNetIncome: normalizeAmount(reading.liquidIncome),
				monthGrossIncome: normalizeAmount(reading.grossIncome),
				...movementTotals,
				lastReadingDate: readingDate,
				createdAt: existingState.createdAt || timestamp,
				updatedAt: timestamp,
			},
			{ merge: true },
		);

		batch.set(doc(db, "users", uid, "dailyReadings", buildReadingId(assetId, reading)), {
			assetId,
			periodId: reading.periodId,
			liquidIncome: normalizeAmount(reading.liquidIncome),
			grossIncome: normalizeAmount(reading.grossIncome),
			liquidBalance,
			grossBalance,
			readingDate,
			source: sheetReadingsSource,
			createdAt: timestamp,
			updatedAt: timestamp,
		});
	});

	await batch.commit();

	return {
		readingCount: sheetReadings.length,
		withdrawalCount: importedWithdrawals.length,
	};
}

export async function importInvestmentSheetMovements(uid, asset) {
	const db = getFirebaseDb();
	const assetId = String(asset?.id || "").trim();
	if (!db || !uid || !assetId) {
		throw new Error("Importação inválida.");
	}

	const timestamp = serverTimestamp();
	const transactionsRef = collection(db, "users", uid, "transactions");
	const monthlyStatesRef = collection(db, "users", uid, "assetMonthlyStates");
	const [transactionSnapshot, monthlyStateSnapshot] = await Promise.all([
		getDocs(query(transactionsRef, where("source", "==", importSource))),
		getDocs(query(monthlyStatesRef, where("assetId", "==", assetId))),
	]);
	const periods = getImportPeriodIds();
	const monthlyStates = buildMonthlyStates(asset, periods);
	const cleanupPeriodSet = new Set(cleanupPeriodIds);
	const batch = writeBatch(db);

	transactionSnapshot.docs.forEach((transactionDoc) => {
		if (transactionDoc.data()?.assetId === assetId) {
			batch.delete(transactionDoc.ref);
		}
	});

	monthlyStateSnapshot.docs.forEach((monthlyStateDoc) => {
		if (cleanupPeriodSet.has(monthlyStateDoc.data()?.periodId)) {
			batch.delete(monthlyStateDoc.ref);
		}
	});

	periods.forEach((periodId) => {
		const [yearText, monthText] = periodId.split("-");
		batch.set(
			doc(db, "users", uid, "periods", periodId),
			{
				year: Number(yearText),
				month: Number(monthText),
				label: buildPeriodLabel(periodId),
				createdAt: timestamp,
				updatedAt: timestamp,
			},
			{ merge: true },
		);
	});

	monthlyStates.forEach((monthlyState) => {
		batch.set(
			doc(db, "users", uid, "assetMonthlyStates", `${assetId}__${monthlyState.periodId}`),
			{
				...monthlyState,
				createdAt: timestamp,
				updatedAt: timestamp,
			},
			{ merge: true },
		);
	});

	sheetMovements.forEach((movement) => {
		const transactionRef = doc(collection(db, "users", uid, "transactions"), buildTransactionId(movement));
		batch.set(transactionRef, {
			assetId,
			periodId: buildPeriodId(
				Number(movement.transactionDate.slice(0, 4)),
				Number(movement.transactionDate.slice(5, 7)),
			),
			type: movement.type,
			amount: normalizeAmount(movement.amount),
			note: movement.note,
			transactionDate: movement.transactionDate,
			source: importSource,
			createdAt: timestamp,
			updatedAt: timestamp,
		});
	});

	await batch.commit();

	return {
		monthlyStateCount: monthlyStates.length,
		periodCount: periods.length,
		transactionCount: sheetMovements.length,
	};
}
