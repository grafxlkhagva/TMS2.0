import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, RefreshControl, TouchableOpacity } from 'react-native';
import { auth, db } from '../../services/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import type { Vehicle, SystemUser } from '../../types';

export default function VehicleScreen() {
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVehicleData = () => {
        if (!auth?.currentUser || !db) {
            setLoading(false);
            return () => { };
        }

        let unsubscribe: (() => void) | undefined;

        const loadData = async () => {
            try {
                // 1. Get driverId from users collection
                const userPhone = auth.currentUser?.phoneNumber || '';
                if (!userPhone) {
                    setError('Таны утасны дугаар олдсонгүй. Дахин нэвтэрнэ үү.');
                    setLoading(false);
                    return;
                }

                const usersQuery = query(
                    collection(db, 'users'),
                    where('phone', '==', userPhone)
                );
                const userSnapshot = await getDocs(usersQuery);

                if (userSnapshot.empty) {
                    setError('Хэрэглэгчийн мэдээлэл олдсонгүй (' + userPhone + ').');
                    setLoading(false);
                    return;
                }

                const userData = userSnapshot.docs[0].data() as any;
                const driverId = userData.driverId;

                if (!driverId) {
                    setVehicle(null);
                    setLoading(false);
                    return;
                }

                // 2. Get vehicle assigned to this driverId
                const vehicleQuery = query(
                    collection(db, 'vehicles'),
                    where('driverId', '==', driverId)
                );

                // Use onSnapshot for real-time updates
                unsubscribe = onSnapshot(vehicleQuery, (snapshot) => {
                    if (!snapshot.empty) {
                        const vehicleData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vehicle;
                        setVehicle(vehicleData);
                    } else {
                        setVehicle(null);
                    }
                    setLoading(false);
                    setRefreshing(false);
                    setError(null);
                }, (err) => {
                    console.error('Error fetching vehicle snapshot:', err);
                    setError(`Машины мэдээлэл татахад алдаа гарлаа: ${err.message}`);
                    setLoading(false);
                    setRefreshing(false);
                });
            } catch (err) {
                console.error('Vehicle fetch error:', err);
                setError(`Техникийн алдаа гарлаа: ${err instanceof Error ? err.message : String(err)}`);
                setLoading(false);
                setRefreshing(false);
            }
        };

        loadData();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    };

    useEffect(() => {
        const unsub = fetchVehicleData();
        return () => unsub?.();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchVehicleData();
    };

    const InfoRow = ({ label, value, icon }: { label: string; value: string | number | undefined; icon: string }) => (
        <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
                <Ionicons name={icon as any} size={20} color="#6b7280" style={styles.rowIcon} />
                <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <Text style={styles.infoValue}>{value || '-'}</Text>
        </View>
    );

    const DateBox = ({ label, date }: { label: string; date: any }) => {
        const formattedDate = date ? new Date(date.seconds * 1000).toLocaleDateString() : 'Бүртгэлгүй';
        const isExpired = date && (new Date(date.seconds * 1000) < new Date());

        return (
            <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>{label}</Text>
                <Text style={[styles.dateValue, isExpired && styles.dateExpired]}>{formattedDate}</Text>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                    <Text style={styles.retryText}>Дахин оролдох</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!vehicle) {
        return (
            <ScrollView
                contentContainerStyle={styles.centerContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <Ionicons name="car-outline" size={80} color="#d1d5db" />
                <Text style={styles.emptyText}>Танд оноогдсон машин байхгүй байна.</Text>
                <Text style={styles.emptySubText}>Админтай холбогдож машинаа бүртгүүлнэ үү.</Text>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <View style={styles.plateContainer}>
                    <Text style={styles.plateText}>{vehicle.licensePlate}</Text>
                </View>
                <Text style={styles.modelText}>{vehicle.makeName} {vehicle.modelName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: vehicle.status === 'Ready' ? '#22c55e' : '#f59e0b' }]}>
                    <Text style={styles.statusText}>{vehicle.status}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Техникийн үзүүлэлт</Text>
                <View style={styles.card}>
                    <InfoRow label="Үйлдвэрлэсэн он" value={vehicle.year} icon="calendar-outline" />
                    <InfoRow label="Орж ирсэн он" value={vehicle.importedYear} icon="airplane-outline" />
                    <InfoRow label="Түлшний төрөл" value={vehicle.fuelType} icon="color-fill-outline" />
                    <InfoRow label="Даац" value={vehicle.capacity} icon="barbell-outline" />
                    <InfoRow label="Гүйлт (km)" value={vehicle.odometer} icon="speedometer-outline" />
                </View>
            </View>

            {vehicle.trailerLicensePlate && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Чиргүүлийн мэдээлэл</Text>
                    <View style={[styles.card, styles.trailerCard]}>
                        <InfoRow label="Чиргүүлийн дугаар" value={vehicle.trailerLicensePlate} icon="link-outline" />
                    </View>
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Бичиг баримтын хугацаа</Text>
                <View style={styles.datesGrid}>
                    <DateBox label="Улсын бүртгэл" date={vehicle.dates?.registrationExpiry} />
                    <DateBox label="Даатгал" date={vehicle.dates?.insuranceExpiry} />
                    <DateBox label="Авто тээвэр" date={vehicle.dates?.roadPermitExpiry} />
                    <DateBox label="Оношилгоо" date={vehicle.dates?.inspectionExpiry} />
                </View>
            </View>

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        backgroundColor: '#fff',
        padding: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    plateContainer: {
        backgroundColor: '#1f2937',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    plateText: {
        color: '#facc15',
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 2,
    },
    modelText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    trailerCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    infoLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowIcon: {
        marginRight: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    datesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    dateBox: {
        backgroundColor: '#fff',
        width: '48%',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    dateLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    dateExpired: {
        color: '#ef4444',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
