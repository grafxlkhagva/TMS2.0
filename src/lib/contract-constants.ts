import type { ContractStatus } from '@/types';
import {
  FileEdit,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  CalendarClock,
  TimerOff,
  Ban,
} from 'lucide-react';

// ==================== Status Meta ====================

export const CONTRACT_STATUS_META: Record<
  ContractStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: typeof FileEdit;
  }
> = {
  draft: {
    label: 'Ноорог',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: FileEdit,
  },
  pending_review: {
    label: 'Хянуулж байна',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Clock,
  },
  revision_requested: {
    label: 'Засвар шаардсан',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
  },
  approved: {
    label: 'Батлагдсан',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Татгалзсан',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
  },
  active: {
    label: 'Идэвхтэй',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: Zap,
  },
  expiring_soon: {
    label: 'Дуусах гэж байна',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: CalendarClock,
  },
  expired: {
    label: 'Хугацаа дууссан',
    color: 'text-stone-500',
    bgColor: 'bg-stone-100',
    borderColor: 'border-stone-200',
    icon: TimerOff,
  },
  terminated: {
    label: 'Цуцлагдсан',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: Ban,
  },
};

// ==================== Activity Actions ====================

export const ACTIVITY_ACTIONS: Record<string, { label: string; color: string }> = {
  created: { label: 'Үүсгэсэн', color: 'text-blue-600' },
  submitted: { label: 'Хянуулахаар илгээсэн', color: 'text-amber-600' },
  approved: { label: 'Батлагдсан', color: 'text-emerald-600' },
  rejected: { label: 'Татгалзсан', color: 'text-red-600' },
  revision_requested: { label: 'Засвар шаардсан', color: 'text-orange-600' },
  resubmitted: { label: 'Дахин илгээсэн', color: 'text-amber-600' },
  activated: { label: 'Идэвхжүүлсэн', color: 'text-emerald-600' },
  terminated: { label: 'Цуцалсан', color: 'text-red-600' },
  updated: { label: 'Шинэчилсэн', color: 'text-gray-600' },
};

// ==================== Lifecycle Steps ====================

export const LIFECYCLE_STEPS: { status: ContractStatus; label: string }[] = [
  { status: 'draft', label: 'Ноорог' },
  { status: 'pending_review', label: 'Хянуулж байна' },
  { status: 'approved', label: 'Батлагдсан' },
  { status: 'active', label: 'Идэвхтэй' },
];

// ==================== Kanban Columns ====================

export const KANBAN_COLUMNS: { status: ContractStatus; label: string }[] = [
  { status: 'draft', label: 'Ноорог' },
  { status: 'pending_review', label: 'Хянуулж байна' },
  { status: 'revision_requested', label: 'Засвар шаардсан' },
  { status: 'approved', label: 'Батлагдсан' },
  { status: 'active', label: 'Идэвхтэй' },
  { status: 'expired', label: 'Дууссан' },
];
