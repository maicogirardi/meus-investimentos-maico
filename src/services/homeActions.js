import { collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
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

function normalizeTimestampMillis(value) {
	if (typeof value?.toMillis === "function") {
		return value.toMillis();
	}

	const normalized = Number(value);
	return Number.isFinite(normalized) ? normalized : null;
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

// Padroniza o snapshot mensal antes de recalcular qualquer ação.
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

// Usa o último estado conhecido como base para um período novo.
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

// Recalcula lucro líquido e bruto a partir do estado atual.
function buildIncomeFields(nextState) {
	return {
		monthNetIncome: normalizeAmount(nextState.currentLiquidBalance - nextState.currentCapitalInvested),
		monthGrossIncome: normalizeAmount(nextState.currentGrossBalance - nextState.currentCapitalInvested),
	};
}

function isTransactionActionType(type) {
	return (
		type === actionKinds.contribution
		|| type === actionKinds.withdrawal
		|| type === actionKinds.extraWithdrawal
	);
}

// Ordena leituras e transações pela data real de execução.
function compareEntriesByDate(leftEntry, rightEntry, fieldName = "transactionDate") {
	const dateCompare = normalizeText(leftEntry?.[fieldName]).localeCompare(normalizeText(rightEntry?.[fieldName]), "pt-BR");
	if (dateCompare !== 0) {
		return dateCompare;
	}

	const leftCreatedAt = normalizeTimestampMillis(leftEntry?.createdAt);
	const rightCreatedAt = normalizeTimestampMillis(rightEntry?.createdAt);
	if (leftCreatedAt != null && rightCreatedAt != null && leftCreatedAt !== rightCreatedAt) {
		return leftCreatedAt - rightCreatedAt;
	}

	return normalizeText(leftEntry?.id).localeCompare(normalizeText(rightEntry?.id), "pt-BR", { sensitivity: "base" });
}

// Reprocessa a linha do tempo inteira para chegar ao saldo final correto.
function buildRecomputedMonthlyState(baseMonthlyState, transactions, dailyReadings) {
	let nextMonthlyState = {
		...baseMonthlyState,
		currentCapitalInvested: normalizeAmount(baseMonthlyState.openingCapitalInvested),
		currentLiquidBalance: normalizeAmount(baseMonthlyState.openingLiquidBalance),
		currentGrossBalance: normalizeAmount(baseMonthlyState.openingGrossBalance),
		monthContributions: 0,
		monthNormalWithdrawals: 0,
		monthExtraWithdrawals: 0,
		lastReadingDate: "",
	};

	const timelineEntries = [
		...dailyReadings.map((dailyReading) => ({
			...dailyReading,
			entryType: actionKinds.update,
			actionDate: normalizeActionDate(dailyReading.readingDate),
		})),
		...transactions.map((transaction) => ({
			...transaction,
			entryType: normalizeText(transaction.type),
			actionDate: normalizeActionDate(transaction.transactionDate),
		})),
	].sort((leftEntry, rightEntry) => compareEntriesByDate(leftEntry, rightEntry, "actionDate"));

	timelineEntries.forEach((entry) => {
		if (entry.entryType === actionKinds.update) {
			nextMonthlyState.currentLiquidBalance = normalizeAmount(entry.liquidBalance);
			nextMonthlyState.currentGrossBalance = normalizeAmount(entry.grossBalance);
			nextMonthlyState.lastReadingDate = normalizeActionDate(entry.readingDate || entry.actionDate);
			return;
		}

		const amount = normalizeAmount(entry.amount);
		if (amount <= 0) {
			return;
		}

		if (entry.entryType === actionKinds.contribution) {
			nextMonthlyState.currentCapitalInvested = normalizeAmount(nextMonthlyState.currentCapitalInvested + amount);
			nextMonthlyState.currentLiquidBalance = normalizeAmount(nextMonthlyState.currentLiquidBalance + amount);
			nextMonthlyState.currentGrossBalance = normalizeAmount(nextMonthlyState.currentGrossBalance + amount);
			nextMonthlyState.monthContributions = normalizeAmount(nextMonthlyState.monthContributions + amount);
			return;
		}

		if (entry.entryType === actionKinds.withdrawal) {
			nextMonthlyState.currentLiquidBalance = normalizeAmount(Math.max(0, nextMonthlyState.currentLiquidBalance - amount));
			nextMonthlyState.monthNormalWithdrawals = normalizeAmount(nextMonthlyState.monthNormalWithdrawals + amount);
			return;
		}

		if (entry.entryType === actionKinds.extraWithdrawal) {
			nextMonthlyState.currentCapitalInvested = normalizeAmount(Math.max(0, nextMonthlyState.currentCapitalInvested - amount));
			nextMonthlyState.currentLiquidBalance = normalizeAmount(Math.max(0, nextMonthlyState.currentLiquidBalance - amount));
			nextMonthlyState.currentGrossBalance = normalizeAmount(Math.max(0, nextMonthlyState.currentGrossBalance - amount));
			nextMonthlyState.monthExtraWithdrawals = normalizeAmount(nextMonthlyState.monthExtraWithdrawals + amount);
		}
	});

	return {
		...nextMonthlyState,
		...buildIncomeFields(nextMonthlyState),
	};
}

// Carrega o conjunto mínimo de dados para recalcular uma transação.
async function loadAssetPeriodContext(uid, assetId, periodId) {
	const db = getFirebaseDb();
	const assetRef = doc(db, "users", uid, "assets", assetId);
	const monthlyStatesRef = collection(db, "users", uid, "assetMonthlyStates");
	const transactionsRef = collection(db, "users", uid, "transactions");
	const dailyReadingsRef = collection(db, "users", uid, "dailyReadings");

	const [assetSnapshot, monthlyStatesSnapshot, transactionsSnapshot, dailyReadingsSnapshot] = await Promise.all([
		getDoc(assetRef),
		getDocs(query(monthlyStatesRef, where("assetId", "==", assetId))),
		getDocs(query(transactionsRef, where("assetId", "==", assetId))),
		getDocs(query(dailyReadingsRef, where("assetId", "==", assetId))),
	]);

	if (!assetSnapshot.exists()) {
		throw new Error("Ativo não encontrado.");
	}

	const assetData = assetSnapshot.data() || {};
	const asset = {
		id: assetSnapshot.id,
		initialValue: normalizeAmount(assetData.initialValue),
	};

	const monthlyStates = monthlyStatesSnapshot.docs.map((monthlyStateDoc) => ({
		id: monthlyStateDoc.id,
		...monthlyStateDoc.data(),
	}));
	const currentMonthlyState = monthlyStates.find((monthlyState) => normalizeText(monthlyState.periodId) === periodId) || null;
	const referenceMonthlyState = [...monthlyStates]
		.filter((monthlyState) => normalizeText(monthlyState.periodId) < periodId)
		.sort((leftState, rightState) => normalizeText(leftState.periodId).localeCompare(normalizeText(rightState.periodId), "pt-BR"))
		.at(-1) || null;

	const periodTransactions = transactionsSnapshot.docs
		.map((transactionDoc) => ({
			id: transactionDoc.id,
			...transactionDoc.data(),
		}))
		.filter((transaction) => normalizeText(transaction.periodId) === periodId && isTransactionActionType(normalizeText(transaction.type)));

	const periodDailyReadings = dailyReadingsSnapshot.docs
		.map((dailyReadingDoc) => ({
			id: dailyReadingDoc.id,
			...dailyReadingDoc.data(),
		}))
		.filter((dailyReading) => normalizeText(dailyReading.periodId) === periodId);

	return {
		asset,
		currentMonthlyState,
		referenceMonthlyState,
		periodTransactions,
		periodDailyReadings,
	};
}

// Salva a ação da Home e atualiza o snapshot mensal no mesmo batch.
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

	if (isTransactionActionType(type)) {
		const amount = normalizeAmount(actionInput?.amount);
		const note = normalizeText(actionInput?.note);

		if (amount <= 0 || !note) {
			throw new Error("Transação inválida.");
		}

		if (type === actionKinds.contribution) {
			nextMonthlyState = {
				...nextMonthlyState,
				currentCapitalInvested: normalizeAmount(nextMonthlyState.currentCapitalInvested + amount),
				currentLiquidBalance: normalizeAmount(nextMonthlyState.currentLiquidBalance + amount),
				currentGrossBalance: normalizeAmount(nextMonthlyState.currentGrossBalance + amount),
				monthContributions: normalizeAmount(nextMonthlyState.monthContributions + amount),
			};
		}

		if (type === actionKinds.withdrawal) {
			nextMonthlyState = {
				...nextMonthlyState,
				currentLiquidBalance: normalizeAmount(Math.max(0, nextMonthlyState.currentLiquidBalance - amount)),
				monthNormalWithdrawals: normalizeAmount(nextMonthlyState.monthNormalWithdrawals + amount),
			};
		}

		if (type === actionKinds.extraWithdrawal) {
			nextMonthlyState = {
				...nextMonthlyState,
				currentCapitalInvested: normalizeAmount(Math.max(0, nextMonthlyState.currentCapitalInvested - amount)),
				currentLiquidBalance: normalizeAmount(Math.max(0, nextMonthlyState.currentLiquidBalance - amount)),
				currentGrossBalance: normalizeAmount(Math.max(0, nextMonthlyState.currentGrossBalance - amount)),
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

// Reescreve a transação e recompõe o estado mensal do ativo.
export async function updateHomeTransaction(uid, transactionInput) {
	const db = getFirebaseDb();
	const transactionId = normalizeText(transactionInput?.id);
	if (!db || !uid || !transactionId) {
		throw new Error("Transação inválida.");
	}

	const transactionRef = doc(db, "users", uid, "transactions", transactionId);
	const transactionSnapshot = await getDoc(transactionRef);
	if (!transactionSnapshot.exists()) {
		throw new Error("Transação não encontrada.");
	}

	const currentTransaction = transactionSnapshot.data() || {};
	const assetId = normalizeText(currentTransaction.assetId);
	const periodId = normalizePeriodId(currentTransaction.periodId);
	const type = normalizeText(transactionInput?.type);
	const note = normalizeText(transactionInput?.note);
	const amount = normalizeAmount(transactionInput?.amount);
	const transactionDate = normalizeActionDate(transactionInput?.date);

	if (!assetId || !periodId || !isTransactionActionType(type) || !note || amount <= 0) {
		throw new Error("Transação inválida.");
	}

	const context = await loadAssetPeriodContext(uid, assetId, periodId);
	const baseMonthlyState = context.currentMonthlyState
		? normalizeMonthlyState(context.currentMonthlyState, context.asset, periodId)
		: buildMonthlyStateSeed(context.asset, context.referenceMonthlyState, periodId);
	const recomputedTransactions = context.periodTransactions.map((transaction) => (
		transaction.id === transactionId
			? {
				...transaction,
				type,
				note,
				amount,
				transactionDate,
			}
			: transaction
	));
	const nextMonthlyState = buildRecomputedMonthlyState(baseMonthlyState, recomputedTransactions, context.periodDailyReadings);
	const monthlyStateRef = doc(db, "users", uid, "assetMonthlyStates", `${assetId}__${periodId}`);
	const timestamp = serverTimestamp();
	const batch = writeBatch(db);

	batch.set(transactionRef, {
		type,
		note,
		amount,
		transactionDate,
		updatedAt: timestamp,
	}, { merge: true });

	batch.set(monthlyStateRef, {
		...nextMonthlyState,
		assetId,
		periodId,
		updatedAt: timestamp,
	}, { merge: true });

	await batch.commit();
}

// Exclui a transação e refaz o cálculo mensal sem ela.
export async function deleteHomeTransaction(uid, transactionIdInput) {
	const db = getFirebaseDb();
	const transactionId = normalizeText(transactionIdInput);
	if (!db || !uid || !transactionId) {
		throw new Error("Transação inválida.");
	}

	const transactionRef = doc(db, "users", uid, "transactions", transactionId);
	const transactionSnapshot = await getDoc(transactionRef);
	if (!transactionSnapshot.exists()) {
		throw new Error("Transação não encontrada.");
	}

	const currentTransaction = transactionSnapshot.data() || {};
	const assetId = normalizeText(currentTransaction.assetId);
	const periodId = normalizePeriodId(currentTransaction.periodId);

	if (!assetId || !periodId) {
		throw new Error("Transação inválida.");
	}

	const context = await loadAssetPeriodContext(uid, assetId, periodId);
	const baseMonthlyState = context.currentMonthlyState
		? normalizeMonthlyState(context.currentMonthlyState, context.asset, periodId)
		: buildMonthlyStateSeed(context.asset, context.referenceMonthlyState, periodId);
	const recomputedTransactions = context.periodTransactions.filter((transaction) => transaction.id !== transactionId);
	const nextMonthlyState = buildRecomputedMonthlyState(baseMonthlyState, recomputedTransactions, context.periodDailyReadings);
	const monthlyStateRef = doc(db, "users", uid, "assetMonthlyStates", `${assetId}__${periodId}`);
	const timestamp = serverTimestamp();
	const batch = writeBatch(db);

	batch.delete(transactionRef);
	batch.set(monthlyStateRef, {
		...nextMonthlyState,
		assetId,
		periodId,
		updatedAt: timestamp,
	}, { merge: true });

	await batch.commit();
}
