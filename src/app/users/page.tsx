'use client';

import * as React from 'react';
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
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SystemUser, UserStatus, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Mock data for demonstration purposes
const initialUsers: SystemUser[] = [
    { uid: 'user-001', firstName: 'Болд', lastName: 'Бат', phone: '99887766', email: 'bold@example.com', role: 'manager', status: 'pending', createdAt: new Date() },
    { uid: 'user-002', firstName: 'Дорж', lastName: 'Цэцэг', phone: '88776655', email: 'dorj@example.com', role: 'manager', status: 'active', createdAt: new Date() },
    { uid: 'user-003', firstName: 'Админ', lastName: 'Систем', phone: '99112233', email: 'admin@tumen.tech', role: 'admin', status: 'active', createdAt: new Date() },
    { uid: 'user-004', firstName: 'Тулга', lastName: 'Ган', phone: '88112233', email: 'tulga@example.com', role: 'manager', status: 'inactive', createdAt: new Date() },
];


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
  const [users, setUsers] = React.useState<SystemUser[]>(initialUsers);
  const { toast } = useToast();
  
  const handleStatusChange = (userId: string, status: UserStatus) => {
    // TODO: Implement actual logic to update user status in Firestore
    setUsers(prevUsers => prevUsers.map(u => u.uid === userId ? { ...u, status } : u));
    toast({
        title: 'Статус амжилттай өөрчиллөө',
        description: `Хэрэглэгч ${userId}-н төлөв "${status}" боллоо.`,
    });
  };

  const handleResetPassword = (email: string) => {
    // TODO: Implement Firebase password reset logic
    toast({
        title: 'Нууц үг сэргээх и-мэйл илгээлээ',
        description: `${email} хаяг руу нууц үг сэргээх заавар илгээгдлээ.`,
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Системийн хэрэглэгчид</h1>
        <p className="text-muted-foreground">
          Хэрэглэгчдийн мэдээллийг удирдах, эрх олгох.
        </p>
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
              {users.map((user) => (
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
                                {user.status === 'pending' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(user.uid, 'active')}>
                                        Хүсэлт зөвшөөрөх
                                    </DropdownMenuItem>
                                )}
                                {user.status === 'active' && (
                                     <DropdownMenuItem onClick={() => handleStatusChange(user.uid, 'inactive')}>
                                        Идэвхгүй болгох
                                    </DropdownMenuItem>
                                )}
                                 {user.status === 'inactive' && (
                                     <DropdownMenuItem onClick={() => handleStatusChange(user.uid, 'active')}>
                                        Идэвхтэй болгох
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleResetPassword(user.email)}>
                                    Нууц үг сэргээх
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
