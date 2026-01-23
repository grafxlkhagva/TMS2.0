import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!fullName || !phone) {
            Alert.alert('Алдаа', 'Нэр болон утасны дугаараа бүрэн оруулна уу.');
            return;
        }

        if (phone.length < 8) {
            Alert.alert('Алдаа', 'Утасны дугаар буруу байна.');
            return;
        }

        setLoading(true);
        try {
            if (!db) throw new Error('Database not initialized');

            // Prepend +976 and ensure no spaces
            const formattedPhone = `+976${phone.trim().replace('+976', '')}`;

            // Add request directly
            await addDoc(collection(db, 'driver_requests'), {
                fullName,
                phone: formattedPhone,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            Alert.alert(
                'Амжилттай',
                'Таны хүсэлт илгээгдлээ. Админ зөвшөөрсний дараа та нэвтрэх боломжтой болно.',
                [{ text: 'Ойлголоо', onPress: () => router.replace('/') }]
            );
        } catch (error: any) {
            console.error('Registration error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            Alert.alert('Алдаа', `Хүсэлт илгээхэд алдаа гарлаа: ${error.message || 'Тодорхойгүй алдаа'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Бүртгүүлэх</Text>
                    <Text style={styles.subtitle}>
                        Жолоочоор бүртгүүлэх хүсэлтээ илгээнэ үү. Админ хянаад танд эрх нээж өгөх болно.
                    </Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Овог нэр</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Бат-Эрдэнэ"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                    />

                    <Text style={styles.label}>Утасны дугаар</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.prefix}>+976</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="99112233"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            maxLength={8}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Хүсэлт илгээх</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 8,
    },
    header: {
        marginBottom: 32,
        marginTop: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        lineHeight: 24,
    },
    form: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        backgroundColor: '#f9fafb',
        marginBottom: 16,
    },
    prefix: {
        paddingLeft: 12,
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    input: {
        flex: 1,
        padding: 12,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
