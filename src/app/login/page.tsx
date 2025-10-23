
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

const formSchema = z.object({
  email: z.string().email({ message: 'Хүчинтэй и-мэйл хаяг оруулна уу.' }),
  password: z.string().min(1, { message: 'Нууц үгээ оруулна уу.' }),
});

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Check user status in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.status === 'active') {
          toast({
            title: 'Амжилттай нэвтэрлээ',
          });
          router.push('/dashboard');
        } else if (userData.status === 'pending') {
           await auth.signOut();
           toast({
            variant: 'destructive',
            title: 'Нэвтрэх боломжгүй',
            description: 'Таны бүртгэлийг админ хараахан зөвшөөрөөгүй байна.',
          });
        } else { // 'inactive' or any other status
           await auth.signOut();
           toast({
            variant: 'destructive',
            title: 'Нэвтрэх боломжгүй',
            description: 'Таны хаяг идэвхгүйжүүлэгдсэн байна. Админтай холбогдоно уу.',
          });
        }
      } else {
         // This case might happen if user is created in Auth but not in Firestore
         await auth.signOut();
         toast({
            variant: 'destructive',
            title: 'Алдаа',
            description: 'Хэрэглэгчийн мэдээлэл олдсонгүй.',
          });
      }

    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: 'destructive',
        title: 'Нэвтрэхэд алдаа гарлаа',
        description: 'Таны и-мэйл эсвэл нууц үг буруу байна.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background">
       <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{backgroundImage: "url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')"}}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        <Card className="z-10 w-full max-w-md border-border/50 shadow-lg">
            <CardHeader className="text-center">
                 <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Truck className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl">Системд нэвтрэх</CardTitle>
                <CardDescription>Бүртгэлтэй и-мэйл, нууц үгээ ашиглан нэвтэрнэ үү.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            Нэвтрэх
                        </Button>
                    </form>
                </Form>
                <div className="mt-4 text-center text-sm">
                    Бүртгэл байхгүй юу?{' '}
                    <Link href="/signup" className="underline">
                    Бүртгүүлэх
                    </Link>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
