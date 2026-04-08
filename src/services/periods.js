import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

export function buildPeriodId(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function subscribePeriods(uid, callback) {
  const db = getFirebaseDb();
  if (!db || !uid) {
    return () => {};
  }

  const periodsCollection = collection(db, "users", uid, "periods");

  return onSnapshot(periodsCollection, (snapshot) => {
    const periods = snapshot.docs
      .map((periodDoc) => {
        const data = periodDoc.data() || {};
        return {
          id: periodDoc.id,
          year: Number(data.year),
          month: Number(data.month),
          label: data.label || periodDoc.id,
        };
      })
      .filter((period) => Number.isInteger(period.year) && Number.isInteger(period.month))
      .sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year;
        }

        return a.month - b.month;
      });

    callback(periods);
  });
}

export async function ensurePeriod(uid, year, month, label) {
  const db = getFirebaseDb();
  if (!db || !uid) {
    throw new Error("Firebase não inicializado.");
  }

  const id = buildPeriodId(year, month);

  await setDoc(
    doc(db, "users", uid, "periods", id),
    {
      year,
      month,
      label,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  return id;
}
