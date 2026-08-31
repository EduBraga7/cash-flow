import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Entry, NewEntryInput } from './types';

const COLLECTION_NAME = 'entries';

/**
 * Escuta em tempo real todas as entradas no Firestore
 */
export function subscribeToEntries(
  onUpdate: (entries: Entry[]) => void,
  onError?: (error: Error) => void,
  userId?: string
): Unsubscribe | null {
  if (!db) return null;

  try {
    const collectionRef = userId
      ? collection(db, 'users', userId, COLLECTION_NAME)
      : collection(db, COLLECTION_NAME);

    const q = query(collectionRef, orderBy('date', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const entries: Entry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Entry, 'id'>),
        }));
        onUpdate(entries);
      },
      (error) => {
        console.error('Erro ao sincronizar com Firestore:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error('Erro ao iniciar listener do Firestore:', err);
    return null;
  }
}

/**
 * Busca todas as entradas no Firestore
 */
export async function getEntriesFromFirestore(userId?: string): Promise<Entry[]> {
  if (!db) return [];

  const collectionRef = userId
    ? collection(db, 'users', userId, COLLECTION_NAME)
    : collection(db, COLLECTION_NAME);

  const q = query(collectionRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Entry, 'id'>),
  }));
}

/**
 * Adiciona uma nova entrada no Firestore
 */
export async function addEntryToFirestore(
  input: NewEntryInput,
  userId?: string
): Promise<Entry | null> {
  if (!db) return null;

  const collectionRef = userId
    ? collection(db, 'users', userId, COLLECTION_NAME)
    : collection(db, COLLECTION_NAME);

  const cleanDate = input.date ? input.date.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const newDoc = {
    ...input,
    date: cleanDate,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collectionRef, newDoc);

  return {
    id: docRef.id,
    ...newDoc,
  };
}

/**
 * Atualiza uma entrada existente no Firestore
 */
export async function updateEntryInFirestore(
  id: string,
  input: Partial<NewEntryInput>,
  userId?: string
): Promise<void> {
  if (!db) return;

  const docRef = userId
    ? doc(db, 'users', userId, COLLECTION_NAME, id)
    : doc(db, COLLECTION_NAME, id);

  const updateData: Record<string, any> = { ...input };
  if (input.date) {
    updateData.date = input.date.slice(0, 10);
  }

  await updateDoc(docRef, updateData);
}

/**
 * Exclui uma entrada no Firestore
 */
export async function deleteEntryFromFirestore(
  id: string,
  userId?: string
): Promise<void> {
  if (!db) return;

  const docRef = userId
    ? doc(db, 'users', userId, COLLECTION_NAME, id)
    : doc(db, COLLECTION_NAME, id);

  await deleteDoc(docRef);
}

/**
 * Popula o Firestore com dados de exemplo iniciais
 */
export async function seedMockDataToFirestore(
  initialEntries: Omit<Entry, 'id'>[],
  userId?: string
): Promise<void> {
  if (!db) return;

  for (const entry of initialEntries) {
    await addEntryToFirestore(
      {
        description: entry.description,
        client: entry.client,
        value: entry.value,
        type: entry.type,
        status: entry.status,
        date: entry.date,
      },
      userId
    );
  }
}

/**
 * Renomeia um cliente em todos os seus lançamentos no Firestore
 */
export async function renameClientInFirestore(
  oldName: string,
  newName: string,
  userId?: string
): Promise<number> {
  if (!db || !oldName.trim() || !newName.trim()) return 0;

  const collectionRef = userId
    ? collection(db, 'users', userId, COLLECTION_NAME)
    : collection(db, COLLECTION_NAME);

  const snapshot = await getDocs(collectionRef);
  const normalizedOld = oldName.trim().toLowerCase();

  const matchingDocs = snapshot.docs.filter((docSnap) => {
    const data = docSnap.data();
    return (data.client || '').trim().toLowerCase() === normalizedOld;
  });

  const updatePromises = matchingDocs.map((docSnap) =>
    updateDoc(docSnap.ref, { client: newName.trim() })
  );

  await Promise.all(updatePromises);
  return matchingDocs.length;
}

/**
 * Exclui todos os lançamentos vinculados a um cliente no Firestore
 */
export async function deleteClientFromFirestore(
  clientName: string,
  userId?: string
): Promise<number> {
  if (!db || !clientName.trim()) return 0;

  const collectionRef = userId
    ? collection(db, 'users', userId, COLLECTION_NAME)
    : collection(db, COLLECTION_NAME);

  const snapshot = await getDocs(collectionRef);
  const normalized = clientName.trim().toLowerCase();

  const matchingDocs = snapshot.docs.filter((docSnap) => {
    const data = docSnap.data();
    return (data.client || '').trim().toLowerCase() === normalized;
  });

  const deletePromises = matchingDocs.map((docSnap) => deleteDoc(docSnap.ref));

  await Promise.all(deletePromises);
  return matchingDocs.length;
}

/**
 * Limpa todas as entradas do usuário no Firestore
 */
export async function clearAllEntriesFromFirestore(userId?: string): Promise<void> {
  if (!db) return;

  const collectionRef = userId
    ? collection(db, 'users', userId, COLLECTION_NAME)
    : collection(db, COLLECTION_NAME);

  const snapshot = await getDocs(collectionRef);
  const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);
}
