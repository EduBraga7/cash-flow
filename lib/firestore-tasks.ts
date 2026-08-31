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
import { TaskDemand, NewTaskInput, TaskStatus } from './types';

const TASKS_COLLECTION = 'tasks';

/**
 * Escuta em tempo real todas as tarefas e manutenções do usuário
 */
export function subscribeToTasks(
  onUpdate: (tasks: TaskDemand[]) => void,
  onError?: (error: Error) => void,
  userId?: string
): Unsubscribe | null {
  if (!db) return null;

  try {
    const collectionRef = userId
      ? collection(db, 'users', userId, TASKS_COLLECTION)
      : collection(db, TASKS_COLLECTION);

    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: TaskDemand[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TaskDemand, 'id'>),
        }));
        onUpdate(list);
      },
      (error) => {
        console.error('Erro ao sincronizar tarefas do Firestore:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error('Erro ao iniciar listener de tarefas:', err);
    return null;
  }
}

/**
 * Salva ou atualiza uma tarefa no Firestore com sanitização de campos undefined
 */
export async function saveTaskToFirestore(
  input: NewTaskInput,
  id?: string,
  userId?: string
): Promise<TaskDemand | null> {
  if (!db) return null;

  const collectionRef = userId
    ? collection(db, 'users', userId, TASKS_COLLECTION)
    : collection(db, TASKS_COLLECTION);

  const now = new Date().toISOString();

  // Limpa campos undefined para evitar erros no Firestore
  const sanitized: Record<string, any> = {};
  Object.entries(input).forEach(([k, v]) => {
    if (v !== undefined) {
      sanitized[k] = v;
    }
  });

  if (id) {
    const docRef = doc(collectionRef, id);
    const updateData: Record<string, any> = {
      ...sanitized,
      ...(input.status === 'done' ? { completedAt: now } : {}),
    };
    await updateDoc(docRef, updateData);
    return { id, ...input, createdAt: now, ...(input.status === 'done' ? { completedAt: now } : {}) };
  } else {
    const newDocData: Record<string, any> = {
      ...sanitized,
      createdAt: now,
      ...(input.status === 'done' ? { completedAt: now } : {}),
    };
    const docRef = await addDoc(collectionRef, newDocData);
    return { id: docRef.id, ...newDocData } as TaskDemand;
  }
}

/**
 * Atualiza apenas o status de uma tarefa (ex: ao mover no Kanban)
 */
export async function updateTaskStatusInFirestore(
  id: string,
  newStatus: TaskStatus,
  userId?: string
): Promise<void> {
  if (!db || !id) return;

  const docRef = userId
    ? doc(db, 'users', userId, TASKS_COLLECTION, id)
    : doc(db, TASKS_COLLECTION, id);

  const updateData: Record<string, any> = { status: newStatus };
  if (newStatus === 'done') {
    updateData.completedAt = new Date().toISOString();
  }

  await updateDoc(docRef, updateData);
}

/**
 * Exclui uma tarefa do Firestore
 */
export async function deleteTaskFromFirestore(
  id: string,
  userId?: string
): Promise<void> {
  if (!db || !id) return;

  const docRef = userId
    ? doc(db, 'users', userId, TASKS_COLLECTION, id)
    : doc(db, TASKS_COLLECTION, id);

  await deleteDoc(docRef);
}
