'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Briefcase, Mail, Phone, FileText, User, Upload, Camera } from 'lucide-react';
import type { Customer } from '@/types';
import { customerService } from '@/services/customerService';
import { useToast } from '@/hooks/use-toast';

interface CustomerInfoCardProps {
    customer: Customer;
    onUpdate: (updatedCustomer: Partial<Customer>) => void;
}

function CustomerDetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="font-medium">{value}</div>
            </div>
        </div>
    );
}

export function CustomerInfoCard({ customer, onUpdate }: CustomerInfoCardProps) {
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const downloadURL = await customerService.uploadLogo(customer.id, file);
            onUpdate({ logoUrl: downloadURL });
            toast({ title: 'Амжилттай', description: 'Байгууллагын логог шинэчиллээ.' });
        } catch (error) {
            console.error("Error uploading logo:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Лого оруулахад алдаа гарлаа.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Байгууллагын мэдээлэл</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="md:col-span-2 lg:col-span-3">
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full md:w-auto">
                            {isUploading ? <Upload className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                            Лого солих
                        </Button>
                    </div>
                    <CustomerDetailItem icon={Building} label="Регистрийн дугаар" value={customer.registerNumber} />
                    <CustomerDetailItem icon={Briefcase} label="Үйл ажиллагааны чиглэл" value={customer.industry} />
                    <CustomerDetailItem icon={Mail} label="Албан ёсны и-мэйл" value={customer.email} />
                    <CustomerDetailItem icon={Phone} label="Оффисын утас" value={customer.officePhone} />
                    <CustomerDetailItem icon={FileText} label="Албан ёсны хаяг" value={customer.address} />
                    <CustomerDetailItem icon={User} label="Хариуцсан ажилтан" value={customer.assignedTo?.name} />
                    <CustomerDetailItem icon={User} label="Бүртгэсэн ажилтан" value={customer.createdBy?.name} />
                    <CustomerDetailItem icon={FileText} label="Тэмдэглэл" value={customer.note} />
                </div>
            </CardContent>
        </Card>
    );
}
