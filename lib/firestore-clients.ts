import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { ClientProject, NewClientProjectInput } from './types';

const CLIENTS_COLLECTION = 'clients';

/**
 * Escuta em tempo real todas as fichas de clientes/projetos
 */
export function subscribeToClientProjects(
  onUpdate: (clients: ClientProject[]) => void,
  onError?: (error: Error) => void,
  userId?: string
): Unsubscribe | null {
  if (!db) return null;

  try {
    const collectionRef = userId
      ? collection(db, 'users', userId, CLIENTS_COLLECTION)
      : collection(db, CLIENTS_COLLECTION);

    const q = query(collectionRef, orderBy('name', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const clients: ClientProject[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ClientProject, 'id'>),
        }));
        onUpdate(clients);
      },
      (error) => {
        console.error('Erro ao sincronizar clientes do Firestore:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error('Erro ao iniciar listener de clientes:', err);
    return null;
  }
}

/**
 * Busca todos os clientes/projetos do Firestore
 */
export async function getClientProjectsFromFirestore(
  userId?: string
): Promise<ClientProject[]> {
  if (!db) return [];

  const collectionRef = userId
    ? collection(db, 'users', userId, CLIENTS_COLLECTION)
    : collection(db, CLIENTS_COLLECTION);

  const q = query(collectionRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ClientProject, 'id'>),
  }));
}

/**
 * Salva ou atualiza a ficha do cliente/projeto no Firestore
 */
export async function saveClientProjectToFirestore(
  input: NewClientProjectInput,
  id?: string,
  userId?: string
): Promise<ClientProject | null> {
  if (!db) return null;

  const collectionRef = userId
    ? collection(db, 'users', userId, CLIENTS_COLLECTION)
    : collection(db, CLIENTS_COLLECTION);

  const now = new Date().toISOString();

  if (id) {
    const docRef = doc(collectionRef, id);
    const updateData: Partial<ClientProject> = {
      ...input,
      updatedAt: now,
    };
    await updateDoc(docRef, updateData);
    return { id, ...input, updatedAt: now };
  } else {
    const newDocData = {
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(collectionRef, newDocData);
    return { id: docRef.id, ...newDocData };
  }
}

/**
 * Exclui a ficha de um cliente/projeto no Firestore
 */
export async function deleteClientProjectDoc(
  id: string,
  userId?: string
): Promise<void> {
  if (!db || !id) return;

  const docRef = userId
    ? doc(db, 'users', userId, CLIENTS_COLLECTION, id)
    : doc(db, CLIENTS_COLLECTION, id);

  await deleteDoc(docRef);
}
