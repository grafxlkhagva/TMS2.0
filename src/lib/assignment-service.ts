import { db } from './firebase';
import {
    collection,
    doc,
    writeBatch,
    serverTimestamp,
    query,
    where,
    getDocs,
    getDoc,
    Timestamp
} from 'firebase/firestore';
import { Driver, Vehicle, VehicleAssignment } from '@/types';

/**
 * Үнэмлэхний ангилал шалгах функц.
 * Жишээ: Том оврын ачааны машин + Чиргүүл = "CE" ангилал шаардлагатай.
 */
export const checkLicenseCompliance = (
    driverClasses: string[],
    vehicleTypeName: string,
    isTrailerAttached: boolean
): { isValid: boolean; reason?: string } => {
    if (!driverClasses || driverClasses.length === 0) {
        return { isValid: false, reason: 'Жолоочийн үнэмлэхний ангилал бүртгэгдээгүй байна.' };
    }

    const normalizedClasses = driverClasses.map(c => c.toUpperCase());

    // Basic Logic for Mongolian License Classes
    if (isTrailerAttached) {
        if (!normalizedClasses.includes('E') && !normalizedClasses.some(c => c.includes('E'))) {
            return { isValid: false, reason: 'Чиргүүлтэй тээврийн хэрэгсэлд "E" ангилал шаардлагатай.' };
        }
    }

    // Common vehicle type checks (Example)
    if (vehicleTypeName.toLowerCase().includes('heavy') || vehicleTypeName.toLowerCase().includes('truck')) {
        if (!normalizedClasses.includes('C') && !normalizedClasses.includes('D')) {
            return { isValid: false, reason: 'Ачааны автомашинд "C" ангилал шаардлагатай.' };
        }
    }

    return { isValid: true };
};

/**
 * Тээврийн хэрэгсэл оноох гол логик.
 * Firestore Batch ашиглаж атом байдлаар гүйцэтгэнэ.
 * @param keepExisting Жолоочийн өмнөх оноолтуудыг хадгалах эсэх (олон машин оноох)
 */
export const assignVehicle = async (
    driver: Driver,
    vehicle: Vehicle,
    assignedBy: string,
    startOdometer?: number,
    notes?: string,
    keepExisting: boolean = false
) => {
    if (!db) throw new Error('Database not initialized');

    const batch = writeBatch(db);

    // 1. Тээврийн хэрэгсэл дээрх өөр "Primary" оноолт байгаа эсэхийг шалгаж, байвал Primary биш болгох
    // (Гэхдээ бүрмөсөн хаахгүй, зөвхөн Primary статусыг нь авна)
    const vehiclePrimaryQuery = query(
        collection(db, 'AssignmentHistory'),
        where('vehicleId', '==', vehicle.id),
        where('status', '==', 'Active'),
        where('isPrimary', '==', true)
    );
    const vehiclePrimarySnap = await getDocs(vehiclePrimaryQuery);
    vehiclePrimarySnap.forEach((docSnap) => {
        batch.update(docSnap.ref, {
            isPrimary: false
        });
    });

    // 2. Жолооч дээрх өмнөх оноолтуудын Primary төлөвийг арилгах
    const driverHistoryQuery = query(
        collection(db, 'AssignmentHistory'),
        where('driverId', '==', driver.id),
        where('status', '==', 'Active')
    );
    const driverHistorySnap = await getDocs(driverHistoryQuery);

    driverHistorySnap.forEach((docSnap) => {
        if (!keepExisting) {
            // Хуучин оноолтуудыг бүрмөсөн хаах
            batch.update(docSnap.ref, {
                status: 'Ended',
                endedAt: serverTimestamp(),
                endedBy: assignedBy,
                isPrimary: false
            });
            // Тэр машинуудыг Available болгох
            const data = docSnap.data();
            const oldVehicleRef = doc(db!, 'vehicles', data.vehicleId);
            batch.update(oldVehicleRef, {
                driverId: null,
                driverName: null,
                status: 'Available'
            });
        } else {
            // Зөвхөн Primary биш болгох
            batch.update(docSnap.ref, {
                isPrimary: false
            });
            // Тэр машинуудыг 'In Use'-оос 'Ready' болгож шилжүүлэх
            const data = docSnap.data();
            const oldVehicleRef = doc(db!, 'vehicles', data.vehicleId);
            batch.update(oldVehicleRef, {
                status: 'Ready'
            });
        }
    });

    // 3. Шинэ оноолтын түүх үүсгэх (Active & Primary)
    const newAssignmentRef = doc(collection(db!, 'AssignmentHistory'));
    const assignmentData: Partial<VehicleAssignment> = {
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.licensePlate,
        driverId: driver.id,
        driverName: driver.display_name,
        assignedAt: serverTimestamp() as any,
        assignedBy,
        startOdometer: startOdometer || vehicle.odometer || 0,
        status: 'Active',
        isPrimary: true,
        notes
    };
    batch.set(newAssignmentRef, assignmentData);

    // 4. Жолоочийн мэдээллийг шинэчлэх
    const driverRef = doc(db!, 'Drivers', driver.id);
    batch.update(driverRef, {
        assignedVehicleId: vehicle.id,
        status: 'Active'
    });

    // 5. Тээврийн хэрэгслийн мэдээллийг шинэчлэх
    const vehicleRef = doc(db!, 'vehicles', vehicle.id);
    batch.update(vehicleRef, {
        driverId: driver.id,
        driverName: driver.display_name,
        status: 'In Use'
    });

    await batch.commit();
    return newAssignmentRef.id;
};

