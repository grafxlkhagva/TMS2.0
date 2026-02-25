/**
 * Гэрээний талбарууд - системийн бүртгэлээс татаж авах боломжтой эх сурвалжууд
 */

import type { ContractFieldSource } from '@/types';

export type SourceFieldOption = { value: string; label: string };

export const SOURCE_FIELD_OPTIONS: Record<
  Exclude<ContractFieldSource, 'manual'>,
  SourceFieldOption[]
> = {
  customer: [
    { value: 'name', label: 'Нэр' },
    { value: 'registerNumber', label: 'Регистрийн дугаар' },
    { value: 'address', label: 'Хаяг' },
    { value: 'officePhone', label: 'Утас' },
    { value: 'email', label: 'И-мэйл' },
    { value: 'industry', label: 'Салбар' },
  ],
  vehicle: [
    { value: 'licensePlate', label: 'Улсын дугаар' },
    { value: 'modelName', label: 'Загвар' },
    { value: 'makeName', label: 'Үйлдвэрлэгч' },
    { value: 'capacity', label: 'Даац' },
    { value: 'vin', label: 'VIN код' },
    { value: 'vehicleTypeName', label: 'Төрөл' },
  ],
  driver: [
    { value: 'display_name', label: 'Нэр' },
    { value: 'phone_number', label: 'Утас' },
    { value: 'registerNumber', label: 'Регистр' },
    { value: 'licenseNumber', label: 'Жолооны үнэмлэх' },
  ],
  warehouse: [
    { value: 'name', label: 'Нэр' },
    { value: 'location', label: 'Байршил' },
    { value: 'contactInfo', label: 'Холбоо барих' },
    { value: 'conditions', label: 'Нөхцөл' },
  ],
};

export const SOURCE_LABELS: Record<ContractFieldSource, string> = {
  customer: 'Харилцагч',
  vehicle: 'Тээврийн хэрэгсэл',
  driver: 'Тээвэрчин',
  warehouse: 'Агуулах',
  manual: 'Гараар',
};
