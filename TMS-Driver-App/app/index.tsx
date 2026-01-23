import React, { useState, useRef, useEffect } from 'react';
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
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../services/firebase';
import {
    PhoneAuthProvider,
    signInWithCredential,
    onAuthStateChanged
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function LoginScreen() {
    const router = useRouter();
    const recaptchaVerifier = useRef(null);

    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState('');

    const [loading, setLoading] = useState(false);
    const [isCodeSent, setIsCodeSent] = useState(false);

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                checkUserRole(user.uid, user.phoneNumber);
            }
        });
        return unsubscribe;
    }, []);

    const checkUserRole = async (uid: string, phone: string | null) => {
        try {
            if (!db) return;
            // Use full phone number with country code (e.g., +97699112233)
            const searchPhone = phone || '';

            const q = query(
                collection(db, 'users'),
                where('phone', '==', searchPhone),
                where('role', '==', 'driver')
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                if (userData.status === 'active') {
                    router.replace('/(tabs)');
                } else {
                    Alert.alert('Хязгаарлагдсан', 'Таны эрх идэвхгүй байна. Админтай холбогдоно уу.');
                    await auth.signOut();
                }
            } else {
                Alert.alert('Хандах эрхгүй', 'Та жолоочоор бүртгүүлээгүй байна эсвэл хүсэлт хараахан зөвшөөрөгдөөгүй байна.');
                if (auth) await auth.signOut();
            }
        } catch (error) {
            console.error('Check role error:', error);
        }
    };

    const handleSendCode = async () => {
        if (phoneNumber.length < 8) {
            Alert.alert('Алдаа', 'Утасны дугаараа зөв оруулна уу.');
            return;
        }

        setLoading(true);
        try {
            if (!auth) throw new Error('Auth not initialized');
            const phoneProvider = new PhoneAuthProvider(auth);
            // Format phone for Mongolia
            const formatPhone = `+976${phoneNumber.replace('+976', '')}`;

            const verificationId = await phoneProvider.verifyPhoneNumber(
                formatPhone,
                recaptchaVerifier.current!
            );

            setVerificationId(verificationId);
            setIsCodeSent(true);
            Alert.alert('Амжилттай', 'Баталгаажуулах код таны утсанд илгээгдлээ.');
        } catch (error: any) {
            console.error('Send code error:', error);
            Alert.alert('Алдаа', 'Код илгээхэд алдаа гарлаа. ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode) {
            Alert.alert('Алдаа', 'Баталгаажуулах кодыг оруулна уу.');
            return;
        }

        setLoading(true);
        try {
            if (!auth) throw new Error('Auth not initialized');
            const credential = PhoneAuthProvider.credential(
                verificationId!,
                verificationCode
            );
            await signInWithCredential(auth, credential);
            // The onAuthStateChanged listener will handle the redirection
        } catch (error: any) {
            console.error('Verify code error:', error);
            Alert.alert('Алдаа', 'Баталгаажуулах код буруу байна.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {Constants.expoConfig?.extra?.firebaseApiKey && (
                <FirebaseRecaptchaVerifierModal
                    ref={recaptchaVerifier}
                    firebaseConfig={{
                        apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
                        authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
                        projectId: Constants.expoConfig?.extra?.firebaseProjectId,
                        storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
                        messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
                        appId: Constants.expoConfig?.extra?.firebaseAppId,
                    }}
                    title="Би робот биш"
                    cancelLabel="Цуцлах"
                />
            )}

            <View style={styles.header}>
                <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1519003722824-192d99233405?q=80&w=200&h=200&auto=format&fit=crop' }}
                    style={styles.logo}
                />
                <Text style={styles.title}>TMS Driver</Text>
                <Text style={styles.subtitle}>Түмэн тээх системд тавтай морил</Text>
            </View>

            <View style={styles.form}>
                {!isCodeSent ? (
                    <>
                        <Text style={styles.label}>Утасны дугаар</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.prefix}>+976</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="99112233"
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                maxLength={8}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSendCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Код авах</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.label}>Баталгаажуулах код</Text>
                        <TextInput
                            style={styles.otpInput}
                            placeholder="123456"
                            keyboardType="number-pad"
                            value={verificationCode}
                            onChangeText={setVerificationCode}
                            maxLength={6}
                        />

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleVerifyCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Нэвтрэх</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={() => setIsCodeSent(false)}
                        >
                            <Text style={styles.resendText}>Дугаар өөрчлөх</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <View style={styles.registerFooter}>
                <Text style={styles.footerText}>Танд эрх байхгүй юу?</Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                    <Text style={styles.registerLink}> Бүртгүүлэх хүсэлт илгээх</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
    },
    form: {
        width: '100%',
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
        marginBottom: 20,
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
    otpInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 8,
        backgroundColor: '#f9fafb',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    resendButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    resendText: {
        color: '#2563eb',
        fontSize: 14,
    },
    registerFooter: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        color: '#6b7280',
        fontSize: 14,
    },
    registerLink: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
