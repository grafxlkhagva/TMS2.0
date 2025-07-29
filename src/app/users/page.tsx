'use client';

import * as React from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MoreHorizontal, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { SystemUser, UserStatus, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';


function StatusBadge({ status }: { status: UserStatus }) {
    const variant = status === 'active' ? 'default' : status === 'pending' ? 'secondary' : 'destructive';
    const text = status === 'active' ? 'Идэвхтэй' : status === 'pending' ? 'Хүлээгдэж буй' : 'Идэвхгүй';
    return <Badge variant={variant}>{text}</Badge>;
}

function RoleBadge({ role }: { role: UserRole }) {
    const text = role === 'admin' ? 'Админ' : 'Менежер';
    return <Badge variant="outline">{text}</Badge>;
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();


  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate(), // Convert Firestore Timestamp to Date
        } as SystemUser;
      });
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users: ", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Хэрэглэгчдийн мэдээллийг татахад алдаа гарлаа.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  const handleStatusChange = async (userId: string, status: UserStatus) => {
    if (userId === currentUser?.uid) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Та өөрийн статусыг өөрчлөх боломжгүй.',
      });
      return;
    }

    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, { status: status });
      setUsers(prevUsers => prevUsers.map(u => u.uid === userId ? { ...u, status } : u));
      toast({
          title: 'Статус амжилттай өөрчиллөө',
          description: `Хэрэглэгчийн төлөв "${status}" боллоо.`,
      });
    } catch (error) {
       console.error("Error updating status: ", error);
       toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Хэрэглэгчийн статус өөрчлөхөд алдаа гарлаа.',
      });
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    if (userId === currentUser?.uid) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Та өөрийн эрхийг өөрчлөх боломжгүй.',
      });
      return;
    }

    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, { role });
      setUsers(prevUsers => prevUsers.map(u => u.uid === userId ? { ...u, role } : u));
      toast({
        title: 'Эрх амжилттай өөрчиллөө',
        description: `Хэрэглэгчийн эрх "${role === 'admin' ? 'Админ' : 'Менежер'}" боллоо.`,
      });
    } catch (error) {
      console.error("Error updating role: ", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Хэрэглэгчийн эрх өөрчлөхөд алдаа гарлаа.',
      });
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
          title: 'Нууц үг сэргээх и-мэйл илгээлээ',
          description: `${email} хаяг руу нууц үг сэргээх заавар илгээгдлээ.`,
      });
    } catch (error) {
      console.error("Error sending password reset email: ", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Нууц үг сэргээх и-мэйл илгээхэд алдаа гарлаа.',
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Системийн хэрэглэгчид</h1>
          <p className="text-muted-foreground">
            Хэрэглэгчдийн мэдээллийг удирдах, эрх олгох.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchUsers} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Хэрэглэгчдийн жагсаалт</CardTitle>
          <CardDescription>Системд бүртгэлтэй бүх хэрэглэгчид.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>И-мэйл</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Эрх</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Бүртгүүлсэн</TableHead>
                <TableHead><span className="sr-only">Үйлдэл</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : (
                users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.lastName} {user.firstName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell>{user.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Цэс нээх</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Үйлдлүүд</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {user.status === 'pending' && (
                                      <DropdownMenuItem onClick={() => handleStatusChange(user.uid, 'active')}>
                                          Хүсэлт зөвшөөрөх
                                      </DropdownMenuItem>
                                  )}
                                  {user.status === 'active' && (
                                       <DropdownMenuItem 
                                        onClick={() => handleStatusChange(user.uid, 'inactive')}
                                        disabled={user.uid === currentUser?.uid}
                                       >
                                          Идэвхгүй болгох
                                      </DropdownMenuItem>
                                  )}
                                   {user.status === 'inactive' && (
                                       <DropdownMenuItem onClick={() => handleStatusChange(user.uid, 'active')}>
                                          Идэвхтэй болгох
                                      </DropdownMenuItem>
                                  )}

                                  {user.role === 'manager' && (
                                    <DropdownMenuItem 
                                      onClick={() => handleRoleChange(user.uid, 'admin')}
                                      disabled={user.uid === currentUser?.uid}
                                    >
                                      Админ болгох
                                    </DropdownMenuItem>
                                  )}
                                  {user.role === 'admin' && (
                                    <DropdownMenuItem 
                                      onClick={() => handleRoleChange(user.uid, 'manager')}
                                      disabled={user.uid === currentUser?.uid}
                                    >
                                      Менежер болгох
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem onClick={() => handleResetPassword(user.email)}>
                                      Нууц үг сэргээх
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
