import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { auth, db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import type { Shipment } from '../../types';

export default function TripsScreen() {
    const router = useRouter();
    const [trips, setTrips] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!auth?.currentUser || !db) {
            setLoading(false);
            return;
        }

        // Listen to shipments assigned to this driver
        const q = query(
            collection(db, 'shipments'),
            where('driverId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tripsData: Shipment[] = [];
            snapshot.forEach((doc) => {
                tripsData.push({ id: doc.id, ...doc.data() } as Shipment);
            });
            setTrips(tripsData);
            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error('Error fetching trips:', error);
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsubscribe();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Preparing':
                return '#f59e0b';
            case 'Ready For Loading':
                return '#3b82f6';
            case 'Loading':
                return '#8b5cf6';
            case 'In Transit':
                return '#10b981';
            case 'Unloading':
                return '#06b6d4';
            case 'Delivered':
                return '#22c55e';
            case 'Delayed':
                return '#ef4444';
            case 'Cancelled':
                return '#6b7280';
            default:
                return '#6b7280';
        }
    };

    const renderTripCard = ({ item }: { item: Shipment }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/trip/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.shipmentNumber}>{item.shipmentNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.routeContainer}>
                    <View style={styles.routePoint}>
                        <View style={styles.dotStart} />
                        <Text style={styles.routeText}>{item.route.startWarehouse}</Text>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routePoint}>
                        <View style={styles.dotEnd} />
                        <Text style={styles.routeText}>{item.route.endWarehouse}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Захиалагч:</Text>
                    <Text style={styles.value}>{item.customerName}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Машины төрөл:</Text>
                    <Text style={styles.value}>{item.vehicleInfo.vehicleType}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (trips.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Танд ачаа байхгүй байна</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={trips}
                renderItem={renderTripCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    listContainer: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    shipmentNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    cardBody: {
        gap: 12,
    },
    routeContainer: {
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 8,
    },
    routePoint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dotStart: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3b82f6',
    },
    dotEnd: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22c55e',
    },
    routeLine: {
        width: 2,
        height: 20,
        backgroundColor: '#d1d5db',
        marginLeft: 5,
        marginVertical: 4,
    },
    routeText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 14,
        color: '#6b7280',
    },
    value: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
    },
});
