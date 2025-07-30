
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Rocket, CheckCircle } from 'lucide-react';

const formSchema = z.object({
  lastName: z.string().min(2, { message: 'Эцэг/эхийн нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  firstName: z.string().min(2, { message: 'Өөрийн нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  phone: z.string().min(8, { message: 'Утасны дугаар буруу байна.' }),
  email: z.string().email({ message: 'Хүчинтэй и-мэйл хаяг оруулна уу.' }),
  password: z.string().min(6, { message: 'Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.' }),
});

export default function SignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'pending' | 'checking' | 'active'>('pending');
  const [userEmailForCheck, setUserEmailForCheck] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lastName: '',
      firstName: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  async function checkUserStatus() {
    if (!userEmailForCheck) return;
    setAccountStatus('checking');

    try {
        const q = query(collection(db, 'users'), where('email', '==', userEmailForCheck));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            if (userDoc.data().status === 'active') {
                setAccountStatus('active');
            } else {
                 setAccountStatus('pending');
                 toast({
                    title: 'Хүсэлт хүлээгдэж байна',
                    description: 'Таны бүртгэлийг админ хараахан баталгаажуулаагүй байна.',
                });
            }
        }
    } catch (error) {
        setAccountStatus('pending');
        toast({
            variant: 'destructive',
            title: 'Алдаа',
            description: 'Статус шалгахад алдаа гарлаа. Та түр хүлээгээд дахин оролдоно уу.',
        });
    }
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        lastName: values.lastName,
        firstName: values.firstName,
        phone: values.phone,
        email: values.email,
        role: 'customer_officer',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      setUserEmailForCheck(values.email);
      setIsSubmitted(true);

    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = 'Бүртгүүлэхэд алдаа гарлаа.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Энэ и-мэйл хаяг бүртгэлтэй байна.';
      }
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Alert className="max-w-md">
            {accountStatus === 'active' ? (
                <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-600">Баяр хүргэе!</AlertTitle>
                    <AlertDescription>
                        Таны бүртгэл амжилттай идэвхжлээ. Та одоо системд нэвтрэх боломжтой.
                        <Button onClick={() => router.push('/login')} className="w-full mt-4">
                            Нэвтрэх
                        </Button>
                    </AlertDescription>
                </>
            ) : (
                <>
                    <Rocket className="h-4 w-4" />
                    <AlertTitle>Хүсэлт амжилттай илгээгдлээ!</AlertTitle>
                    <AlertDescription>
                        Таны бүртгэлийг админ зөвшөөрсний дараа та системд нэвтрэх боломжтой болно.
                        <Button onClick={checkUserStatus} disabled={accountStatus === 'checking'} className="w-full mt-4">
                            {accountStatus === 'checking' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Статус шалгах
                        </Button>
                         <Button variant="link" asChild className="p-0 h-auto mt-2 -ml-1">
                            <Link href="/login">Нэвтрэх хуудас руу буцах</Link>
                        </Button>
                    </AlertDescription>
                </>
            )}
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Бүртгүүлэх</CardTitle>
          <CardDescription>Шинэ хэрэглэгчийн мэдээллийг бөглөнө үү.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Эцэг/эхийн нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Бат" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Өөрийн нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Болд" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Утасны дугаар</FormLabel>
                    <FormControl>
                      <Input placeholder="99887766" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>И-мэйл</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нууц үг</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Бүртгүүлэх
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Бүртгэлтэй юу?{' '}
            <Link href="/login" className="underline">
              Нэвтрэх
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