/**
 * Тээврийн хэрэгсэл дээр одоо байгаа үндсэн жолоочийг олох
 */
export const getVehiclePrimaryAssignment = async (vehicleId: string) => {
    if (!db) return null;
    const q = query(
        collection(db, 'AssignmentHistory'),
        where('vehicleId', '==', vehicleId),
        where('status', '==', 'Active'),
        where('isPrimary', '==', true)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as VehicleAssignment;
};

/**
 * Үндсэн (Primary) тээврийн хэрэгслийг солих
 */
export const setPrimaryVehicle = async (
    driverId: string,
    vehicleId: string,
    updatedBy: string,
    force: boolean = false
) => {
    if (!db) throw new Error('Database not initialized');
    const batch = writeBatch(db);

    // 1. Хэрэв force=true бол энэ машин дээрх өөр хүний Primary оноолтыг хаана
    if (force) {
        const conflictQuery = query(
            collection(db, 'AssignmentHistory'),
            where('vehicleId', '==', vehicleId),
            where('status', '==', 'Active'),
            where('isPrimary', '==', true)
        );
        const conflictSnap = await getDocs(conflictQuery);
        conflictSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.driverId !== driverId) {
                batch.update(docSnap.ref, {
                    isPrimary: false
                });

                // Тэр жолоочийн үндсэн машиныг бас null болгох
                const otherDriverRef = doc(db!, 'Drivers', data.driverId);
                batch.update(otherDriverRef, {
                    assignedVehicleId: null
                });
            }
        });
    }

    // 2. Жолоочийн мэдээллийг татах (нэр хэрэгтэй учир)
    const driverRef = doc(db!, 'Drivers', driverId);
    const driverSnap = await getDoc(driverRef);
    if (!driverSnap.exists()) throw new Error('Driver not found');
    const driverData = driverSnap.data() as Driver;

    // 3. Жолоочийн бүх идэвхтэй оноолтыг Primary биш болгох
    const q = query(
        collection(db, 'AssignmentHistory'),
        where('driverId', '==', driverId),
        where('status', '==', 'Active')
    );
    const snap = await getDocs(q);

    snap.forEach((docSnap) => {
        const data = docSnap.data();
        const isCurrentTarget = data.vehicleId === vehicleId;

        batch.update(docSnap.ref, {
            isPrimary: isCurrentTarget
        });

        // Машины статус болон жолоочийн мэдээллийг шинэчлэх
        const vRef = doc(db!, 'vehicles', data.vehicleId);
        if (isCurrentTarget) {
            batch.update(vRef, {
                status: 'In Use',
                driverId: driverId,
                driverName: driverData.display_name
            });
        } else {
            batch.update(vRef, {
                status: 'Ready'
            });
        }
    });

    // 4. Жолооч дээрх үндсэн машиныг солих
    batch.update(driverRef, {
        assignedVehicleId: vehicleId
    });

    await batch.commit();
};

/**
 * Тээврийн хэрэгслийн оноолтыг цуцлах (чөлөөлөх)
 */
export const unassignVehicle = async (
    driverId: string,
    vehicleId: string,
    unassignedBy: string,
    endOdometer?: number
) => {
    if (!db) throw new Error('Database not initialized');
    const batch = writeBatch(db);

    // 1. Идэвхтэй оноолтын түүхийг хаах
    const q = query(
        collection(db, 'AssignmentHistory'),
        where('driverId', '==', driverId),
        where('vehicleId', '==', vehicleId),
        where('status', '==', 'Active')
    );
    const snap = await getDocs(q);

    let wasPrimary = false;

    snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isPrimary) wasPrimary = true;

        batch.update(docSnap.ref, {
            status: 'Ended',
            isPrimary: false,
            endedAt: serverTimestamp(),
            endedBy: unassignedBy,
            endOdometer: endOdometer || null
        });
    });

    // 2. Тээврийн хэрэгслийг чөлөөлөх
    const vehicleRef = doc(db!, 'vehicles', vehicleId);
    batch.update(vehicleRef, {
        driverId: null,
        driverName: null,
        status: 'Available'
    });

    // 3. Жолоочийн мэдээллийг шинэчлэх
    const driverRef = doc(db!, 'Drivers', driverId);
    if (wasPrimary) {
        batch.update(driverRef, {
            assignedVehicleId: null
        });
    }

    await batch.commit();
};
