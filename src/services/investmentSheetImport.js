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
