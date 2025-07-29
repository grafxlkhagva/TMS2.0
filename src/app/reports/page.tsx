'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const { toast } = useToast();

  const handleDownload = () => {
    // In a real application, this would trigger a CSV download.
    // For now, we'll just show a notification.
    toast({
      title: "Report Generated",
      description: "Your performance report is being downloaded.",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Report Generation</h1>
        <p className="text-muted-foreground">
          Download performance reports for data analysis.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Delivery Performance Report</CardTitle>
          <CardDescription>
            Generate a CSV export summarizing delivery times, successful deliveries, and other key metrics for the past month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Monthly Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
