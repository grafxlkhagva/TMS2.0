import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import type { Shipment } from '../../types';

export default function TripDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [trip, setTrip] = useState<Shipment | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        async function fetchTrip() {
            if (!id || !db) return;
            try {
                const docRef = doc(db, 'shipments', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTrip({ id: docSnap.id, ...docSnap.data() } as Shipment);
                } else {
                    Alert.alert('Алдаа', 'Ачааны мэдээлэл олдсонгүй');
                    router.back();
                }
            } catch (error) {
                console.error('Error fetching trip details:', error);
                Alert.alert('Алдаа', 'Мэдээлэл авахад алдаа гарлаа');
            } finally {
                setLoading(false);
            }
        }

        fetchTrip();
    }, [id]);

    const updateStatus = async (newStatus: string) => {
        if (!trip || !db || updating) return;

        Alert.alert(
            'Төлөв өөрчлөх',
            `Төлөвийг "${newStatus}" болгохдоо итгэлтэй байна уу?`,
            [
                { text: 'Үгүй', style: 'cancel' },
                {
                    text: 'Тийм',
                    onPress: async () => {
                        setUpdating(true);
                        try {
                            const docRef = doc(db, 'shipments', trip.id);
                            await updateDoc(docRef, {
                                status: newStatus,
                                updatedAt: serverTimestamp(),
                            });
                            setTrip({ ...trip, status: newStatus as any });
                            Alert.alert('Амжилттай', 'Төлөв шинэчлэгдлээ');
                        } catch (error) {
                            console.error('Error updating status:', error);
                            Alert.alert('Алдаа', 'Төлөв шинэчлэхэд алдаа гарлаа');
                        } finally {
                            setUpdating(false);
                        }
                    }
                }
            ]
        );
    };

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (!trip) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{trip.shipmentNumber}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.statusSection}>
                    <Text style={styles.sectionLabel}>Одоогийн төлөв:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
                        <Text style={styles.statusText}>{trip.status}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Маршрут</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.routePoint}>
                            <View style={styles.dotStart} />
                            <View>
                                <Text style={styles.locationLabel}>Ачих газар</Text>
                                <Text style={styles.locationValue}>{trip.route.startWarehouse}</Text>
                                <Text style={styles.regionValue}>{trip.route.startRegion}</Text>
                            </View>
                        </View>
                        <View style={styles.routeLine} />
                        <View style={styles.routePoint}>
                            <View style={styles.dotEnd} />
                            <View>
                                <Text style={styles.locationLabel}>Буулгах газар</Text>
                                <Text style={styles.locationValue}>{trip.route.endWarehouse}</Text>
                                <Text style={styles.regionValue}>{trip.route.endRegion}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Захиалагч & Холбоо барих</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Захиалагч:</Text>
                            <Text style={styles.value}>{trip.customerName}</Text>
                        </View>
                        <View style={styles.divider} />
                        <TouchableOpacity
                            style={styles.contactRow}
                            onPress={() => handleCall(trip.driverInfo.phone)}
                        >
                            <View>
                                <Text style={styles.label}>Диспетчер:</Text>
                                <Text style={styles.value}>{trip.driverInfo.phone}</Text>
                            </View>
                            <Ionicons name="call" size={24} color="#2563eb" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ачааны мэдээлэл</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Машины төрөл:</Text>
                            <Text style={styles.value}>{trip.vehicleInfo.vehicleType}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Чиргүүлийн төрөл:</Text>
                            <Text style={styles.value}>{trip.vehicleInfo.trailerType}</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                {trip.status === 'Preparing' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={() => updateStatus('Ready For Loading')}
                        disabled={updating}
                    >
                        <Text style={styles.actionButtonText}>Ачихад бэлэн</Text>
                    </TouchableOpacity>
                )}
                {trip.status === 'Ready For Loading' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={() => updateStatus('Loading')}
                        disabled={updating}
                    >
                        <Text style={styles.actionButtonText}>Ачиж эхлэх</Text>
                    </TouchableOpacity>
                )}
                {trip.status === 'Loading' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={() => updateStatus('In Transit')}
                        disabled={updating}
                    >
                        <Text style={styles.actionButtonText}>Замд гарах</Text>
                    </TouchableOpacity>
                )}
                {trip.status === 'In Transit' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={() => updateStatus('Unloading')}
                        disabled={updating}
                    >
                        <Text style={styles.actionButtonText}>Буулгаж эхлэх</Text>
                    </TouchableOpacity>
                )}
                {trip.status === 'Unloading' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.successButton]}
                        onPress={() => updateStatus('Delivered')}
                        disabled={updating}
                    >
                        <Text style={styles.actionButtonText}>Хүргэж дуусгах</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Preparing': return '#f59e0b';
        case 'Ready For Loading': return '#3b82f6';
        case 'Loading': return '#8b5cf6';
        case 'In Transit': return '#10b981';
        case 'Unloading': return '#06b6d4';
        case 'Delivered': return '#22c55e';
        case 'Delayed': return '#ef4444';
        default: return '#6b7280';
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#2563eb',
        height: 100,
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backButton: { padding: 4 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    content: { flex: 1 },
    statusSection: {
        backgroundColor: '#fff',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    sectionLabel: { fontSize: 14, color: '#6b7280' },
    statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    statusText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    section: { marginTop: 16, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
    infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
    routePoint: { flexDirection: 'row', gap: 12 },
    dotStart: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6', marginTop: 4 },
    dotEnd: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', marginTop: 4 },
    routeLine: { width: 2, height: 30, backgroundColor: '#d1d5db', marginLeft: 5, marginVertical: -4 },
    locationLabel: { fontSize: 12, color: '#6b7280' },
    locationValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    regionValue: { fontSize: 13, color: '#6b7280' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
    label: { fontSize: 14, color: '#6b7280' },
    value: { fontSize: 14, fontWeight: '500', color: '#111827' },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    actionButton: { padding: 16, borderRadius: 8, alignItems: 'center' },
    primaryButton: { backgroundColor: '#2563eb' },
    successButton: { backgroundColor: '#22c55e' },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
