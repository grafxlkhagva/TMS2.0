

'use client';

import * as React from 'react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Driver, SystemUser } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Link2, Loader2, UserCheck, UserX } from 'lucide-react';

interface UnlinkedUser extends SystemUser {
    matchingDrivers: Driver[];
}

export default function ReconciliationPage() {
    const [unlinkedUsers, setUnlinkedUsers] = React.useState<UnlinkedUser[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isLinking, setIsLinking] = React.useState<string | null>(null);
    const { toast } = useToast();

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const usersQuery = query(collection(db, "users"), where("role", "==", "driver"));
            const driversQuery = query(collection(db, "Drivers"));

            const [usersSnapshot, driversSnapshot] = await Promise.all([
                getDocs(usersQuery),
                getDocs(driversQuery)
            ]);
            
            const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data() } as SystemUser));
            const allDrivers = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));

            const linkedDriverAuthUids = allDrivers
                .map(d => d.authUid)
                .filter((uid): uid is string => !!uid);
            
            const usersToLink = allUsers.filter(user => !linkedDriverAuthUids.includes(user.uid));

            const unlinkedUsersWithMatches: UnlinkedUser[] = usersToLink.map(user => {
                const matchingDrivers = allDrivers.filter(driver => 
                    driver.phone_number === user.phone && !driver.authUid
                );
                return { ...user, matchingDrivers };
            });

            setUnlinkedUsers(unlinkedUsersWithMatches);
            
        } catch (error) {
            console.error("Error fetching data for reconciliation:", error);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Бүртгэл цэгцлэх мэдээллийг татахад алдаа гарлаа.'
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleLinkDriver = async (userId: string, driverId: string) => {
        setIsLinking(userId);
        try {
            const driverRef = doc(db, 'Drivers', driverId);
            await updateDoc(driverRef, { authUid: userId });

            toast({
                title: 'Амжилттай холбогдлоо',
                description: 'Жолоочны бүртгэл болон нэвтрэх эрхийг холболоо.'
            });
            fetchData();
        } catch (error) {
            console.error("Error linking driver:", error);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Бүртгэл холбоход алдаа гарлаа.'
            });
        } finally {
            setIsLinking(null);
        }
    }

    return (
        <div className="container mx-auto py-6">
             <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Бүртгэл цэгцлэх</h1>
                    <p className="text-muted-foreground">
                        Системд нэвтэрсэн боловч жолоочийн бүртгэлтэй холбогдоогүй хэрэглэгчдийг цэгцлэх.
                    </p>
                </div>
                 <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Холболтгүй бүртгэлүүд</CardTitle>
                    <CardDescription>
                        Эдгээр хэрэглэгчид "Тээвэрчин" эрхээр системд бүртгэл үүсгэсэн боловч жолоочийн мэдээлэлтэй холбогдоогүй байна.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                           {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                        </div>
                    ) : unlinkedUsers.length === 0 ? (
                        <Alert variant="default" className="bg-green-50 border-green-200">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Бүх бүртгэл цэгцтэй байна</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Холболт хийгдээгүй жолоочны бүртгэл олдсонгүй.
                            </AlertDescription>
                        </Alert>
                    ) : (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Нэвтэрсэн хэрэглэгч</TableHead>
                                    <TableHead>Таарах жолооч</TableHead>
                                    <TableHead className="text-right">Үйлдэл</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {unlinkedUsers.map(user => (
                                    <TableRow key={user.uid}>
                                        <TableCell>
                                            <p className="font-medium">{user.lastName} {user.firstName}</p>
                                            <p className="text-sm text-muted-foreground">{user.phone}</p>
                                        </TableCell>
                                        <TableCell>
                                            {user.matchingDrivers.length > 0 ? (
                                                <Select onValueChange={(driverId) => handleLinkDriver(user.uid, driverId)}>
                                                    <SelectTrigger className="w-[250px]">
                                                        <SelectValue placeholder="Таарах жолооч сонгох..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {user.matchingDrivers.map(driver => (
                                                            <SelectItem key={driver.id} value={driver.id}>
                                                                {driver.display_name} ({driver.phone_number})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex items-center text-sm text-muted-foreground">
                                                    <UserX className="mr-2 h-4 w-4" />
                                                    <span>Таарах жолооч олдсонгүй</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                size="sm"
                                                disabled={true} // Logic handled by Select onValueChange
                                            >
                                               {isLinking === user.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Link2 className="mr-2 h-4 w-4" />}
                                                Холбох
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
