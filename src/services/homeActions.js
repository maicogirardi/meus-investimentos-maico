import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

const actionKinds = Object.freeze({
	update: "update",
	contribution: "contribution",
	withdrawal: "withdrawal",
	extraWithdrawal: "extraWithdrawal",
});

function normalizeText(value) {
	return String(value || "").trim();
}

function normalizeAmount(value) {
	const normalized = Number(value);
	return Number.isFinite(normalized) ? Number(normalized.toFixed(2)) : 0;
}

function normalizePeriodId(value) {
	return /^\d{4}-\d{2}$/.test(String(value || "").trim()) ? String(value).trim() : "";
}

function getCurrentDateLabel() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function normalizeActionDate(value) {
	const normalized = String(value || "").trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : getCurrentDateLabel();
}

function normalizeMonthlyState(monthlyState, asset, periodId) {
	const initialValue = normalizeAmount(asset?.initialValue);
	const source = monthlyState || {};

	return {
		assetId: normalizeText(source.assetId) || normalizeText(asset?.id),
		periodId: normalizeText(source.periodId) || periodId,
		openingCapitalInvested: normalizeAmount(source.openingCapitalInvested ?? initialValue),
		currentCapitalInvested: normalizeAmount(source.currentCapitalInvested ?? initialValue),
		openingLiquidBalance: normalizeAmount(source.openingLiquidBalance ?? initialValue),
		currentLiquidBalance: normalizeAmount(source.currentLiquidBalance ?? initialValue),
		openingGrossBalance: normalizeAmount(source.openingGrossBalance ?? initialValue),
		currentGrossBalance: normalizeAmount(source.currentGrossBalance ?? initialValue),
		monthNetIncome: normalizeAmount(source.monthNetIncome),
		monthGrossIncome: normalizeAmount(source.monthGrossIncome),
		monthContributions: normalizeAmount(source.monthContributions),
		monthNormalWithdrawals: normalizeAmount(source.monthNormalWithdrawals),
		monthExtraWithdrawals: normalizeAmount(source.monthExtraWithdrawals),
		lastReadingDate: normalizeText(source.lastReadingDate),
	};
}

function buildMonthlyStateSeed(asset, referenceMonthlyState, periodId) {
	const baseState = normalizeMonthlyState(referenceMonthlyState, asset, periodId);

	return {
		assetId: normalizeText(asset?.id),
		periodId,
		openingCapitalInvested: baseState.currentCapitalInvested,
		currentCapitalInvested: baseState.currentCapitalInvested,
		openingLiquidBalance: baseState.currentLiquidBalance,
		currentLiquidBalance: baseState.currentLiquidBalance,
		openingGrossBalance: baseState.currentGrossBalance,
		currentGrossBalance: baseState.currentGrossBalance,
		monthNetIncome: 0,
		monthGrossIncome: 0,
		monthContributions: 0,
		monthNormalWithdrawals: 0,
		monthExtraWithdrawals: 0,
		lastReadingDate: "",
	};
}

function buildIncomeFields(nextState) {
	return {
		monthNetIncome: normalizeAmount(nextState.currentLiquidBalance - nextState.currentCapitalInvested),
		monthGrossIncome: normalizeAmount(nextState.currentGrossBalance - nextState.currentCapitalInvested),
	};
}

export async function saveHomeAssetAction(uid, actionInput, context) {
	const db = getFirebaseDb();
	if (!db || !uid) {
		throw new Error("Firebase não inicializado.");
	}

	const asset = context?.asset || null;
	const assetId = normalizeText(actionInput?.assetId || asset?.id);
	const periodId = normalizePeriodId(actionInput?.periodId);
	const type = normalizeText(actionInput?.type);

	if (!asset || !assetId || !periodId || !Object.values(actionKinds).includes(type)) {
		throw new Error("Ação da Home inválida.");
	}

	const currentMonthlyState = context?.currentMonthlyState
		? normalizeMonthlyState(context.currentMonthlyState, asset, periodId)
		: buildMonthlyStateSeed(asset, context?.referenceMonthlyState, periodId);
	const isNewMonthlyState = !context?.currentMonthlyState;
	const timestamp = serverTimestamp();
	const batch = writeBatch(db);
	const monthlyStateRef = doc(db, "users", uid, "assetMonthlyStates", `${assetId}__${periodId}`);
	const actionDate = normalizeActionDate(actionInput?.date);
	let nextMonthlyState = {
		...currentMonthlyState,
	};

	if (type === actionKinds.update) {
		const liquidBalance = normalizeAmount(actionInput?.liquidBalance);
		const grossBalance = normalizeAmount(actionInput?.grossBalance);

		if (liquidBalance <= 0 || grossBalance <= 0) {
			throw new Error("Leitura diária inválida.");
		}

		nextMonthlyState = {
			...nextMonthlyState,
			currentLiquidBalance: liquidBalance,
			currentGrossBalance: grossBalance,
			lastReadingDate: actionDate,
			...buildIncomeFields({
				...nextMonthlyState,
				currentLiquidBalance: liquidBalance,
				currentGrossBalance: grossBalance,
			}),
		};

		const dailyReadingRef = doc(collection(db, "users", uid, "dailyReadings"));
		batch.set(dailyReadingRef, {
			assetId,
			periodId,
			liquidBalance,
			grossBalance,
			readingDate: actionDate,
			source: "home",
			createdAt: timestamp,
			updatedAt: timestamp,
		});
	}

	if (
		type === actionKinds.contribution ||
		type === actionKinds.withdrawal ||
		type === actionKinds.extraWithdrawal
	) {
		const amount = normalizeAmount(actionInput?.amount);
		const note = normalizeText(actionInput?.note);

		if (amount <= 0 || !note) {
			throw new Error("Transação inválida.");
		}

		if (type === actionKinds.contribution) {
			nextMonthlyState = {
				...nextMonthlyState,
				currentCapitalInvested: normalizeAmount(nextMonthlyState.currentCapitalInvested + amount),
				monthContributions: normalizeAmount(nextMonthlyState.monthContributions + amount),
			};
		}

		if (type === actionKinds.withdrawal) {
			nextMonthlyState = {
				...nextMonthlyState,
				monthNormalWithdrawals: normalizeAmount(nextMonthlyState.monthNormalWithdrawals + amount),
			};
		}

		if (type === actionKinds.extraWithdrawal) {
			nextMonthlyState = {
				...nextMonthlyState,
				currentCapitalInvested: normalizeAmount(Math.max(0, nextMonthlyState.currentCapitalInvested - amount)),
				monthExtraWithdrawals: normalizeAmount(nextMonthlyState.monthExtraWithdrawals + amount),
			};
		}

		nextMonthlyState = {
			...nextMonthlyState,
			...buildIncomeFields(nextMonthlyState),
		};

		const transactionRef = doc(collection(db, "users", uid, "transactions"));
		batch.set(transactionRef, {
			assetId,
			periodId,
			type,
			amount,
			note,
			transactionDate: actionDate,
			source: "home",
			createdAt: timestamp,
			updatedAt: timestamp,
		});
	}

	batch.set(
		monthlyStateRef,
		{
			...nextMonthlyState,
			...(isNewMonthlyState ? { createdAt: timestamp } : {}),
			updatedAt: timestamp,
		},
		{ merge: true },
	);

	await batch.commit();
}
