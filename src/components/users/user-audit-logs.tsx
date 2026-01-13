'use client';

import * as React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Loader2, History } from 'lucide-react';

interface AuditLog {
    id: string;
    targetUserId: string;
    action: string;
    changedBy: {
        uid: string;
        name: string;
    };
    details: string;
    timestamp: Date;
}

interface UserAuditLogsProps {
    userId: string | null;
    userName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function UserAuditLogs({
    userId,
    userName,
    isOpen,
    onClose,
}: UserAuditLogsProps) {
    const [logs, setLogs] = React.useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (userId && isOpen) {
            const fetchLogs = async () => {
                setIsLoading(true);
                try {
                    if (!db) return;
                    const q = query(
                        collection(db, 'audit_logs'),
                        where('targetUserId', '==', userId),
                        orderBy('timestamp', 'desc')
                    );
                    const querySnapshot = await getDocs(q);
                    const logsData = querySnapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                        timestamp: doc.data().timestamp.toDate(),
                    })) as AuditLog[];
                    setLogs(logsData);
                } catch (error) {
                    console.error('Error fetching audit logs:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchLogs();
        }
    }, [userId, isOpen]);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[450px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Үйлдлийн түүх
                    </SheetTitle>
                    <SheetDescription>
                        {userName} хэрэглэгчийн эрх, статус болон мэдээлэлд орсон өөрчлөлтүүд.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-8 space-y-6">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Өөрчлөлтийн түүх байхгүй байна.
                        </div>
                    ) : (
                        <div className="relative space-y-4 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                            {logs.map((log) => (
                                <div key={log.id} className="relative pl-8">
                                    <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full border bg-background flex items-center justify-center">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="text-sm font-medium">{log.action}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {log.details}
                                        </div>
                                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <span className="font-medium text-foreground">
                                                {log.changedBy.name}
                                            </span>
                                            <span>•</span>
                                            <span>{format(log.timestamp, 'yyyy/MM/dd HH:mm')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
