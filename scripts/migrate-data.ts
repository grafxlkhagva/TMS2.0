// scripts/migrate-data.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch, DocumentReference } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Ensure .env variables are loaded
dotenv.config({ path: './.env' });

console.log('Starting data migration script...');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

if (!firebaseConfig.projectId) {
    console.error("Firebase project ID is not defined. Make sure your .env file is correctly set up.");
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateCollection(
    collectionName: string, 
    refFields: Record<string, string> // Format: { idFieldNameWithoutIdSuffix: 'targetCollectionName' }
) {
    console.log(`\nMigrating "${collectionName}"...`);
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    let batch = writeBatch(db);
    let updatesInBatch = 0;
    let totalUpdates = 0;

    for (const document of snapshot.docs) {
        const data = document.data();
        const updateData: Record<string, DocumentReference> = {};
        let needsUpdate = false;

        for (const idFieldPrefix in refFields) {
            const idField = `${idFieldPrefix}Id`;
            const refField = `${idFieldPrefix}Ref`;
            const targetCollection = refFields[idFieldPrefix];
            const idValue = data[idField];

            if (idValue && typeof idValue === 'string' && !data[refField]) {
                console.log(`  - Preparing update for doc ${document.id}: setting ${refField}`);
                updateData[refField] = doc(db, targetCollection, idValue);
                needsUpdate = true;
            }
        }
        
        // Special case for `customers.assignedTo` which doesn't follow the 'Id' suffix convention
        if (collectionName === 'customers' && data.assignedTo && data.assignedTo.uid && !data.assignedToRef) {
             console.log(`  - Preparing update for customer ${document.id}: setting assignedToRef`);
             updateData['assignedToRef'] = doc(db, 'users', data.assignedTo.uid);
             needsUpdate = true;
        }


        if (needsUpdate) {
            batch.update(document.ref, updateData);
            updatesInBatch++;
            totalUpdates++;
            if (updatesInBatch >= 499) { // Firestore batch limit is 500 operations
                 await batch.commit();
                 console.log(`  > Committed a batch of ${updatesInBatch} updates.`);
                 batch = writeBatch(db);
                 updatesInBatch = 0;
            }
        }
    }

    if (updatesInBatch > 0) {
        await batch.commit();
        console.log(`  > Committed the final batch of ${updatesInBatch} updates.`);
    }

    if (totalUpdates > 0) {
        console.log(`Successfully updated ${totalUpdates} documents in "${collectionName}".`);
    } else {
        console.log(`No documents needed updating in "${collectionName}".`);
    }
}

async function runMigration() {
    try {
        await migrateCollection('customers', { assignedTo: 'users' });
        await migrateCollection('customer_employees', { customer: 'customers' });
        await migrateCollection('warehouses', { region: 'regions', customer: 'customers' });
        await migrateCollection('orders', { customer: 'customers', employee: 'customer_employees' });
        await migrateCollection('order_items', { 
            order: 'orders',
            startRegion: 'regions',
            startWarehouse: 'warehouses',
            endRegion: 'regions',
            endWarehouse: 'warehouses',
            serviceType: 'service_types',
            vehicleType: 'vehicle_types',
            trailerType: 'trailer_types'
        });
        await migrateCollection('order_item_cargoes', {
            orderItem: 'order_items',
            packagingType: 'packaging_types'
        });
        
        console.log("\nData migration completed successfully! ✅");
        process.exit(0);

    } catch (error) {
        console.error("\nError during data migration: ", error);
        process.exit(1);
    }
}

runMigration();
