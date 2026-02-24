import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TransportOperation } from '@/types';

const COLLECTION = 'transport_operations';

function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripUndefinedDeep(nested);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result as T;
  }
  return value;
}

function maybeToDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in (value as Record<string, unknown>)) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function normalizeOperation(id: string, data: Record<string, unknown>): TransportOperation {
  const shipmentDetails = data.shipmentDetails as TransportOperation['shipmentDetails'] | undefined;

  return {
    id,
    ...(data as Omit<TransportOperation, 'id' | 'createdAt' | 'updatedAt'>),
    shipmentDetails: shipmentDetails
      ? {
          ...shipmentDetails,
          plannedPickupDate: maybeToDate(shipmentDetails.plannedPickupDate),
          plannedDeliveryDate: maybeToDate(shipmentDetails.plannedDeliveryDate),
          dispatchTracking: shipmentDetails.dispatchTracking
            ? {
                ...shipmentDetails.dispatchTracking,
                eta: maybeToDate(shipmentDetails.dispatchTracking.eta),
                lastEventAt: maybeToDate(shipmentDetails.dispatchTracking.lastEventAt),
                stageHistory: shipmentDetails.dispatchTracking.stageHistory?.map((entry) => ({
                  ...entry,
                  at: maybeToDate(entry.at),
                })),
                workflow: shipmentDetails.dispatchTracking.workflow
                  ? {
                      ...shipmentDetails.dispatchTracking.workflow,
                      preTrip: shipmentDetails.dispatchTracking.workflow.preTrip
                        ? {
                            ...shipmentDetails.dispatchTracking.workflow.preTrip,
                          }
                        : undefined,
                      transit: shipmentDetails.dispatchTracking.workflow.transit
                        ? {
                            ...shipmentDetails.dispatchTracking.workflow.transit,
                            checkpointEta: maybeToDate(shipmentDetails.dispatchTracking.workflow.transit.checkpointEta),
                          }
                        : undefined,
                      delivery: shipmentDetails.dispatchTracking.workflow.delivery
                        ? {
                            ...shipmentDetails.dispatchTracking.workflow.delivery,
                            deliveredAt: maybeToDate(shipmentDetails.dispatchTracking.workflow.delivery.deliveredAt),
                          }
                        : undefined,
                    }
                  : undefined,
              }
            : undefined,
        }
      : undefined,
    createdAt: maybeToDate(data.createdAt) || new Date(),
    updatedAt: maybeToDate(data.updatedAt),
  } as TransportOperation;
}

export const transportOperationService = {
  async getAll(): Promise<TransportOperation[]> {
    try {
      const q = query(
        collection(db, COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => normalizeOperation(d.id, d.data()));
    } catch (error) {
      console.error('Error getting transport operations:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<TransportOperation | null> {
    try {
      const docRef = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return normalizeOperation(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('Error getting transport operation:', error);
      throw error;
    }
  },

  async create(
    data: Omit<TransportOperation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const cleanedData = stripUndefinedDeep(data);
      const docRef = await addDoc(collection(db, COLLECTION), {
        ...cleanedData,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating transport operation:', error);
      throw error;
    }
  },

  async update(id: string, data: Partial<TransportOperation>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION, id);
      const cleanedData = stripUndefinedDeep(data);
      await updateDoc(docRef, {
        ...cleanedData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating transport operation:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (error) {
      console.error('Error deleting transport operation:', error);
      throw error;
    }
  },
};
