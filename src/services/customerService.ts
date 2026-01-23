import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    addDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    Timestamp,
    DocumentData,
    QueryDocumentSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { Customer, CustomerEmployee, Order } from '@/types';

const CUSTOMERS_COLLECTION = 'customers';
const EMPLOYEES_COLLECTION = 'customer_employees';
const ORDERS_COLLECTION = 'orders';

export const customerService = {
    // --- Customers ---

    /**
     * Get paginated customers with optional search by name (prefix, том/жижиг үсэг шалгахгүй).
     * nameLower талбар ашиглана: where('nameLower', '>=', term.toLowerCase()), orderBy('nameLower').
     */
    async getCustomers(
        lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
        pageSize: number = 20,
        searchTerm: string = ''
    ) {
        try {
            const term = (typeof searchTerm === 'string' ? searchTerm : '').trim();
            let q;

            if (term) {
                const lower = term.toLowerCase();
                q = query(
                    collection(db, CUSTOMERS_COLLECTION),
                    where('nameLower', '>=', lower),
                    where('nameLower', '<=', lower + '\uf8ff'),
                    orderBy('nameLower'),
                    limit(pageSize)
                );
            } else {
                q = query(
                    collection(db, CUSTOMERS_COLLECTION),
                    orderBy('createdAt', 'desc'),
                    limit(pageSize)
                );
                if (lastDoc) {
                    q = query(q, startAfter(lastDoc));
                }
            }

            const snapshot = await getDocs(q);
            const customers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            } as Customer));

            return {
                customers,
                lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
                hasMore: snapshot.docs.length === pageSize
            };
        } catch (error) {
            console.error("Error getting customers:", error);
            throw error;
        }
    },

    /**
     * Хуучин харилцагчид nameLower талбар нэмнэ (том/жижиг үсэг шалгахгүй хайлтанд).
     */
    async backfillNameLower(): Promise<{ updated: number; skipped: number }> {
        const snapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
        let updated = 0, skipped = 0;
        for (const d of snapshot.docs) {
            const data = d.data();
            if (data.nameLower != null) { skipped++; continue; }
            const nameVal = (data.name ?? '').toString();
            await updateDoc(d.ref, { nameLower: nameVal.toLowerCase() });
            updated++;
        }
        return { updated, skipped };
    },

    async getCustomerById(id: string): Promise<Customer | null> {
        try {
            const docRef = doc(db, CUSTOMERS_COLLECTION, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                } as Customer;
            }
            return null;
        } catch (error) {
            console.error("Error getting customer by ID:", error);
            throw error;
        }
    },

    async createCustomer(customerData: Partial<Customer>) {
        try {
            const docRef = await addDoc(collection(db, CUSTOMERS_COLLECTION), {
                ...customerData,
                createdAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating customer:", error);
            throw error;
        }
    },

    async updateCustomer(id: string, data: Partial<Customer>) {
        try {
            const docRef = doc(db, CUSTOMERS_COLLECTION, id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating customer:", error);
            throw error;
        }
    },

    async deleteCustomer(id: string) {
        try {
            const batch = writeBatch(db);

            // 1. Delete associated employees
            const employeesQuery = query(collection(db, EMPLOYEES_COLLECTION), where('customerId', '==', id));
            const employeesSnapshot = await getDocs(employeesQuery);
            employeesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 2. Delete customer
            const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
            batch.delete(customerRef);

            await batch.commit();
        } catch (error) {
            console.error("Error deleting customer:", error);
            throw error;
        }
    },

    async uploadLogo(id: string, file: File) {
        try {
            const storageRef = ref(storage, `customer_logos/${id}/${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await this.updateCustomer(id, { logoUrl: downloadURL });
            return downloadURL;
        } catch (error) {
            console.error("Error uploading logo:", error);
            throw error;
        }
    },

    // --- Employees ---

    async getCustomerEmployees(customerId: string): Promise<CustomerEmployee[]> {
        try {
            const q = query(collection(db, EMPLOYEES_COLLECTION), where('customerId', '==', customerId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            } as CustomerEmployee));
        } catch (error) {
            console.error("Error getting employees:", error);
            throw error;
        }
    },

    async createEmployee(data: Partial<CustomerEmployee>) {
        try {
            const docRef = await addDoc(collection(db, EMPLOYEES_COLLECTION), {
                ...data,
                createdAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating employee:", error);
            throw error;
        }
    },

    async updateEmployee(id: string, data: Partial<CustomerEmployee>) {
        try {
            const docRef = doc(db, EMPLOYEES_COLLECTION, id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating employee:", error);
            throw error;
        }
    },

    async deleteEmployee(id: string) {
        try {
            await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
        } catch (error) {
            console.error("Error deleting employee:", error);
            throw error;
        }
    },

    // --- Orders ---

    async getCustomerOrders(customerId: string): Promise<Order[]> {
        try {
            // Basic query for now, can be expanded with pagination if needed
            const q = query(
                collection(db, ORDERS_COLLECTION),
                where('customerId', '==', customerId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            } as Order));
        } catch (error) {
            console.error("Error getting customer orders:", error);
            throw error;
        }
    }
};
