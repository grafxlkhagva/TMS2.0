/**
 * Гэрээний модулийн сервис
 * - Гэрээний загвар (template) CRUD
 * - Гэрээ (contract) үүсгэх, унших
 * - Системийн entity-ээс мэдээлэл татах (resolve)
 */

import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { customerService } from '@/services/customerService';
import type {
  Contract,
  ContractTemplate,
  ContractTemplateField,
  ContractFieldSource,
  ContractApprovalStep,
  ContractActivityEntry,
  ContractStatus,
} from '@/types';

// Firestore collections
const TEMPLATES_COLLECTION = 'contract_templates';
const CONTRACTS_COLLECTION = 'contracts';

// ==================== Entity data resolvers ====================
// Системийн бүртгэлийн талбаруудаас мэдээлэл татах

const CUSTOMER_PATHS: Record<string, string> = {
  name: 'name',
  registerNumber: 'registerNumber',
  address: 'address',
  officePhone: 'officePhone',
  email: 'email',
  industry: 'industry',
};

const VEHICLE_PATHS: Record<string, string> = {
  licensePlate: 'licensePlate',
  modelName: 'modelName',
  makeName: 'makeName',
  capacity: 'capacity',
  vin: 'vin',
  vehicleTypeName: 'vehicleTypeName',
};

const DRIVER_PATHS: Record<string, string> = {
  display_name: 'display_name',
  phone_number: 'phone_number',
  registerNumber: 'registerNumber',
  licenseNumber: 'licenseNumber',
};

const WAREHOUSE_PATHS: Record<string, string> = {
  name: 'name',
  location: 'location',
  contactInfo: 'contactInfo',
  conditions: 'conditions',
};

