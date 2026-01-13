import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if user is already logged in
        const unsubscribe = auth?.onAuthStateChanged(async (user) => {
            if (user && db) {
                // Check if user is a driver
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data()?.role === 'driver') {
                    router.replace('/(tabs)');
                }
            }
        });

        return () => unsubscribe?.();
    }, []);

    const handleLogin = async () => {
        if (!phone || !password) {
            Alert.alert('Алдаа', 'Утасны дугаар болон нууц үгээ оруулна уу');
            return;
        }

        if (!auth || !db) {
            Alert.alert('Алдаа', 'Firebase холбогдоогүй байна');
            return;
        }

        setLoading(true);

        try {
            // For now, use email/password auth (can be changed to phone auth later)
            const email = `${phone}@tms-driver.app`; // Convert phone to email format
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Check if user is a driver
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

            if (!userDoc.exists()) {
                await auth.signOut();
                Alert.alert('Алдаа', 'Хэрэглэгч олдсонгүй');
                return;
            }

            const userData = userDoc.data();

            if (userData.role !== 'driver') {
                await auth.signOut();
                Alert.alert('Алдаа', 'Та жолоочийн эрхгүй байна');
                return;
            }

            // Navigate to main app
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('Login error:', error);
            Alert.alert('Нэвтрэх алдаа', error.message || 'Утасны дугаар эсвэл нууц үг буруу байна');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>TMS Driver</Text>
                <Text style={styles.subtitle}>Жолоочийн апп</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Утасны дугаар</Text>
                <TextInput
                    style={styles.input}
                    placeholder="99999999"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Нууц үг</Text>
                <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Нэвтрэх</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Text style={styles.footer}>
                Асуудал гарвал админтай холбогдоно уу
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 50,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2563eb',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    form: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 24,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        textAlign: 'center',
        color: '#6b7280',
        marginTop: 24,
        fontSize: 14,
    },
});
