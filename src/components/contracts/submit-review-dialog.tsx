'use client';

import * as React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Approver {
  uid: string;
  name: string;
  role: string;
}

interface SubmitReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (approvers: Approver[]) => void;
}

export function SubmitReviewDialog({ open, onOpenChange, onSubmit }: SubmitReviewDialogProps) {
  const [users, setUsers] = React.useState<Approver[]>([]);
  const [selectedUids, setSelectedUids] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    getDocs(collection(db, 'users'))
      .then((snap) => {
        const approvers: Approver[] = [];
        snap.docs.forEach((d) => {
          const data = d.data();
          const role = data.role as string;
          if (['admin', 'management'].includes(role) && data.status === 'active') {
            approvers.push({
              uid: d.id,
              name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              role,
            });
          }
        });
        setUsers(approvers);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const handleSubmit = () => {
    const selected = users.filter((u) => selectedUids.has(u.uid));
    if (selected.length === 0) return;
    onSubmit(selected);
    setSelectedUids(new Set());
    onOpenChange(false);
  };

  const filtered = search.trim()
    ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Хянуулахаар илгээх</DialogTitle>
          <DialogDescription>Батлагч сонгоно уу (admin, management эрхтэй хэрэглэгчид)</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Input
              placeholder="Нэрээр хайх..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ScrollArea className="h-[200px] rounded-md border mt-2">
              <div className="p-1">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Батлагч олдсонгүй</p>
                ) : (
                  filtered.map((u) => (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => toggle(u.uid)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-left transition-colors',
                        selectedUids.has(u.uid) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                    >
                      <Shield className={cn('h-4 w-4', selectedUids.has(u.uid) ? 'text-primary-foreground' : 'text-muted-foreground')} />
                      <span className="font-medium flex-1">{u.name}</span>
                      <span className={cn('text-xs', selectedUids.has(u.uid) ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{u.role}</span>
                      {selectedUids.has(u.uid) && <Check className="h-4 w-4 ml-1" />}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
          <Button onClick={handleSubmit} disabled={selectedUids.size === 0}>
            Илгээх ({selectedUids.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
