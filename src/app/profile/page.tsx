'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, User, Camera } from 'lucide-react';
import { doc, updateDoc, type DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

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
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const formSchema = z.object({
  lastName: z.string().min(2, { message: 'Эцэг/эхийн нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  firstName: z.string().min(2, { message: 'Өөрийн нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  phone: z.string().min(8, { message: 'Утасны дугаар буруу байна.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProfilePage() {
  const { user, loading, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lastName: '',
      firstName: '',
      phone: '',
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        lastName: user.lastName || '',
        firstName: user.firstName || '',
        phone: user.phone || '',
      });
      if (user.avatarUrl) {
        setPreviewUrl(user.avatarUrl);
      }
    }
  }, [user, form.reset]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.trigger(); // Trigger validation to enable save button
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  async function onSubmit(values: FormValues) {
    if (!user) return;

    const { isDirty, dirtyFields } = form.formState;

    if (!isDirty && !selectedFile) {
      toast({
        title: 'Өөрчлөлт алга',
        description: 'Шинэчлэх мэдээлэл олдсонгүй.',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const dataToUpdate: DocumentData = {};
      let newAvatarUrl: string | undefined = undefined;

      // 1. Upload image if a new one is selected
      if (selectedFile) {
        const storageRef = ref(storage, `avatars/${user.uid}/${selectedFile.name}`);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        newAvatarUrl = await getDownloadURL(snapshot.ref);
        dataToUpdate.avatarUrl = newAvatarUrl;
      }

      // 2. Add other dirty fields to the update object
      if (dirtyFields.firstName) dataToUpdate.firstName = values.firstName;
      if (dirtyFields.lastName) dataToUpdate.lastName = values.lastName;
      if (dirtyFields.phone) dataToUpdate.phone = values.phone;
      
      // 3. Perform the update if there's anything to update
      if (Object.keys(dataToUpdate).length > 0) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, dataToUpdate);
      }

      // 4. Refresh data and show success
      await refreshUserData();
      
      toast({
        title: 'Амжилттай шинэчиллээ',
        description: 'Таны мэдээлэл амжилттай шинэчлэгдлээ.',
      });
      setSelectedFile(null);
      form.reset(values, { keepValues: true, keepDirty: false });

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Профайл шинэчлэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
        <Card>
          <CardHeader>
             <Skeleton className="h-6 w-1/4" />
             <Skeleton className="mt-2 h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
             <div className="flex justify-center">
                <Skeleton className="h-32 w-32 rounded-full" />
             </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const fallbackText = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Миний профайл</h1>
        <p className="text-muted-foreground">
          Өөрийн хувийн мэдээллийг эндээс засах боломжтой.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Хувийн мэдээлэл</CardTitle>
            <CardDescription>И-мэйл хаягийг солих боломжгүйг анхаарна уу.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-32 w-32 cursor-pointer" onClick={handleAvatarClick}>
                    <AvatarImage src={previewUrl || user.avatarUrl} alt="User avatar" />
                    <AvatarFallback className="text-4xl">
                      {fallbackText}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Camera className="h-4 w-4" />
                  </div>
                  <FormControl>
                    <Input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, image/gif"
                    />
                   </FormControl>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
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
              <FormItem>
                <FormLabel>И-мэйл</FormLabel>
                <FormControl>
                  <Input disabled value={user.email || ''} />
                </FormControl>
              </FormItem>

              <Button type="submit" disabled={isSubmitting || (!form.formState.isDirty && !selectedFile)}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Хадгалах
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
