

'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, CaseSensitive, Map, Truck, Car, Container, Package } from "lucide-react";
import Link from "next/link";

const settingsItems = [
    {
        title: "Үйл ажиллагааны чиглэл",
        description: "Харилцагчийн үйл ажиллагааны чиглэлийн лавлах сан.",
        href: "/settings/industries",
        icon: CaseSensitive
    },
    {
        title: "Бүс нутаг",
        description: "Аймаг, нийслэлийн нэрийг удирдах лавлах сан.",
        href: "/settings/regions",
        icon: Map
    },
    {
        title: "Үйлчилгээний төрөл",
        description: "Тээврийн үйлчилгээний төрлүүдийг удирдах лавлах сан.",
        href: "/settings/service-types",
        icon: Truck
    },
    {
        title: "Машины төрөл",
        description: "Машины төрлүүдийг удирдах лавлах сан.",
        href: "/settings/vehicle-types",
        icon: Car
    },
    {
        title: "Тэвшний төрөл",
        description: "Тэвшний төрлүүдийг удирдах лавлах сан.",
        href: "/settings/trailer-types",
        icon: Container
    },
    {
        title: "Баглаа боодлын төрөл",
        description: "Ачааны баглаа боодлын төрлийн лавлах сан.",
        href: "/settings/packaging-types",
        icon: Package
    }
]

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Тохиргоо</h1>
        <p className="text-muted-foreground">
          Системийн ерөнхий тохиргоо болон лавлах сангуудыг удирдах хэсэг.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsItems.map((item) => (
            <Link href={item.href} key={item.href}>
                <Card className="h-full hover:border-primary transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <item.icon className="h-5 w-5 text-primary"/>
                                {item.title}
                            </CardTitle>
                            <CardDescription className="mt-2">{item.description}</CardDescription>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground"/>
                    </CardHeader>
                </Card>
            </Link>
        ))}
      </div>
    </div>
  );
}
