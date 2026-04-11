import {
	collection,
	doc,
	getDocs,
	onSnapshot,
	query,
	serverTimestamp,
	where,
	writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { buildPeriodId } from "./periods";

function normalizeText(value) {
	return String(value || "").trim();
}

function normalizeColor(value) {
	const normalized = String(value || "").trim();
	return /^#[\da-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : "#4F7CFF";
}

function normalizeAmount(value) {
	const normalized = Number(value);
	return Number.isFinite(normalized) ? Number(normalized.toFixed(2)) : 0;
}

export function subscribeAssets(uid, callback) {
	const db = getFirebaseDb();
	if (!db || !uid) {
		return () => {};
	}

	const assetsCollection = collection(db, "users", uid, "assets");

	return onSnapshot(assetsCollection, (snapshot) => {
		const assets = snapshot.docs
			.map((assetDoc) => {
				const data = assetDoc.data() || {};
				return {
					id: assetDoc.id,
					name: normalizeText(data.name),
					institution: normalizeText(data.institution),
					category: normalizeText(data.category),
					startDate: normalizeText(data.startDate),
					color: normalizeColor(data.color),
					initialValue: normalizeAmount(data.initialValue),
					isActive: data.isActive !== false,
				};
			})
			.filter((asset) => asset.name.length > 0)
			.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

		callback(assets);
	});
}

export async function createAssetWithMonthlyState(uid, assetInput, period) {
	const db = getFirebaseDb();
	if (!db || !uid) {
		throw new Error("Firebase não inicializado.");
	}

	if (!period || !Number.isInteger(period.year) || !Number.isInteger(period.month)) {
		throw new Error("Período inválido.");
	}

	const name = normalizeText(assetInput.name);
	const startDate = normalizeText(assetInput.startDate);
	const institution = normalizeText(assetInput.institution);
	const category = normalizeText(assetInput.category);
	const color = normalizeColor(assetInput.color);
	const initialValue = normalizeAmount(assetInput.initialValue);

	if (!name || !startDate || initialValue <= 0) {
		throw new Error("Dados do ativo inválidos.");
	}

	const assetRef = doc(collection(db, "users", uid, "assets"));
	const periodId = buildPeriodId(period.year, period.month);
	const monthlyStateRef = doc(db, "users", uid, "assetMonthlyStates", `${assetRef.id}__${periodId}`);
	const timestamp = serverTimestamp();
	const batch = writeBatch(db);

	batch.set(assetRef, {
		name,
		startDate,
		initialValue,
		institution,
		category,
		color,
		isActive: true,
		createdAt: timestamp,
		updatedAt: timestamp,
	});

	batch.set(monthlyStateRef, {
		assetId: assetRef.id,
		periodId,
		openingCapitalInvested: initialValue,
		currentCapitalInvested: initialValue,
		openingLiquidBalance: initialValue,
		currentLiquidBalance: initialValue,
		openingGrossBalance: initialValue,
		currentGrossBalance: initialValue,
		monthNetIncome: 0,
		monthGrossIncome: 0,
		monthContributions: 0,
		monthNormalWithdrawals: 0,
		monthExtraWithdrawals: 0,
		lastReadingDate: "",
		createdAt: timestamp,
		updatedAt: timestamp,
	});

	await batch.commit();

	return assetRef.id;
}

export async function updateAssetWithInitialMonthlyState(uid, assetId, assetInput) {
	const db = getFirebaseDb();
	if (!db || !uid || !assetId) {
		throw new Error("Não foi possível atualizar o ativo.");
	}

	const name = normalizeText(assetInput.name);
	const startDate = normalizeText(assetInput.startDate);
	const institution = normalizeText(assetInput.institution);
	const category = normalizeText(assetInput.category);
	const color = normalizeColor(assetInput.color);
	const initialValue = normalizeAmount(assetInput.initialValue);

	if (!name || !startDate || initialValue <= 0) {
		throw new Error("Dados do ativo inválidos.");
	}

	const timestamp = serverTimestamp();
	const assetRef = doc(db, "users", uid, "assets", assetId);
	const batch = writeBatch(db);
	const monthlyStatesSnapshot = await getDocs(
		query(collection(db, "users", uid, "assetMonthlyStates"), where("assetId", "==", assetId)),
	);

	batch.update(assetRef, {
		name,
		startDate,
		initialValue,
		institution,
		category,
		color,
		updatedAt: timestamp,
	});

	const initialMonthlyStateDoc = monthlyStatesSnapshot.docs
		.sort((leftDoc, rightDoc) => {
			const leftPeriodId = normalizeText(leftDoc.data()?.periodId || leftDoc.id);
			const rightPeriodId = normalizeText(rightDoc.data()?.periodId || rightDoc.id);
			return leftPeriodId.localeCompare(rightPeriodId, "pt-BR");
		})[0];

	const initialMonthlyStateRef = initialMonthlyStateDoc?.ref;

	if (initialMonthlyStateRef) {
		batch.set(
			initialMonthlyStateRef,
			{
				openingCapitalInvested: initialValue,
				currentCapitalInvested: initialValue,
				openingLiquidBalance: initialValue,
				currentLiquidBalance: initialValue,
				openingGrossBalance: initialValue,
				currentGrossBalance: initialValue,
				updatedAt: timestamp,
			},
			{ merge: true },
		);
	}

	await batch.commit();
}

export async function deleteAssetCascade(uid, assetId) {
	const db = getFirebaseDb();
	if (!db || !uid || !assetId) {
		throw new Error("Não foi possível excluir o ativo.");
	}

	const collectionNames = ["assetMonthlyStates", "dailyReadings", "transactions"];
	const snapshots = await Promise.all(
		collectionNames.map((collectionName) =>
			getDocs(query(collection(db, "users", uid, collectionName), where("assetId", "==", assetId))),
		),
	);

	const batch = writeBatch(db);
	batch.delete(doc(db, "users", uid, "assets", assetId));

	snapshots.forEach((snapshot) => {
		snapshot.forEach((entry) => {
			batch.delete(entry.ref);
		});
	});

	await batch.commit();
}