// Vehicle, Driver, Warehouse - өөрийн Firestore queries
async function getVehicleById(id: string): Promise<Record<string, unknown> | null> {
  try {
    const docRef = doc(db, 'vehicles', id);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function getDriverById(id: string): Promise<Record<string, unknown> | null> {
  try {
    const docRef = doc(db, 'Drivers', id);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function getWarehouseById(id: string): Promise<Record<string, unknown> | null> {
  try {
    const docRef = doc(db, 'warehouses', id);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getStringValue(obj: Record<string, unknown>, path: string): string {
  const val = obj[path];
  if (val == null) return '';
  if (typeof val === 'object' && 'toDate' in val) return (val as { toDate: () => Date }).toDate().toLocaleString();
  return String(val);
}

function resolveFromCustomer(data: Record<string, unknown>, path?: string): string {
  const key = path && path in CUSTOMER_PATHS ? path : 'name';
  return getStringValue(data, key);
}

function resolveFromVehicle(data: Record<string, unknown>, path?: string): string {
  const key = path && path in VEHICLE_PATHS ? path : 'licensePlate';
  return getStringValue(data, key);
}

function resolveFromDriver(data: Record<string, unknown>, path?: string): string {
  const key = path && path in DRIVER_PATHS ? path : 'display_name';
  return getStringValue(data, key);
}

function resolveFromWarehouse(data: Record<string, unknown>, path?: string): string {
  const key = path && path in WAREHOUSE_PATHS ? path : 'name';
  return getStringValue(data, key);
}

// ==================== Contract Service ====================

export const contractService = {
  // ---------- Templates ----------

  async getTemplates(): Promise<ContractTemplate[]> {
    const q = query(
      collection(db, TEMPLATES_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate() || new Date(),
      updatedAt: d.data().updatedAt?.toDate() || undefined,
    })) as ContractTemplate[];
  },

  async getTemplateById(id: string): Promise<ContractTemplate | null> {
    const docRef = doc(db, TEMPLATES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || undefined,
    } as ContractTemplate;
  },

  async createTemplate(
    data: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async updateTemplate(
    id: string,
    data: Partial<Omit<ContractTemplate, 'id' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(doc(db, TEMPLATES_COLLECTION, id), {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async deleteTemplate(id: string): Promise<void> {
    await deleteDoc(doc(db, TEMPLATES_COLLECTION, id));
  },

  // ---------- Contracts ----------

  async getContracts(): Promise<Contract[]> {
    const q = query(
      collection(db, CONTRACTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate() || new Date(),
      updatedAt: d.data().updatedAt?.toDate() || undefined,
    })) as Contract[];
  },

  async getContractById(id: string): Promise<Contract | null> {
    const docRef = doc(db, CONTRACTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || undefined,
    } as Contract;
  },

  async createContract(
    data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'approvalSteps' | 'activityLog'>
  ): Promise<string> {
    const activityEntry: ContractActivityEntry = {
      id: crypto.randomUUID(),
      action: 'created',
      performedBy: data.createdBy,
      timestamp: new Date(),
    };
    const docRef = await addDoc(collection(db, CONTRACTS_COLLECTION), {
      ...data,
      approvalSteps: [],
      activityLog: [activityEntry],
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async updateContract(id: string, data: Partial<Contract>): Promise<void> {
    await updateDoc(doc(db, CONTRACTS_COLLECTION, id), {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async deleteContract(id: string): Promise<void> {
    await deleteDoc(doc(db, CONTRACTS_COLLECTION, id));
  },

  // ---------- Workflow Actions ----------

  _addActivity(
    contract: Contract,
    action: string,
    performedBy: { uid: string; name: string },
    comment?: string
  ): ContractActivityEntry[] {
    const entry: ContractActivityEntry = {
      id: crypto.randomUUID(),
      action,
      performedBy,
      comment,
      timestamp: new Date(),
    };
    return [...(contract.activityLog || []), entry];
  },

  async submitForReview(
    id: string,
    contract: Contract,
    approvers: { uid: string; name: string; role: string }[],
    submittedBy: { uid: string; name: string }
  ): Promise<void> {
    const approvalSteps: ContractApprovalStep[] = approvers.map((a, i) => ({
      id: crypto.randomUUID(),
      approverUid: a.uid,
      approverName: a.name,
      role: a.role as ContractApprovalStep['role'],
      status: 'pending',
      order: i,
    }));

    await this.updateContract(id, {
      status: 'pending_review',
      approvalSteps,
      currentApproverUid: approvers[0]?.uid,
      submittedAt: new Date(),
      activityLog: this._addActivity(contract, 'submitted', submittedBy),
    });
  },

  async approve(
    id: string,
    contract: Contract,
    approverUid: string,
    approverName: string,
    comment?: string
  ): Promise<void> {
    const steps = [...(contract.approvalSteps || [])];
    const stepIdx = steps.findIndex((s) => s.approverUid === approverUid && s.status === 'pending');
    if (stepIdx >= 0) {
      steps[stepIdx] = { ...steps[stepIdx], status: 'approved', comment, actionAt: new Date() };
    }

    const allApproved = steps.every((s) => s.status === 'approved');
    const nextPending = steps.find((s) => s.status === 'pending');

    await this.updateContract(id, {
      status: allApproved ? 'approved' : 'pending_review',
      approvalSteps: steps,
      currentApproverUid: nextPending?.approverUid || undefined,
      approvedAt: allApproved ? new Date() : undefined,
      activityLog: this._addActivity(contract, 'approved', { uid: approverUid, name: approverName }, comment),
    });
  },

  async reject(
    id: string,
    contract: Contract,
    approverUid: string,
    approverName: string,
    reason: string
  ): Promise<void> {
    const steps = [...(contract.approvalSteps || [])];
    const stepIdx = steps.findIndex((s) => s.approverUid === approverUid && s.status === 'pending');
    if (stepIdx >= 0) {
      steps[stepIdx] = { ...steps[stepIdx], status: 'rejected', comment: reason, actionAt: new Date() };
    }

    await this.updateContract(id, {
      status: 'rejected',
      approvalSteps: steps,
      currentApproverUid: undefined,
      rejectedReason: reason,
      activityLog: this._addActivity(contract, 'rejected', { uid: approverUid, name: approverName }, reason),
    });
  },

  async requestRevision(
    id: string,
    contract: Contract,
    approverUid: string,
    approverName: string,
    comment: string
  ): Promise<void> {
    const steps = [...(contract.approvalSteps || [])];
    const stepIdx = steps.findIndex((s) => s.approverUid === approverUid && s.status === 'pending');
    if (stepIdx >= 0) {
      steps[stepIdx] = { ...steps[stepIdx], status: 'revision_requested', comment, actionAt: new Date() };
    }

    await this.updateContract(id, {
      status: 'revision_requested',
      approvalSteps: steps,
      currentApproverUid: undefined,
      activityLog: this._addActivity(contract, 'revision_requested', { uid: approverUid, name: approverName }, comment),
    });
  },

  async resubmit(
    id: string,
    contract: Contract,
    submittedBy: { uid: string; name: string }
  ): Promise<void> {
    const steps = (contract.approvalSteps || []).map((s) => ({
      ...s,
      status: 'pending' as const,
      comment: undefined,
      actionAt: undefined,
    }));

    await this.updateContract(id, {
      status: 'pending_review',
      approvalSteps: steps,
      currentApproverUid: steps[0]?.approverUid,
      rejectedReason: undefined,
      activityLog: this._addActivity(contract, 'resubmitted', submittedBy),
    });
  },

  async activate(
    id: string,
    contract: Contract,
    activatedBy: { uid: string; name: string }
  ): Promise<void> {
    await this.updateContract(id, {
      status: 'active',
      activityLog: this._addActivity(contract, 'activated', activatedBy),
    });
  },

  async terminate(
    id: string,
    contract: Contract,
    terminatedBy: { uid: string; name: string },
    reason?: string
  ): Promise<void> {
    await this.updateContract(id, {
      status: 'terminated',
      activityLog: this._addActivity(contract, 'terminated', terminatedBy, reason),
    });
  },

  // ---------- Resolve: системийн талбаруудаас мэдээлэл татах ----------

  /**
   * Гэрээний загвар + entity ID-ууд дээр үндэслэн resolvedData үүсгэнэ.
   * Системийн customers, vehicles, drivers, warehouses-аас талбаруудыг татаж оруулна.
   */
  async resolveTemplateData(
    template: ContractTemplate,
    linkedEntities: {
      customerId?: string;
      vehicleId?: string;
      driverId?: string;
      warehouseId?: string;
    }
  ): Promise<Record<string, string>> {
    const resolved: Record<string, string> = {};

    let customerData: Record<string, unknown> | null = null;
    let vehicleData: Record<string, unknown> | null = null;
    let driverData: Record<string, unknown> | null = null;
    let warehouseData: Record<string, unknown> | null = null;

    if (linkedEntities.customerId) {
      const c = await customerService.getCustomerById(linkedEntities.customerId);
      customerData = c ? (c as unknown as Record<string, unknown>) : null;
    }
    if (linkedEntities.vehicleId) {
      vehicleData = await getVehicleById(linkedEntities.vehicleId);
    }
    if (linkedEntities.driverId) {
      driverData = await getDriverById(linkedEntities.driverId);
    }
    if (linkedEntities.warehouseId) {
      warehouseData = await getWarehouseById(linkedEntities.warehouseId);
    }

    for (const field of template.fields.sort((a, b) => a.order - b.order)) {
      switch (field.source) {
        case 'customer':
          resolved[field.id] = customerData
            ? resolveFromCustomer(customerData, field.sourcePath)
            : field.defaultValue ?? '';
          break;
        case 'vehicle':
          resolved[field.id] = vehicleData
            ? resolveFromVehicle(vehicleData, field.sourcePath)
            : field.defaultValue ?? '';
          break;
        case 'driver':
          resolved[field.id] = driverData
            ? resolveFromDriver(driverData, field.sourcePath)
            : field.defaultValue ?? '';
          break;
        case 'warehouse':
          resolved[field.id] = warehouseData
            ? resolveFromWarehouse(warehouseData, field.sourcePath)
            : field.defaultValue ?? '';
          break;
        case 'manual':
        default:
          resolved[field.id] = field.defaultValue ?? '';
          break;
      }
    }

    return resolved;
  },

  /** Дарааллын дугаар үүсгэх (жишээ: CON-2025-0001) */
  generateContractNumber(): string {
    const year = new Date().getFullYear();
    const r = Math.floor(Math.random() * 9000) + 1000;
    return `CON-${year}-${r}`;
  },
};
