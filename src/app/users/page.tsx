
'use client';

import * as React from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
import { MoreHorizontal, RefreshCw, UserPlus, Eye, Edit, History, Key } from 'lucide-react';
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
import { UserFilters } from '@/components/users/user-filters';
import { UserDetailsModal } from '@/components/users/user-details-modal';
import { UserAuditLogs } from '@/components/users/user-audit-logs';
import { AddUserModal } from '@/components/users/add-user-modal';
import { logAuditAction } from '@/lib/audit';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const roleNames: Record<UserRole, string> = {
  admin: 'Админ',
  management: 'Удирдлага',
  manager: 'Менежер',
  transport_manager: 'Тээврийн менежер',
  finance_manager: 'Санхүүгийн менежер',
  customer_officer: 'Харилцагчийн ажилтан',
  driver: 'Жолооч',
};

function StatusBadge({ status }: { status: UserStatus }) {
  const variant = status === 'active' ? 'default' : status === 'pending' ? 'secondary' : 'destructive';
  const text = status === 'active' ? 'Идэвхтэй' : status === 'pending' ? 'Хүлээгдэж буй' : 'Идэвхгүй';
  return <Badge variant={variant}>{text}</Badge>;
}

function RoleBadge({ role }: { role: UserRole }) {
  const text = roleNames[role] || 'Тодорхойгүй';
  return <Badge variant="outline">{text}</Badge>;
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<UserStatus | 'all'>('all');

  // Modals state
  const [selectedUser, setSelectedUser] = React.useState<SystemUser | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = React.useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);

  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    if (!db) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Firebase-тэй холбогдож чадсангүй.',
      });
      setIsLoading(false);
      return;
    }
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
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

  const handleSaveDetails = async (data: Partial<SystemUser>) => {
    if (!db || !selectedUser || !currentUser) return;
    const userRef = doc(db, 'users', selectedUser.uid);
    try {
      await updateDoc(userRef, data);

      // Audit Log
      let actionDetails = [];
      if (data.role && data.role !== selectedUser.role) actionDetails.push(`Эрх: ${selectedUser.role} -> ${data.role}`);
      if (data.status && data.status !== selectedUser.status) actionDetails.push(`Статус: ${selectedUser.status} -> ${data.status}`);
      if (data.firstName !== selectedUser.firstName || data.lastName !== selectedUser.lastName) actionDetails.push('Нэр өөрчлөгдсөн');

      await logAuditAction({
        targetUserId: selectedUser.uid,
        action: 'Мэдээлэл шинэчилсэн',
        changedBy: { uid: currentUser.uid, name: `${currentUser.lastName} ${currentUser.firstName}` },
        details: actionDetails.join(', ') || 'Үндсэн мэдээлэл шинэчилсэн'
      });

      setUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, ...data } : u));
      toast({ title: 'Амжилттай', description: 'Мэдээлэл шинэчлэгдлээ.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Шинэчлэхэд алдаа гарлаа.' });
    }
  };

  const handleAddUser = async (data: any) => {
    if (!db || !currentUser) return;
    const tempUid = `invited_${Date.now()}`;
    const newUser: SystemUser = {
      uid: tempUid,
      ...data,
      status: 'pending',
      createdAt: new Date(),
    };

    try {
      await setDoc(doc(db, 'users', tempUid), {
        ...newUser,
        createdAt: serverTimestamp(),
      });

      await logAuditAction({
        targetUserId: tempUid,
        action: 'Шинэ хэрэглэгч нэмсэн',
        changedBy: { uid: currentUser.uid, name: `${currentUser.lastName} ${currentUser.firstName}` },
        details: `Эрх: ${data.role}, И-мэйл: ${data.email}`
      });

      setUsers(prev => [newUser, ...prev]);
      toast({ title: 'Амжилттай', description: 'Шинэ хэрэглэгч бүртгэгдлээ.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Хэрэглэгч нэмэхэд алдаа гарлаа.' });
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Нууц үг сэргээх и-мэйл илгээлээ',
        description: `${email} хаяг руу заавар илгээгдлээ.`,
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'И-мэйл илгээхэд алдаа гарлаа.' });
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchMatch =
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);

    const roleMatch = roleFilter === 'all' || user.role === roleFilter;
    const statusMatch = statusFilter === 'all' || user.status === statusFilter;

    return searchMatch && roleMatch && statusMatch;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Системийн хэрэглэгчид</h1>
          <p className="text-muted-foreground">
            Хэрэглэгчдийн мэдээллийг удирдах, эрх олгох болон үйлдлийн түүх хянах.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsAddUserOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Хэрэглэгч нэмэх
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <UserFilters
            onSearchChange={setSearchQuery}
            onRoleChange={setRoleFilter}
            onStatusChange={setStatusFilter}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Хэрэглэгч</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Эрх</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Бүртгүүлсэн</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Илэрц олдсонгүй.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl} alt={user.firstName} />
                          <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.lastName} {user.firstName}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuLabel>Үйлдлүүд</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setIsDetailsOpen(true);
                          }}>
                            <Edit className="mr-2 h-4 w-4" /> Засах
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setIsAuditLogsOpen(true);
                          }}>
                            <History className="mr-2 h-4 w-4" /> Түүх харах
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleResetPassword(user.email)}>
                            <Key className="mr-2 h-4 w-4" /> Нууц үг сэргээх
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

      {/* Modals */}
      <UserDetailsModal
        isOpen={isDetailsOpen}
        user={selectedUser}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveDetails}
      />

      <UserAuditLogs
        isOpen={isAuditLogsOpen}
        userId={selectedUser?.uid || null}
        userName={selectedUser ? `${selectedUser.lastName} ${selectedUser.firstName}` : ''}
        onClose={() => {
          setIsAuditLogsOpen(false);
          setSelectedUser(null);
        }}
      />

      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onAdd={handleAddUser}
      />
    </div>
  );
}
