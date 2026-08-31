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
import { SnippetResource, NewSnippetInput } from './types';

const SNIPPETS_COLLECTION = 'snippets';

/**
 * Escuta em tempo real todos os prompts, componentes e snippets do usuário
 */
export function subscribeToSnippets(
  onUpdate: (snippets: SnippetResource[]) => void,
  onError?: (error: Error) => void,
  userId?: string
): Unsubscribe | null {
  if (!db) return null;

  try {
    const collectionRef = userId
      ? collection(db, 'users', userId, SNIPPETS_COLLECTION)
      : collection(db, SNIPPETS_COLLECTION);

    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: SnippetResource[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SnippetResource, 'id'>),
        }));
        onUpdate(list);
      },
      (error) => {
        console.error('Erro ao sincronizar snippets do Firestore:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error('Erro ao iniciar listener de snippets:', err);
    return null;
  }
}

/**
 * Salva ou atualiza um snippet/prompt no Firestore
 */
export async function saveSnippetToFirestore(
  input: NewSnippetInput,
  id?: string,
  userId?: string
): Promise<SnippetResource | null> {
  if (!db) return null;

  const collectionRef = userId
    ? collection(db, 'users', userId, SNIPPETS_COLLECTION)
    : collection(db, SNIPPETS_COLLECTION);

  const now = new Date().toISOString();

  if (id) {
    const docRef = doc(collectionRef, id);
    const updateData: Partial<SnippetResource> = {
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
 * Exclui um snippet/prompt do Firestore
 */
export async function deleteSnippetFromFirestore(
  id: string,
  userId?: string
): Promise<void> {
  if (!db || !id) return;

  const docRef = userId
    ? doc(db, 'users', userId, SNIPPETS_COLLECTION, id)
    : doc(db, SNIPPETS_COLLECTION, id);

  await deleteDoc(docRef);
}
