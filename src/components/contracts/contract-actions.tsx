'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle2, XCircle, AlertTriangle, Zap, Ban, RotateCcw } from 'lucide-react';
import type { Contract } from '@/types';

interface ContractActionsProps {
  contract: Contract;
  currentUserUid: string;
  isStaff: boolean;
  onSubmitForReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRequestRevision: () => void;
  onActivate: () => void;
  onTerminate: () => void;
  onResubmit: () => void;
}

export function ContractActions({
  contract,
  currentUserUid,
  isStaff,
  onSubmitForReview,
  onApprove,
  onReject,
  onRequestRevision,
  onActivate,
  onTerminate,
  onResubmit,
}: ContractActionsProps) {
  const isCurrentApprover = contract.currentApproverUid === currentUserUid;
  const isCreator = contract.createdBy?.uid === currentUserUid;

  return (
    <div className="space-y-2">
      {/* Draft -> Submit for review */}
      {contract.status === 'draft' && (isCreator || isStaff) && (
        <Button className="w-full justify-start" onClick={onSubmitForReview}>
          <Send className="mr-2 h-4 w-4" />
          Хянуулахаар илгээх
        </Button>
      )}

      {/* Pending review -> Approve / Reject / Request Revision */}
      {contract.status === 'pending_review' && (isCurrentApprover || isStaff) && (
        <>
          <Button className="w-full justify-start" variant="default" onClick={onApprove}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Батлах
          </Button>
          <Button className="w-full justify-start" variant="outline" onClick={onRequestRevision}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Засвар шаардах
          </Button>
          <Button className="w-full justify-start" variant="destructive" onClick={onReject}>
            <XCircle className="mr-2 h-4 w-4" />
            Татгалзах
          </Button>
        </>
      )}

      {/* Revision requested -> Resubmit */}
      {contract.status === 'revision_requested' && (isCreator || isStaff) && (
        <Button className="w-full justify-start" onClick={onResubmit}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Засаад дахин илгээх
        </Button>
      )}

      {/* Approved -> Activate */}
      {contract.status === 'approved' && isStaff && (
        <Button className="w-full justify-start" onClick={onActivate}>
          <Zap className="mr-2 h-4 w-4" />
          Идэвхжүүлэх
        </Button>
      )}

      {/* Active -> Terminate */}
      {contract.status === 'active' && isStaff && (
        <Button className="w-full justify-start" variant="destructive" onClick={onTerminate}>
          <Ban className="mr-2 h-4 w-4" />
          Цуцлах
        </Button>
      )}
    </div>
  );
}
