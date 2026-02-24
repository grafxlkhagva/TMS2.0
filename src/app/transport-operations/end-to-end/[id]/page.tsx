'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GoogleMap, Marker, Polyline, useLoadScript } from '@react-google-maps/api';
import { PageContainer } from '@/components/patterns/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import LocationPicker from '@/components/location-picker';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  User,
  MapPin,
  Globe,
  PackageCheck,
  HardHat,
  Pencil,
  Save,
  X,
  Route,
  Truck,
} from 'lucide-react';
import { transportOperationService } from '@/services/transportOperationService';
import type { Driver, TransportOperation, TransportOperationType, TransportShipmentDetails, Vehicle, Warehouse } from '@/types';

// ==================== Constants ====================

const TRANSPORT_TYPE_META: Record<
  TransportOperationType,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  local: { label: 'Орон нутгийн тээвэр', icon: MapPin, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  international: { label: 'Олон улсын тээвэр', icon: Globe, color: 'text-purple-700', bgColor: 'bg-purple-100' },
  distribution: { label: 'Түгээлт', icon: PackageCheck, color: 'text-green-700', bgColor: 'bg-green-100' },
  project: { label: 'Төслийн тээвэр', icon: HardHat, color: 'text-orange-700', bgColor: 'bg-orange-100' },
};

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  new: { label: 'Шинэ', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  planning: { label: 'Төлөвлөж байна', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'Явагдаж байна', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Дууссан', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  cancelled: { label: 'Цуцлагдсан', className: 'bg-red-50 text-red-600 border-red-200' },
};

const TRANSPORT_MODES: Array<{ value: TransportShipmentDetails['mode']; label: string }> = [
  { value: 'road', label: 'Road / Авто тээвэр' },
  { value: 'rail', label: 'Rail / Төмөр зам' },
  { value: 'sea', label: 'Sea / Далайн тээвэр' },
  { value: 'air', label: 'Air / Агаарын тээвэр' },
  { value: 'multimodal', label: 'Multimodal / Холимог тээвэр' },
];

const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CIF', 'CPT', 'DAP', 'DDP'];
const ROUTE_INPUT_METHODS = [
  { value: 'address', label: 'Хаягаар хайх' },
  { value: 'warehouse', label: 'Системийн агуулахаар' },
  { value: 'coordinates', label: 'Координатаар оруулах' },
] as const;

type RouteInputMethod = (typeof ROUTE_INPUT_METHODS)[number]['value'];
const mapContainerStyle = { width: '100%', height: '260px' };
const DISPATCH_STAGES = [
  { value: 'new', label: 'Order Intake', progress: 10, status: 'New' },
  { value: 'planned', label: 'Planning / Pre-Dispatch', progress: 22, status: 'Planned' },
  { value: 'assigned', label: 'Assignment', progress: 34, status: 'Assigned' },
  { value: 'ready_to_depart', label: 'Pre-Trip Verification', progress: 50, status: 'Ready to Depart' },
  { value: 'in_transit', label: 'In Transit', progress: 68, status: 'In Transit' },
  { value: 'delivered', label: 'Delivery Execution', progress: 82, status: 'Delivered' },
  { value: 'completed', label: 'Post-Trip / Reconciliation', progress: 92, status: 'Completed' },
  { value: 'closed', label: 'Analytics / Performance', progress: 100, status: 'Closed' },
] as const;
type DispatchStage = (typeof DISPATCH_STAGES)[number]['value'];
const LEGACY_DISPATCH_STAGE_MAP: Partial<Record<string, DispatchStage>> = {
  planning: 'planned',
  ready_for_pickup: 'ready_to_depart',
  issue: 'in_transit',
};
const DISPATCH_PLAYBOOK: Record<DispatchStage, { title: string; focus: string; nextAction: string; output: string }> = {
  new: {
    title: 'Order Intake',
    focus: 'Захиалгыг стандартчлан бүртгэж validation, duplicate, SLA шалгалт хийх.',
    nextAction: 'Order validation болон SLA шалгалт дуусмагц Planning руу шилжүүлнэ.',
    output: 'New',
  },
  planned: {
    title: 'Planning / Pre-Dispatch',
    focus: 'Маршрут, өртөг, даацын төлөвлөлт болон машин-жолоочийн тохиргоог хийх.',
    nextAction: 'Төлөвлөлт баталгаажмагц Assignment шатанд даалгавар онооно.',
    output: 'Planned',
  },
  assigned: {
    title: 'Assignment',
    focus: 'Жолоочид даалгавар хүргэх, accept/reject удирдах, шаардлагатай бол дахин оноох.',
    nextAction: 'Даалгавар баталгаажмагц Pre-Trip Verification руу шилжүүлнэ.',
    output: 'Assigned',
  },
  ready_to_depart: {
    title: 'Pre-Trip Verification',
    focus: 'Гарахаас өмнөх checklist, fuel/safety/docs хангалт, inspection нотолгоо.',
    nextAction: 'Pre-trip шалгалт бүрэн бол In Transit шат руу шилжүүлнэ.',
    output: 'Ready to Depart',
  },
  in_transit: {
    title: 'In Transit',
    focus: 'GPS, ETA, deviation, саатлын мэдээллийг real-time хянаж шинэчлэх.',
    nextAction: 'Хүлээн авагч дээр хүрсний дараа Delivery Execution шат руу шилжүүлнэ.',
    output: 'In Transit',
  },
  delivered: {
    title: 'Delivery Execution',
    focus: 'Хүргэлтийг POD, зураг, гарын үсэг, гэмтлийн тайлангаар баталгаажуулах.',
    nextAction: 'Delivery баталгаажмагц Post-Trip / Reconciliation шат руу шилжүүлнэ.',
    output: 'Delivered',
  },
  completed: {
    title: 'Post-Trip / Reconciliation',
    focus: 'Бодит зардал, км, toll, суутгал, driver settlement, invoice хаалт хийх.',
    nextAction: 'Санхүүгийн хаалт дуусмагц Analytics / Performance шат руу шилжүүлнэ.',
    output: 'Completed',
  },
  closed: {
    title: 'Analytics / Performance',
    focus: 'KPI, SLA, utilization, cost шинжилгээ хийж ажлыг бүрэн хаах.',
    nextAction: 'Ажил хаагдсан тул дараагийн захиалгын мөчлөг рүү шилжинэ.',
    output: 'Closed',
  },
};
const DISPATCH_STAGE_ORDER: DispatchStage[] = DISPATCH_STAGES.map((stage) => stage.value);
const MAPS_SCRIPT_ID = 'tms-google-maps-script';
const MAPS_LIBRARIES: ('places')[] = ['places'];

type ShipmentFormState = {
  mode: TransportShipmentDetails['mode'];
  incoterms: string;
  cargoDescription: string;
  commodityCode: string;
  weightKg: string;
  volumeM3: string;
  packageCount: string;
  temperatureRequirement: string;
  specialHandling: string;
  originInputMethod: RouteInputMethod;
  originWarehouseId: string;
  originCountry: string;
  originCity: string;
  originLocation: string;
  originLat: string;
  originLng: string;
  destinationInputMethod: RouteInputMethod;
  destinationWarehouseId: string;
  destinationCountry: string;
  destinationCity: string;
  destinationLocation: string;
  destinationLat: string;
  destinationLng: string;
  plannedPickupDate: string;
  plannedDeliveryDate: string;
  customsRequired: boolean;
  assignedDriverId: string;
  assignedVehicleId: string;
  assignmentNote: string;
};

type DispatchFormState = {
  stage: DispatchStage;
  etaDate: string;
  currentLocation: string;
  lastEventNote: string;
  intakeValidated: boolean;
  intakeDuplicateChecked: boolean;
  intakeSlaChecked: boolean;
  intakeNote: string;
  planningRouteOptimized: boolean;
  planningCostEstimated: boolean;
  planningLoadPlanned: boolean;
  planningAiMatched: boolean;
  planningNote: string;
  assignmentDriverNotified: boolean;
  assignmentAccepted: boolean;
  assignmentContractReady: boolean;
  assignmentNote: string;
  preTripChecklistDone: boolean;
  preTripFuelChecked: boolean;
  preTripSafetyChecked: boolean;
  preTripDocsChecked: boolean;
  preTripInspectionPhotoUrl: string;
  preTripNote: string;
  transitCheckpointLocation: string;
  transitCheckpointEta: string;
  transitDistanceKm: string;
  transitNote: string;
  deliveredReceiverName: string;
  deliveredPodPhotoUrl: string;
  deliveredSignatureCaptured: boolean;
  deliveredDamageReport: string;
  deliveredAt: string;
  deliveredNote: string;
  postTripActualDistanceKm: string;
  postTripFuelCost: string;
  postTripTollCost: string;
  postTripDelayInfo: string;
  postTripReconciled: boolean;
  postTripInvoiceReady: boolean;
  analyticsSlaRate: string;
  analyticsUtilizationRate: string;
  analyticsKpiPublished: boolean;
  analyticsNote: string;
};

function toDateInputValue(value?: Date): string {
  if (!value) return '';
  const d = new Date(value);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shipmentToForm(details?: TransportShipmentDetails): ShipmentFormState {
  const origin = details?.origin || {};
  const destination = details?.destination || {};
  const assignment = details?.transportAssignment || {};

  return {
    mode: details?.mode || 'road',
    incoterms: details?.incoterms || '',
    cargoDescription: details?.cargoDescription || '',
    commodityCode: details?.commodityCode || '',
    weightKg: details?.weightKg ? String(details.weightKg) : '',
    volumeM3: details?.volumeM3 ? String(details.volumeM3) : '',
    packageCount: details?.packageCount ? String(details.packageCount) : '',
    temperatureRequirement: details?.temperatureRequirement || '',
    specialHandling: details?.specialHandling || '',
    originInputMethod: (origin.inputMethod as RouteInputMethod) || (origin.warehouseId ? 'warehouse' : 'address'),
    originWarehouseId: origin.warehouseId || '',
    originCountry: origin.country || '',
    originCity: origin.city || '',
    originLocation: origin.location || '',
    originLat: origin.lat !== undefined ? String(origin.lat) : '',
    originLng: origin.lng !== undefined ? String(origin.lng) : '',
    destinationInputMethod:
      (destination.inputMethod as RouteInputMethod) || (destination.warehouseId ? 'warehouse' : 'address'),
    destinationWarehouseId: destination.warehouseId || '',
    destinationCountry: destination.country || '',
    destinationCity: destination.city || '',
    destinationLocation: destination.location || '',
    destinationLat: destination.lat !== undefined ? String(destination.lat) : '',
    destinationLng: destination.lng !== undefined ? String(destination.lng) : '',
    plannedPickupDate: toDateInputValue(details?.plannedPickupDate),
    plannedDeliveryDate: toDateInputValue(details?.plannedDeliveryDate),
    customsRequired: Boolean(details?.customsRequired),
    assignedDriverId: assignment.driverId || '',
    assignedVehicleId: assignment.vehicleId || '',
    assignmentNote: assignment.notes || '',
  };
}

function normalizeDispatchStage(value?: string): DispatchStage {
  if (!value) return 'new';
  if (DISPATCH_STAGES.some((stage) => stage.value === value)) {
    return value as DispatchStage;
  }
  return LEGACY_DISPATCH_STAGE_MAP[value] || 'new';
}

function dispatchToForm(details?: TransportShipmentDetails): DispatchFormState {
  const workflow = details?.dispatchTracking?.workflow as Record<string, any> | undefined;
  return {
    stage: normalizeDispatchStage(details?.dispatchTracking?.stage),
    etaDate: toDateInputValue(details?.dispatchTracking?.eta),
    currentLocation: details?.dispatchTracking?.currentLocation || '',
    lastEventNote: details?.dispatchTracking?.lastEventNote || '',
    intakeValidated: Boolean(workflow?.orderIntake?.validated),
    intakeDuplicateChecked: Boolean(workflow?.orderIntake?.duplicateChecked),
    intakeSlaChecked: Boolean(workflow?.orderIntake?.slaChecked),
    intakeNote: workflow?.orderIntake?.note || '',
    planningRouteOptimized: Boolean(workflow?.planning?.routeOptimized),
    planningCostEstimated: Boolean(workflow?.planning?.costEstimated),
    planningLoadPlanned: Boolean(workflow?.planning?.loadPlanned),
    planningAiMatched: Boolean(workflow?.planning?.aiMatched),
    planningNote: workflow?.planning?.note || '',
    assignmentDriverNotified: Boolean(workflow?.assignment?.driverNotified),
    assignmentAccepted: Boolean(workflow?.assignment?.accepted),
    assignmentContractReady: Boolean(workflow?.assignment?.digitalContractReady),
    assignmentNote: workflow?.assignment?.note || '',
    preTripChecklistDone: Boolean(workflow?.preTrip?.checklistDone),
    preTripFuelChecked: Boolean(workflow?.preTrip?.fuelChecked),
    preTripSafetyChecked: Boolean(workflow?.preTrip?.safetyChecked),
    preTripDocsChecked: Boolean(workflow?.preTrip?.docsChecked),
    preTripInspectionPhotoUrl: workflow?.preTrip?.inspectionPhotoUrl || '',
    preTripNote: workflow?.preTrip?.note || '',
    transitCheckpointLocation: workflow?.transit?.checkpointLocation || '',
    transitCheckpointEta: toDateInputValue(workflow?.transit?.checkpointEta),
    transitDistanceKm: workflow?.transit?.distanceKm !== undefined ? String(workflow.transit.distanceKm) : '',
    transitNote: workflow?.transit?.incidentLog || workflow?.transit?.note || '',
    deliveredReceiverName: workflow?.delivery?.receiverName || '',
    deliveredPodPhotoUrl: workflow?.delivery?.podPhotoUrl || '',
    deliveredSignatureCaptured: Boolean(workflow?.delivery?.signatureCaptured),
    deliveredDamageReport: workflow?.delivery?.damageReport || '',
    deliveredAt: toDateInputValue(workflow?.delivery?.deliveredAt),
    deliveredNote: workflow?.delivery?.note || '',
    postTripActualDistanceKm:
      workflow?.postTrip?.actualDistanceKm !== undefined ? String(workflow.postTrip.actualDistanceKm) : '',
    postTripFuelCost: workflow?.postTrip?.fuelCost !== undefined ? String(workflow.postTrip.fuelCost) : '',
    postTripTollCost: workflow?.postTrip?.tollCost !== undefined ? String(workflow.postTrip.tollCost) : '',
    postTripDelayInfo: workflow?.postTrip?.delayInfo || '',
    postTripReconciled: Boolean(workflow?.postTrip?.reconciled),
    postTripInvoiceReady: Boolean(workflow?.postTrip?.invoiceReady),
    analyticsSlaRate: workflow?.analytics?.slaRate !== undefined ? String(workflow.analytics.slaRate) : '',
    analyticsUtilizationRate:
      workflow?.analytics?.utilizationRate !== undefined ? String(workflow.analytics.utilizationRate) : '',
    analyticsKpiPublished: Boolean(workflow?.analytics?.kpiPublished),
    analyticsNote: workflow?.analytics?.note || '',
  };
}

function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripUndefinedDeep(nested);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result as T;
  }
  return value;
}

function buildCurvedPath(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  segments = 24
): Array<{ lat: number; lng: number }> {
  const mid = { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 };
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const distance = Math.hypot(dx, dy) || 0.0001;
  const nx = -dy / distance;
  const ny = dx / distance;
  const curveStrength = Math.min(0.35, distance * 0.15);
  const control = {
    lat: mid.lat + ny * curveStrength,
    lng: mid.lng + nx * curveStrength,
  };

  const points: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const oneMinusT = 1 - t;
    points.push({
      lat: oneMinusT * oneMinusT * start.lat + 2 * oneMinusT * t * control.lat + t * t * end.lat,
      lng: oneMinusT * oneMinusT * start.lng + 2 * oneMinusT * t * control.lng + t * t * end.lng,
    });
  }
  return points;
}

// ==================== Page ====================

export default function TransportOperationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [operation, setOperation] = React.useState<TransportOperation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [editingShipment, setEditingShipment] = React.useState(false);
  const [savingShipment, setSavingShipment] = React.useState(false);
  const [editingDispatch, setEditingDispatch] = React.useState(false);
  const [savingDispatch, setSavingDispatch] = React.useState(false);
  const [shipmentForm, setShipmentForm] = React.useState<ShipmentFormState>(() => shipmentToForm());
  const [dispatchForm, setDispatchForm] = React.useState<DispatchFormState>(() => dispatchToForm());
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const { toast } = useToast();
  const hasMapsApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded: isMapLoaded } = useLoadScript({
    id: MAPS_SCRIPT_ID,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: MAPS_LIBRARIES,
  });

  React.useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const data = await transportOperationService.getById(id);
        if (data) {
          setOperation(data);
          setShipmentForm(shipmentToForm(data.shipmentDetails));
          setDispatchForm(dispatchToForm(data.shipmentDetails));
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error fetching operation:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  React.useEffect(() => {
    const loadWarehouses = async () => {
      if (!db) return;
      try {
        const q = query(collection(db, 'warehouses'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          createdAt: item.data().createdAt?.toDate?.() || new Date(),
          updatedAt: item.data().updatedAt?.toDate?.(),
        })) as Warehouse[];
        setWarehouses(data);
      } catch (error) {
        console.error('Error loading warehouses:', error);
      }
    };
    loadWarehouses();
  }, []);

  React.useEffect(() => {
    const loadResources = async () => {
      if (!db) return;
      try {
        const [driversSnapshot, vehiclesSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'Drivers'))),
          getDocs(query(collection(db, 'vehicles'))),
        ]);

        const driverData = driversSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Driver[];

        const vehicleData = vehiclesSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          createdAt: item.data().createdAt?.toDate?.() || new Date(),
        })) as Vehicle[];

        setDrivers(driverData);
        setVehicles(vehicleData);
      } catch (error) {
        console.error('Error loading drivers/vehicles:', error);
      }
    };
    loadResources();
  }, []);

  const shipmentForRoute = operation?.shipmentDetails;
  const originPoint =
    shipmentForRoute?.origin.lat !== undefined && shipmentForRoute?.origin.lng !== undefined
      ? { lat: shipmentForRoute.origin.lat, lng: shipmentForRoute.origin.lng }
      : null;
  const destinationPoint =
    shipmentForRoute?.destination.lat !== undefined && shipmentForRoute?.destination.lng !== undefined
      ? { lat: shipmentForRoute.destination.lat, lng: shipmentForRoute.destination.lng }
      : null;
  const routeCenter = React.useMemo(() => {
    if (originPoint && destinationPoint) {
      return {
        lat: (originPoint.lat + destinationPoint.lat) / 2,
        lng: (originPoint.lng + destinationPoint.lng) / 2,
      };
    }
    return originPoint || destinationPoint || { lat: 47.91976, lng: 106.91763 };
  }, [originPoint, destinationPoint]);
  const curvedRoutePath = React.useMemo(() => {
    if (!originPoint || !destinationPoint) return [];
    return buildCurvedPath(originPoint, destinationPoint);
  }, [originPoint, destinationPoint]);
  const routeMapRef = React.useRef<google.maps.Map | null>(null);

  const fitRouteOnMap = React.useCallback(() => {
    const map = routeMapRef.current;
    if (!map) return;

    if (originPoint && destinationPoint) {
      const bounds = new google.maps.LatLngBounds();
      curvedRoutePath.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 80);
      return;
    }

    if (originPoint || destinationPoint) {
      map.setCenter(originPoint || destinationPoint!);
      map.setZoom(12);
    }
  }, [curvedRoutePath, originPoint, destinationPoint]);

  React.useEffect(() => {
    if (!isMapLoaded) return;
    fitRouteOnMap();
  }, [fitRouteOnMap, isMapLoaded]);

  // ===== Loading =====
  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          </div>
          <div><Card><CardContent className="pt-6"><Skeleton className="h-60 w-full" /></CardContent></Card></div>
        </div>
      </PageContainer>
    );
  }

  // ===== Not Found =====
  if (notFound || !operation) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-xl font-semibold mb-2">Тээврийн ажил олдсонгүй</h2>
          <p className="text-muted-foreground mb-4">
            Энэ тээврийн ажил устгагдсан эсвэл буруу холбоос байна
          </p>
          <Button variant="outline" onClick={() => router.push('/transport-operations/end-to-end')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
          </Button>
        </div>
      </PageContainer>
    );
  }

  const meta = TRANSPORT_TYPE_META[operation.transportType];
  const statusMeta = STATUS_META[operation.status] || STATUS_META.new;
  const TypeIcon = meta.icon;
  const shipment = operation.shipmentDetails;
  const modeLabel = TRANSPORT_MODES.find((m) => m.value === shipment?.mode)?.label || '-';
  const assignedDriver = drivers.find((driver) => driver.id === shipmentForm.assignedDriverId);
  const assignedVehicle = vehicles.find((vehicle) => vehicle.id === shipmentForm.assignedVehicleId);
  const dispatchDriverName = shipment?.transportAssignment?.driverName;
  const dispatchVehiclePlate = shipment?.transportAssignment?.vehiclePlate;
  const dispatchStage = normalizeDispatchStage(shipment?.dispatchTracking?.stage);
  const dispatchStageForUi = editingDispatch ? dispatchForm.stage : dispatchStage;
  const dispatchStageIndex = Math.max(0, DISPATCH_STAGE_ORDER.indexOf(dispatchStageForUi));
  const dispatchStageMeta = DISPATCH_STAGES.find((s) => s.value === dispatchStageForUi) || DISPATCH_STAGES[0];
  const dispatchPlaybook = DISPATCH_PLAYBOOK[dispatchStageForUi];
  const dispatchCurrentLocation = shipment?.dispatchTracking?.currentLocation;
  const dispatchEta = shipment?.dispatchTracking?.eta;
  const dispatchLastEventAt = shipment?.dispatchTracking?.lastEventAt;
  const dispatchLastEventNote = shipment?.dispatchTracking?.lastEventNote;
  const dispatchWorkflow = shipment?.dispatchTracking?.workflow as Record<string, any> | undefined;
  const dispatchHistory = shipment?.dispatchTracking?.stageHistory || [];
  const dispatchRouteReady = Boolean(
    shipment?.origin.lat !== undefined &&
      shipment?.origin.lng !== undefined &&
      shipment?.destination.lat !== undefined &&
      shipment?.destination.lng !== undefined
  );
  const dispatchChecklist = [
    { label: 'Маршрутын цэг бүрэн', ready: dispatchRouteReady },
    { label: 'Жолооч оноогдсон', ready: Boolean(shipment?.transportAssignment?.driverId) },
    { label: 'Тээврийн хэрэгсэл оноогдсон', ready: Boolean(shipment?.transportAssignment?.vehicleId) },
    { label: 'Ачилтын огноо төлөвлөгдсөн', ready: Boolean(shipment?.plannedPickupDate) },
    { label: 'Order intake шалгалт', ready: Boolean(dispatchWorkflow?.orderIntake?.validated) },
  ];
  const dispatchReadinessScore = Math.round(
    (dispatchChecklist.filter((item) => item.ready).length / dispatchChecklist.length) * 100
  );
  const stageGateChecklist = (() => {
    if (dispatchStageForUi === 'new') {
      const validated = editingDispatch ? dispatchForm.intakeValidated : Boolean(dispatchWorkflow?.orderIntake?.validated);
      const duplicate = editingDispatch
        ? dispatchForm.intakeDuplicateChecked
        : Boolean(dispatchWorkflow?.orderIntake?.duplicateChecked);
      const sla = editingDispatch ? dispatchForm.intakeSlaChecked : Boolean(dispatchWorkflow?.orderIntake?.slaChecked);
      return [
        { label: 'Order validation', ready: validated },
        { label: 'Duplicate check', ready: duplicate },
        { label: 'SLA check', ready: sla },
      ];
    }
    if (dispatchStageForUi === 'planned') {
      return [
        { label: 'Route optimization', ready: editingDispatch ? dispatchForm.planningRouteOptimized : Boolean(dispatchWorkflow?.planning?.routeOptimized) },
        { label: 'Cost estimate', ready: editingDispatch ? dispatchForm.planningCostEstimated : Boolean(dispatchWorkflow?.planning?.costEstimated) },
        { label: 'Load planning', ready: editingDispatch ? dispatchForm.planningLoadPlanned : Boolean(dispatchWorkflow?.planning?.loadPlanned) },
      ];
    }
    if (dispatchStageForUi === 'assigned') {
      return [
        { label: 'Driver notification', ready: editingDispatch ? dispatchForm.assignmentDriverNotified : Boolean(dispatchWorkflow?.assignment?.driverNotified) },
        { label: 'Accept / Reject', ready: editingDispatch ? dispatchForm.assignmentAccepted : Boolean(dispatchWorkflow?.assignment?.accepted) },
        { label: 'Digital contract', ready: editingDispatch ? dispatchForm.assignmentContractReady : Boolean(dispatchWorkflow?.assignment?.digitalContractReady) },
      ];
    }
    if (dispatchStageForUi === 'ready_to_depart') {
      return [
        { label: 'Checklist completed', ready: editingDispatch ? dispatchForm.preTripChecklistDone : Boolean(dispatchWorkflow?.preTrip?.checklistDone) },
        { label: 'Fuel checked', ready: editingDispatch ? dispatchForm.preTripFuelChecked : Boolean(dispatchWorkflow?.preTrip?.fuelChecked) },
        { label: 'Safety checked', ready: editingDispatch ? dispatchForm.preTripSafetyChecked : Boolean(dispatchWorkflow?.preTrip?.safetyChecked) },
        { label: 'Docs checked', ready: editingDispatch ? dispatchForm.preTripDocsChecked : Boolean(dispatchWorkflow?.preTrip?.docsChecked) },
      ];
    }
    if (dispatchStageForUi === 'in_transit') {
      const checkpointLocation = editingDispatch
        ? Boolean(dispatchForm.transitCheckpointLocation.trim())
        : Boolean(dispatchWorkflow?.transit?.checkpointLocation);
      const etaExists = editingDispatch ? Boolean(dispatchForm.etaDate) : Boolean(dispatchEta);
      const currentLoc = editingDispatch
        ? Boolean(dispatchForm.currentLocation.trim())
        : Boolean(dispatchCurrentLocation);
      return [
        { label: 'Одоогийн байршил шинэчлэгдсэн', ready: currentLoc },
        { label: 'Замын checkpoint бүртгэгдсэн', ready: checkpointLocation },
        { label: 'ETA заагдсан', ready: etaExists },
      ];
    }
    if (dispatchStageForUi === 'delivered') {
      const receiverReady = editingDispatch
        ? Boolean(dispatchForm.deliveredReceiverName.trim())
        : Boolean(dispatchWorkflow?.delivery?.receiverName);
      const deliveredAtReady = editingDispatch ? Boolean(dispatchForm.deliveredAt) : Boolean(dispatchWorkflow?.delivery?.deliveredAt);
      return [
        { label: 'Хүлээн авагчийн мэдээлэл', ready: receiverReady },
        {
          label: 'Signature captured',
          ready: editingDispatch ? dispatchForm.deliveredSignatureCaptured : Boolean(dispatchWorkflow?.delivery?.signatureCaptured),
        },
        { label: 'Хүргэлтийн огноо бүртгэгдсэн', ready: deliveredAtReady },
      ];
    }
    if (dispatchStageForUi === 'completed') {
      return [
        { label: 'Actual distance logged', ready: editingDispatch ? Boolean(dispatchForm.postTripActualDistanceKm) : Boolean(dispatchWorkflow?.postTrip?.actualDistanceKm) },
        { label: 'Reconciliation done', ready: editingDispatch ? dispatchForm.postTripReconciled : Boolean(dispatchWorkflow?.postTrip?.reconciled) },
        { label: 'Invoice ready', ready: editingDispatch ? dispatchForm.postTripInvoiceReady : Boolean(dispatchWorkflow?.postTrip?.invoiceReady) },
      ];
    }
    return [
      { label: 'SLA KPI logged', ready: editingDispatch ? Boolean(dispatchForm.analyticsSlaRate) : Boolean(dispatchWorkflow?.analytics?.slaRate) },
      {
        label: 'Utilization KPI logged',
        ready: editingDispatch ? Boolean(dispatchForm.analyticsUtilizationRate) : Boolean(dispatchWorkflow?.analytics?.utilizationRate),
      },
      { label: 'KPI published', ready: editingDispatch ? dispatchForm.analyticsKpiPublished : Boolean(dispatchWorkflow?.analytics?.kpiPublished) },
    ];
  })();
  const stageGateScore = Math.round(
    (stageGateChecklist.filter((item) => item.ready).length / Math.max(stageGateChecklist.length, 1)) * 100
  );
  const nextStageCandidate = dispatchStageIndex < DISPATCH_STAGE_ORDER.length - 1 ? DISPATCH_STAGE_ORDER[dispatchStageIndex + 1] : null;

  const onShipmentChange = (field: keyof ShipmentFormState, value: string | boolean) => {
    setShipmentForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyWarehouseSelection = (side: 'origin' | 'destination', warehouseId: string) => {
    const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
    if (!selectedWarehouse) return;

    if (side === 'origin') {
      setShipmentForm((prev) => ({
        ...prev,
        originInputMethod: 'warehouse',
        originWarehouseId: selectedWarehouse.id,
        originLocation: selectedWarehouse.location || prev.originLocation,
        originLat: selectedWarehouse.geolocation?.lat !== undefined ? String(selectedWarehouse.geolocation.lat) : prev.originLat,
        originLng: selectedWarehouse.geolocation?.lng !== undefined ? String(selectedWarehouse.geolocation.lng) : prev.originLng,
      }));
      return;
    }

    setShipmentForm((prev) => ({
      ...prev,
      destinationInputMethod: 'warehouse',
      destinationWarehouseId: selectedWarehouse.id,
      destinationLocation: selectedWarehouse.location || prev.destinationLocation,
      destinationLat:
        selectedWarehouse.geolocation?.lat !== undefined ? String(selectedWarehouse.geolocation.lat) : prev.destinationLat,
      destinationLng:
        selectedWarehouse.geolocation?.lng !== undefined ? String(selectedWarehouse.geolocation.lng) : prev.destinationLng,
    }));
  };

  const cancelShipmentEdit = () => {
    setShipmentForm(shipmentToForm(operation.shipmentDetails));
    setEditingShipment(false);
  };

  const cancelDispatchEdit = () => {
    setDispatchForm(dispatchToForm(operation.shipmentDetails));
    setEditingDispatch(false);
  };

  const openDispatchEditorAtStage = (stage: DispatchStage) => {
    const base = dispatchToForm(operation.shipmentDetails);
    setDispatchForm({ ...base, stage });
    setEditingDispatch(true);
  };

  const applyDriverSelection = (driverId: string) => {
    const selectedDriver = drivers.find((driver) => driver.id === driverId);
    if (!selectedDriver) return;

    setShipmentForm((prev) => ({
      ...prev,
      assignedDriverId: selectedDriver.id,
      assignedVehicleId: prev.assignedVehicleId || selectedDriver.assignedVehicleId || '',
    }));
  };

  const applyVehicleSelection = (vehicleId: string) => {
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
    if (!selectedVehicle) return;

    setShipmentForm((prev) => ({
      ...prev,
      assignedVehicleId: selectedVehicle.id,
      assignedDriverId: prev.assignedDriverId || selectedVehicle.driverId || '',
    }));
  };

  const saveShipmentDetails = async () => {
    const nextDetails: TransportShipmentDetails = {
      mode: shipmentForm.mode,
      incoterms: shipmentForm.incoterms || undefined,
      cargoDescription: shipmentForm.cargoDescription.trim() || undefined,
      commodityCode: shipmentForm.commodityCode.trim() || undefined,
      weightKg: shipmentForm.weightKg ? Number(shipmentForm.weightKg) : undefined,
      volumeM3: shipmentForm.volumeM3 ? Number(shipmentForm.volumeM3) : undefined,
      packageCount: shipmentForm.packageCount ? Number(shipmentForm.packageCount) : undefined,
      temperatureRequirement: shipmentForm.temperatureRequirement.trim() || undefined,
      specialHandling: shipmentForm.specialHandling.trim() || undefined,
      origin: {
        inputMethod: shipmentForm.originInputMethod,
        warehouseId: shipmentForm.originWarehouseId || undefined,
        warehouseName: warehouses.find((w) => w.id === shipmentForm.originWarehouseId)?.name || undefined,
        country: shipmentForm.originCountry.trim() || undefined,
        city: shipmentForm.originCity.trim() || undefined,
        location: shipmentForm.originLocation.trim() || undefined,
        lat: shipmentForm.originLat ? Number(shipmentForm.originLat) : undefined,
        lng: shipmentForm.originLng ? Number(shipmentForm.originLng) : undefined,
      },
      destination: {
        inputMethod: shipmentForm.destinationInputMethod,
        warehouseId: shipmentForm.destinationWarehouseId || undefined,
        warehouseName: warehouses.find((w) => w.id === shipmentForm.destinationWarehouseId)?.name || undefined,
        country: shipmentForm.destinationCountry.trim() || undefined,
        city: shipmentForm.destinationCity.trim() || undefined,
        location: shipmentForm.destinationLocation.trim() || undefined,
        lat: shipmentForm.destinationLat ? Number(shipmentForm.destinationLat) : undefined,
        lng: shipmentForm.destinationLng ? Number(shipmentForm.destinationLng) : undefined,
      },
      plannedPickupDate: shipmentForm.plannedPickupDate ? new Date(shipmentForm.plannedPickupDate) : undefined,
      plannedDeliveryDate: shipmentForm.plannedDeliveryDate ? new Date(shipmentForm.plannedDeliveryDate) : undefined,
      customsRequired: shipmentForm.customsRequired,
      transportAssignment: {
        driverId: shipmentForm.assignedDriverId || undefined,
        driverName: drivers.find((driver) => driver.id === shipmentForm.assignedDriverId)?.display_name || undefined,
        driverPhone: drivers.find((driver) => driver.id === shipmentForm.assignedDriverId)?.phone_number || undefined,
        vehicleId: shipmentForm.assignedVehicleId || undefined,
        vehiclePlate: vehicles.find((vehicle) => vehicle.id === shipmentForm.assignedVehicleId)?.licensePlate || undefined,
        trailerPlate: vehicles.find((vehicle) => vehicle.id === shipmentForm.assignedVehicleId)?.trailerLicensePlate || undefined,
        vehicleStatus: vehicles.find((vehicle) => vehicle.id === shipmentForm.assignedVehicleId)?.status || undefined,
        notes: shipmentForm.assignmentNote.trim() || undefined,
      },
    };

    if (
      nextDetails.plannedPickupDate &&
      nextDetails.plannedDeliveryDate &&
      nextDetails.plannedDeliveryDate < nextDetails.plannedPickupDate
    ) {
      toast({
        variant: 'destructive',
        title: 'Огнооны алдаа',
        description: 'Хүргэлтийн огноо нь ачилтын огнооноос өмнө байж болохгүй.',
      });
      return;
    }

    if (
      !nextDetails.incoterms &&
      !nextDetails.cargoDescription &&
      !nextDetails.commodityCode &&
      !nextDetails.weightKg &&
      !nextDetails.volumeM3 &&
      !nextDetails.packageCount &&
      !nextDetails.temperatureRequirement &&
      !nextDetails.specialHandling &&
      !nextDetails.origin.warehouseId &&
      !nextDetails.origin.country &&
      !nextDetails.origin.city &&
      !nextDetails.origin.location &&
      !nextDetails.origin.lat &&
      !nextDetails.origin.lng &&
      !nextDetails.destination.warehouseId &&
      !nextDetails.destination.country &&
      !nextDetails.destination.city &&
      !nextDetails.destination.location &&
      !nextDetails.destination.lat &&
      !nextDetails.destination.lng &&
      !nextDetails.plannedPickupDate &&
      !nextDetails.plannedDeliveryDate &&
      !nextDetails.customsRequired &&
      !nextDetails.transportAssignment?.driverId &&
      !nextDetails.transportAssignment?.vehicleId &&
      !nextDetails.transportAssignment?.notes
    ) {
      toast({
        variant: 'destructive',
        title: 'Хоосон мэдээлэл',
        description: 'Хадгалахын тулд дор хаяж 1 талбар бөглөнө үү.',
      });
      return;
    }

    setSavingShipment(true);
    try {
      const sanitizedDetails = stripUndefinedDeep(nextDetails);
      await transportOperationService.update(operation.id, { shipmentDetails: sanitizedDetails });
      setOperation((prev) => (prev ? { ...prev, shipmentDetails: sanitizedDetails, updatedAt: new Date() } : prev));
      setEditingShipment(false);
      toast({ title: 'Амжилттай', description: 'Тээвэрлэлтийн мэдээлэл шинэчлэгдлээ.' });
    } catch (error) {
      console.error('Error updating shipment details:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Тээвэрлэлтийн мэдээлэл хадгалах үед алдаа гарлаа.',
      });
    } finally {
      setSavingShipment(false);
    }
  };

  const saveDispatchDetails = async () => {
    const currentShipment = operation.shipmentDetails || ({} as TransportShipmentDetails);
    const previousStage = normalizeDispatchStage(currentShipment.dispatchTracking?.stage);
    const existingHistory = currentShipment.dispatchTracking?.stageHistory || [];
    const stageChanged = previousStage !== dispatchForm.stage;
    const stageHistory = stageChanged
      ? [
          ...existingHistory,
          {
            stage: dispatchForm.stage,
            at: new Date(),
            note: dispatchForm.lastEventNote.trim() || undefined,
          },
        ]
      : existingHistory;
    const nextDispatch = {
      stage: dispatchForm.stage,
      eta: dispatchForm.etaDate ? new Date(dispatchForm.etaDate) : undefined,
      currentLocation: dispatchForm.currentLocation.trim() || undefined,
      lastEventNote: dispatchForm.lastEventNote.trim() || undefined,
      lastEventAt: new Date(),
      stageHistory,
      workflow: {
        orderIntake: {
          validated: dispatchForm.intakeValidated,
          duplicateChecked: dispatchForm.intakeDuplicateChecked,
          slaChecked: dispatchForm.intakeSlaChecked,
          note: dispatchForm.intakeNote.trim() || undefined,
        },
        planning: {
          routeOptimized: dispatchForm.planningRouteOptimized,
          costEstimated: dispatchForm.planningCostEstimated,
          loadPlanned: dispatchForm.planningLoadPlanned,
          aiMatched: dispatchForm.planningAiMatched,
          note: dispatchForm.planningNote.trim() || undefined,
        },
        assignment: {
          driverNotified: dispatchForm.assignmentDriverNotified,
          accepted: dispatchForm.assignmentAccepted,
          digitalContractReady: dispatchForm.assignmentContractReady,
          note: dispatchForm.assignmentNote.trim() || undefined,
        },
        preTrip: {
          checklistDone: dispatchForm.preTripChecklistDone,
          fuelChecked: dispatchForm.preTripFuelChecked,
          safetyChecked: dispatchForm.preTripSafetyChecked,
          docsChecked: dispatchForm.preTripDocsChecked,
          inspectionPhotoUrl: dispatchForm.preTripInspectionPhotoUrl.trim() || undefined,
          note: dispatchForm.preTripNote.trim() || undefined,
        },
        transit: {
          checkpointLocation: dispatchForm.transitCheckpointLocation.trim() || undefined,
          checkpointEta: dispatchForm.transitCheckpointEta ? new Date(dispatchForm.transitCheckpointEta) : undefined,
          distanceKm: dispatchForm.transitDistanceKm ? Number(dispatchForm.transitDistanceKm) : undefined,
          incidentLog: dispatchForm.transitNote.trim() || undefined,
        },
        delivery: {
          receiverName: dispatchForm.deliveredReceiverName.trim() || undefined,
          podPhotoUrl: dispatchForm.deliveredPodPhotoUrl.trim() || undefined,
          signatureCaptured: dispatchForm.deliveredSignatureCaptured,
          damageReport: dispatchForm.deliveredDamageReport.trim() || undefined,
          deliveredAt: dispatchForm.deliveredAt ? new Date(dispatchForm.deliveredAt) : undefined,
          note: dispatchForm.deliveredNote.trim() || undefined,
        },
        postTrip: {
          actualDistanceKm: dispatchForm.postTripActualDistanceKm ? Number(dispatchForm.postTripActualDistanceKm) : undefined,
          fuelCost: dispatchForm.postTripFuelCost ? Number(dispatchForm.postTripFuelCost) : undefined,
          tollCost: dispatchForm.postTripTollCost ? Number(dispatchForm.postTripTollCost) : undefined,
          delayInfo: dispatchForm.postTripDelayInfo.trim() || undefined,
          reconciled: dispatchForm.postTripReconciled,
          invoiceReady: dispatchForm.postTripInvoiceReady,
        },
        analytics: {
          slaRate: dispatchForm.analyticsSlaRate ? Number(dispatchForm.analyticsSlaRate) : undefined,
          utilizationRate: dispatchForm.analyticsUtilizationRate ? Number(dispatchForm.analyticsUtilizationRate) : undefined,
          kpiPublished: dispatchForm.analyticsKpiPublished,
          note: dispatchForm.analyticsNote.trim() || undefined,
        },
      },
    };

    setSavingDispatch(true);
    try {
      const merged = stripUndefinedDeep({
        ...currentShipment,
        dispatchTracking: nextDispatch,
      }) as TransportShipmentDetails;

      await transportOperationService.update(operation.id, { shipmentDetails: merged });
      setOperation((prev) => (prev ? { ...prev, shipmentDetails: merged, updatedAt: new Date() } : prev));
      setDispatchForm(dispatchToForm(merged));
      setEditingDispatch(false);
      toast({ title: 'Амжилттай', description: 'Диспач мэдээлэл шинэчлэгдлээ.' });
    } catch (error) {
      console.error('Error updating dispatch details:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Диспач мэдээлэл хадгалах үед алдаа гарлаа.',
      });
    } finally {
      setSavingDispatch(false);
    }
  };

  return (
    <PageContainer>
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/transport-operations/end-to-end')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className={`rounded-lg p-2.5 ${meta.bgColor} ${meta.color}`}>
            <TypeIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-headline font-bold">{meta.label}</h1>
              <Badge variant="outline" className={statusMeta.className}>
                {statusMeta.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              ID: {operation.id.slice(0, 12).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* ===== Content ===== */}
      <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ерөнхий мэдээлэл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-x-8 gap-y-2 md:grid-cols-2 text-sm">
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <span className="text-muted-foreground">Тээвэрлэлтийн төрөл</span>
                  <span className="font-medium">{meta.label}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <span className="text-muted-foreground">Гэрээний төлөв</span>
                  <span className="font-medium">{operation.hasContract ? 'Гэрээтэй' : 'Гэрээгүй'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <span className="text-muted-foreground">Харилцагч</span>
                  <span className="font-medium">{operation.customerName}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <span className="text-muted-foreground">Төлөв</span>
                  <Badge variant="outline" className={statusMeta.className}>
                    {statusMeta.label}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <span className="text-muted-foreground">Үүсгэсэн огноо</span>
                  <span className="font-medium text-right">
                    {operation.createdAt.toLocaleString('mn-MN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <span className="text-muted-foreground">Үүсгэсэн хэрэглэгч</span>
                  <span className="font-medium">{operation.createdBy?.name || 'Тодорхойгүй'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <span className="text-muted-foreground">Харилцагчийн ID</span>
                  <span className="font-medium font-mono">{operation.customerId.slice(0, 12)}...</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <span className="text-muted-foreground">Сүүлд шинэчилсэн</span>
                  <span className="font-medium text-right">
                    {operation.updatedAt
                      ? operation.updatedAt.toLocaleString('mn-MN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </span>
                </div>
              </div>
              {shipment && (originPoint || destinationPoint) && (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Тээврийн чиглэлийн газрын зураг</p>
                    <p className="text-xs text-muted-foreground">
                      {originPoint && destinationPoint ? 'Ачилт → Буулгалт' : 'Нэг цэг бүртгэгдсэн'}
                    </p>
                  </div>
                  {!hasMapsApiKey ? (
                    <p className="text-xs text-muted-foreground">Google Maps API key тохируулаагүй байна.</p>
                  ) : !isMapLoaded ? (
                    <Skeleton className="h-[260px] w-full rounded-md" />
                  ) : (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={routeCenter}
                      zoom={originPoint && destinationPoint ? 7 : 12}
                      onLoad={(map) => {
                        routeMapRef.current = map;
                        fitRouteOnMap();
                      }}
                      options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                      }}
                    >
                      {originPoint && (
                        <Marker
                          position={originPoint}
                          title={`Ачих цэг: ${shipment.origin.location || shipment.origin.city || ''}`}
                          icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#2563eb',
                            fillOpacity: 1,
                            strokeColor: '#1e40af',
                            strokeWeight: 2,
                            scale: 7,
                          }}
                        />
                      )}
                      {destinationPoint && (
                        <Marker
                          position={destinationPoint}
                          title={`Буулгах цэг: ${shipment.destination.location || shipment.destination.city || ''}`}
                          icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#dc2626',
                            fillOpacity: 1,
                            strokeColor: '#991b1b',
                            strokeWeight: 2,
                            scale: 7,
                          }}
                        />
                      )}
                      {originPoint && destinationPoint && (
                        <Polyline
                          path={curvedRoutePath}
                          options={{
                            strokeColor: '#0f172a',
                            strokeOpacity: 0.8,
                            strokeWeight: 3,
                            icons: [
                              {
                                icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
                                offset: '100%',
                              },
                            ],
                          }}
                        />
                      )}
                    </GoogleMap>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Ачих:</span>{' '}
                      {[shipment.origin.city, shipment.origin.country].filter(Boolean).join(', ') || '-'}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Буулгах:</span>{' '}
                      {[shipment.destination.city, shipment.destination.country].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="dispatch" className="w-full">
            <TabsList>
              <TabsTrigger value="dispatch">Диспач</TabsTrigger>
              <TabsTrigger value="order">Захиалгын мэдээлэл</TabsTrigger>
            </TabsList>

            <TabsContent value="order" className="mt-4 space-y-6">
          {/* Захиалгын мэдээлэл */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Тээвэрлэлтийн дэлгэрэнгүй</CardTitle>
                {editingShipment ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={cancelShipmentEdit} disabled={savingShipment}>
                      <X className="mr-2 h-4 w-4" />
                      Болих
                    </Button>
                    <Button size="sm" onClick={saveShipmentDetails} disabled={savingShipment}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingShipment ? 'Хадгалж байна...' : 'Хадгалах'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditingShipment(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Засах
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingShipment ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="mode">Тээврийн хэлбэр</Label>
                      <select
                        id="mode"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={shipmentForm.mode}
                        onChange={(e) => onShipmentChange('mode', e.target.value)}
                      >
                        {TRANSPORT_MODES.map((mode) => (
                          <option key={mode.value} value={mode.value}>
                            {mode.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incoterms">Incoterms</Label>
                      <select
                        id="incoterms"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={shipmentForm.incoterms}
                        onChange={(e) => onShipmentChange('incoterms', e.target.value)}
                      >
                        <option value="">Сонгох</option>
                        {INCOTERMS.map((term) => (
                          <option key={term} value={term}>
                            {term}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plannedPickupDate">Төлөвлөсөн ачилтын огноо</Label>
                      <Input
                        id="plannedPickupDate"
                        type="date"
                        value={shipmentForm.plannedPickupDate}
                        onChange={(e) => onShipmentChange('plannedPickupDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plannedDeliveryDate">Төлөвлөсөн хүргэлтийн огноо</Label>
                      <Input
                        id="plannedDeliveryDate"
                        type="date"
                        value={shipmentForm.plannedDeliveryDate}
                        onChange={(e) => onShipmentChange('plannedDeliveryDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temperatureRequirement">Температурын шаардлага</Label>
                      <Input
                        id="temperatureRequirement"
                        value={shipmentForm.temperatureRequirement}
                        onChange={(e) => onShipmentChange('temperatureRequirement', e.target.value)}
                        placeholder="Жишээ: 2-8°C"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customsRequired">Гаалийн бүрдүүлэлт</Label>
                      <select
                        id="customsRequired"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={shipmentForm.customsRequired ? 'yes' : 'no'}
                        onChange={(e) => onShipmentChange('customsRequired', e.target.value === 'yes')}
                      >
                        <option value="no">Шаардлагагүй</option>
                        <option value="yes">Шаардлагатай</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : shipment ? (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Тээврийн хэлбэр</p>
                      <p className="text-sm font-semibold mt-1">{modeLabel}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Incoterms</p>
                      <p className="text-sm font-semibold mt-1">{shipment.incoterms || '-'}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Төлөвлөсөн ачилт</p>
                      <p className="text-sm font-semibold mt-1">
                        {shipment.plannedPickupDate ? shipment.plannedPickupDate.toLocaleDateString('mn-MN') : '-'}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Төлөвлөсөн хүргэлт</p>
                      <p className="text-sm font-semibold mt-1">
                        {shipment.plannedDeliveryDate ? shipment.plannedDeliveryDate.toLocaleDateString('mn-MN') : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Гаалийн бүрдүүлэлт</p>
                    <p className="text-sm font-semibold mt-1">
                      {shipment.customsRequired ? 'Шаардлагатай' : 'Шаардлагагүй'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="mb-3 rounded-full bg-muted/30 p-3">
                    <TypeIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-lg">
                    Олон улсын TMS стандартын дагуу маршрут, ачааны мэдээлэл, Incoterms, гаалийн шаардлага зэрэг
                    талбаруудыг бүртгэнэ. `Засах` товч дээр дарж тээвэрлэлтийн мэдээллээ нэмнэ үү.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Тээвэрчин / Тээврийн хэрэгсэл</CardTitle>
                {editingShipment ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={cancelShipmentEdit} disabled={savingShipment}>
                      <X className="mr-2 h-4 w-4" />
                      Болих
                    </Button>
                    <Button size="sm" onClick={saveShipmentDetails} disabled={savingShipment}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingShipment ? 'Хадгалж байна...' : 'Хадгалах'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditingShipment(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Засах
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingShipment ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="assignedDriverId">Тээвэрчин (жолооч)</Label>
                    <select
                      id="assignedDriverId"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={shipmentForm.assignedDriverId}
                      onChange={(e) => {
                        onShipmentChange('assignedDriverId', e.target.value);
                        applyDriverSelection(e.target.value);
                      }}
                    >
                      <option value="">Сонгоогүй</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.display_name} {driver.phone_number ? `(${driver.phone_number})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignedVehicleId">Тээврийн хэрэгсэл</Label>
                    <select
                      id="assignedVehicleId"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={shipmentForm.assignedVehicleId}
                      onChange={(e) => {
                        onShipmentChange('assignedVehicleId', e.target.value);
                        applyVehicleSelection(e.target.value);
                      }}
                    >
                      <option value="">Сонгоогүй</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.licensePlate} {vehicle.modelName ? `- ${vehicle.modelName}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Сонгосон жолоочийн утас</p>
                    <p className="text-sm font-medium mt-1">{assignedDriver?.phone_number || '-'}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Сонгосон машины дугаар</p>
                    <p className="text-sm font-medium mt-1">
                      {assignedVehicle?.licensePlate || '-'}
                      {assignedVehicle?.trailerLicensePlate ? ` / ${assignedVehicle.trailerLicensePlate}` : ''}
                    </p>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="assignmentNote">Тээвэрлэгчийн тэмдэглэл</Label>
                    <Textarea
                      id="assignmentNote"
                      rows={2}
                      value={shipmentForm.assignmentNote}
                      onChange={(e) => onShipmentChange('assignmentNote', e.target.value)}
                      placeholder="Жишээ: 2 ээлжээр явна, тусгай зөвшөөрөлтэй жолооч шаардлагатай..."
                    />
                  </div>
                </div>
              ) : shipment?.transportAssignment ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Тээвэрчин</p>
                    </div>
                    <p className="mt-1 text-sm font-semibold">{shipment.transportAssignment.driverName || '-'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{shipment.transportAssignment.driverPhone || '-'}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Тээврийн хэрэгсэл</p>
                    </div>
                    <p className="mt-1 text-sm font-semibold">{shipment.transportAssignment.vehiclePlate || '-'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Чиргүүл: {shipment.transportAssignment.trailerPlate || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Төлөв: {shipment.transportAssignment.vehicleStatus || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-2 rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Тэмдэглэл</p>
                    <p className="text-sm mt-1">{shipment.transportAssignment.notes || '-'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Тээвэрчин, машины мэдээлэл оруулаагүй байна.</p>
              )}
            </CardContent>
          </Card>



          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Тээврийн чиглэл</CardTitle>
                {editingShipment ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={cancelShipmentEdit} disabled={savingShipment}>
                      <X className="mr-2 h-4 w-4" />
                      Болих
                    </Button>
                    <Button size="sm" onClick={saveShipmentDetails} disabled={savingShipment}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingShipment ? 'Хадгалж байна...' : 'Хадгалах'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditingShipment(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Засах
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingShipment ? (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-3 rounded-lg border p-4">
                      <Label htmlFor="originInputMethod">Хаанаас оруулах арга</Label>
                      <select
                        id="originInputMethod"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={shipmentForm.originInputMethod}
                        onChange={(e) => onShipmentChange('originInputMethod', e.target.value)}
                      >
                        {ROUTE_INPUT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>

                      {shipmentForm.originInputMethod === 'warehouse' && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="originWarehouseId">Хаанаас (Системийн агуулах)</Label>
                            <select
                              id="originWarehouseId"
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                              value={shipmentForm.originWarehouseId}
                              onChange={(e) => {
                                onShipmentChange('originWarehouseId', e.target.value);
                                applyWarehouseSelection('origin', e.target.value);
                              }}
                            >
                              <option value="">Сонгоогүй</option>
                              {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {shipmentForm.originWarehouseId ? (
                            (() => {
                              const selectedWarehouse = warehouses.find((w) => w.id === shipmentForm.originWarehouseId);
                              const hasCoordinates =
                                selectedWarehouse?.geolocation?.lat !== undefined &&
                                selectedWarehouse?.geolocation?.lng !== undefined;

                              if (!hasCoordinates) {
                                return (
                                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    Энэ агуулахын координат бүртгэгдээгүй байна.
                                  </p>
                                );
                              }

                              return (
                                <LocationPicker
                                  mode="preview"
                                  initialValue={selectedWarehouse?.location}
                                  initialCoordinates={{
                                    lat: selectedWarehouse!.geolocation.lat,
                                    lng: selectedWarehouse!.geolocation.lng,
                                  }}
                                  onLocationSelect={() => {}}
                                />
                              );
                            })()
                          ) : null}
                        </div>
                      )}

                      {shipmentForm.originInputMethod === 'address' && (
                        <LocationPicker
                          mode="search"
                          initialValue={shipmentForm.originLocation}
                          initialCoordinates={
                            shipmentForm.originLat && shipmentForm.originLng
                              ? { lat: Number(shipmentForm.originLat), lng: Number(shipmentForm.originLng) }
                              : undefined
                          }
                          onLocationSelect={(address, latLng) => {
                            onShipmentChange('originLocation', address);
                            onShipmentChange('originLat', String(latLng.lat));
                            onShipmentChange('originLng', String(latLng.lng));
                            onShipmentChange('originInputMethod', 'address');
                          }}
                        />
                      )}

                      {shipmentForm.originInputMethod === 'coordinates' && (
                        <LocationPicker
                          mode="manual"
                          initialValue={shipmentForm.originLocation}
                          initialCoordinates={
                            shipmentForm.originLat && shipmentForm.originLng
                              ? { lat: Number(shipmentForm.originLat), lng: Number(shipmentForm.originLng) }
                              : undefined
                          }
                          onLocationSelect={(address, latLng) => {
                            onShipmentChange('originLocation', address);
                            onShipmentChange('originLat', String(latLng.lat));
                            onShipmentChange('originLng', String(latLng.lng));
                            onShipmentChange('originInputMethod', 'coordinates');
                          }}
                        />
                      )}
                    </div>

                    <div className="space-y-3 rounded-lg border p-4">
                      <Label htmlFor="destinationInputMethod">Хаашаа оруулах арга</Label>
                      <select
                        id="destinationInputMethod"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={shipmentForm.destinationInputMethod}
                        onChange={(e) => onShipmentChange('destinationInputMethod', e.target.value)}
                      >
                        {ROUTE_INPUT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>

                      {shipmentForm.destinationInputMethod === 'warehouse' && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="destinationWarehouseId">Хаашаа (Системийн агуулах)</Label>
                            <select
                              id="destinationWarehouseId"
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                              value={shipmentForm.destinationWarehouseId}
                              onChange={(e) => {
                                onShipmentChange('destinationWarehouseId', e.target.value);
                                applyWarehouseSelection('destination', e.target.value);
                              }}
                            >
                              <option value="">Сонгоогүй</option>
                              {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {shipmentForm.destinationWarehouseId ? (
                            (() => {
                              const selectedWarehouse = warehouses.find((w) => w.id === shipmentForm.destinationWarehouseId);
                              const hasCoordinates =
                                selectedWarehouse?.geolocation?.lat !== undefined &&
                                selectedWarehouse?.geolocation?.lng !== undefined;

                              if (!hasCoordinates) {
                                return (
                                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    Энэ агуулахын координат бүртгэгдээгүй байна.
                                  </p>
                                );
                              }

                              return (
                                <LocationPicker
                                  mode="preview"
                                  initialValue={selectedWarehouse?.location}
                                  initialCoordinates={{
                                    lat: selectedWarehouse!.geolocation.lat,
                                    lng: selectedWarehouse!.geolocation.lng,
                                  }}
                                  onLocationSelect={() => {}}
                                />
                              );
                            })()
                          ) : null}
                        </div>
                      )}

                      {shipmentForm.destinationInputMethod === 'address' && (
                        <LocationPicker
                          mode="search"
                          initialValue={shipmentForm.destinationLocation}
                          initialCoordinates={
                            shipmentForm.destinationLat && shipmentForm.destinationLng
                              ? { lat: Number(shipmentForm.destinationLat), lng: Number(shipmentForm.destinationLng) }
                              : undefined
                          }
                          onLocationSelect={(address, latLng) => {
                            onShipmentChange('destinationLocation', address);
                            onShipmentChange('destinationLat', String(latLng.lat));
                            onShipmentChange('destinationLng', String(latLng.lng));
                            onShipmentChange('destinationInputMethod', 'address');
                          }}
                        />
                      )}

                      {shipmentForm.destinationInputMethod === 'coordinates' && (
                        <LocationPicker
                          mode="manual"
                          initialValue={shipmentForm.destinationLocation}
                          initialCoordinates={
                            shipmentForm.destinationLat && shipmentForm.destinationLng
                              ? { lat: Number(shipmentForm.destinationLat), lng: Number(shipmentForm.destinationLng) }
                              : undefined
                          }
                          onLocationSelect={(address, latLng) => {
                            onShipmentChange('destinationLocation', address);
                            onShipmentChange('destinationLat', String(latLng.lat));
                            onShipmentChange('destinationLng', String(latLng.lng));
                            onShipmentChange('destinationInputMethod', 'coordinates');
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : shipment ? (
                <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] items-stretch">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Хаанаас</p>
                    <p className="font-semibold mt-1">
                      {[shipment.origin.city, shipment.origin.country].filter(Boolean).join(', ') || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Агуулах: {shipment.origin.warehouseName || '-'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{shipment.origin.location || '-'}</p>
                    {shipment.origin.lat !== undefined && shipment.origin.lng !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {shipment.origin.lat.toFixed(6)}, {shipment.origin.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                  <div className="hidden md:flex items-center justify-center text-muted-foreground">
                    <Route className="h-5 w-5" />
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Хаашаа</p>
                    <p className="font-semibold mt-1">
                      {[shipment.destination.city, shipment.destination.country].filter(Boolean).join(', ') || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Агуулах: {shipment.destination.warehouseName || '-'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{shipment.destination.location || '-'}</p>
                    {shipment.destination.lat !== undefined && shipment.destination.lng !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {shipment.destination.lat.toFixed(6)}, {shipment.destination.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Чиглэлийн мэдээлэл оруулаагүй байна.</p>
              )}
            </CardContent>
          </Card>



          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Ачааны мэдээлэл</CardTitle>
                {editingShipment ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={cancelShipmentEdit} disabled={savingShipment}>
                      <X className="mr-2 h-4 w-4" />
                      Болих
                    </Button>
                    <Button size="sm" onClick={saveShipmentDetails} disabled={savingShipment}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingShipment ? 'Хадгалж байна...' : 'Хадгалах'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditingShipment(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Засах
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingShipment ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="cargoDescription">Юу тээвэрлэх вэ (Cargo Description)</Label>
                    <Input
                      id="cargoDescription"
                      value={shipmentForm.cargoDescription}
                      onChange={(e) => onShipmentChange('cargoDescription', e.target.value)}
                      placeholder="Жишээ: Electronics, Frozen Meat, Mining Equipment"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commodityCode">HS / Commodity code</Label>
                    <Input
                      id="commodityCode"
                      value={shipmentForm.commodityCode}
                      onChange={(e) => onShipmentChange('commodityCode', e.target.value)}
                      placeholder="Жишээ: 847130"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packageCount">Савлагааны тоо</Label>
                    <Input
                      id="packageCount"
                      type="number"
                      min="0"
                      value={shipmentForm.packageCount}
                      onChange={(e) => onShipmentChange('packageCount', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weightKg">Жин (кг)</Label>
                    <Input
                      id="weightKg"
                      type="number"
                      min="0"
                      step="0.1"
                      value={shipmentForm.weightKg}
                      onChange={(e) => onShipmentChange('weightKg', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volumeM3">Эзэлхүүн (m3)</Label>
                    <Input
                      id="volumeM3"
                      type="number"
                      min="0"
                      step="0.1"
                      value={shipmentForm.volumeM3}
                      onChange={(e) => onShipmentChange('volumeM3', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperatureRequirement">Температурын шаардлага</Label>
                    <Input
                      id="temperatureRequirement"
                      value={shipmentForm.temperatureRequirement}
                      onChange={(e) => onShipmentChange('temperatureRequirement', e.target.value)}
                      placeholder="Жишээ: 2-8°C"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="specialHandling">Тусгай шаардлага / Тэмдэглэл</Label>
                    <Textarea
                      id="specialHandling"
                      rows={3}
                      value={shipmentForm.specialHandling}
                      onChange={(e) => onShipmentChange('specialHandling', e.target.value)}
                      placeholder="Fragile, DG cargo, escort needed, route restrictions..."
                    />
                  </div>
                </div>
              ) : shipment ? (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-1">Юу тээвэрлэх вэ</p>
                    <p className="font-semibold">{shipment.cargoDescription || '-'}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Жин</p>
                        <p className="text-sm font-medium">{shipment.weightKg ? `${shipment.weightKg} кг` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Эзэлхүүн</p>
                        <p className="text-sm font-medium">{shipment.volumeM3 ? `${shipment.volumeM3} m3` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Савлагаа</p>
                        <p className="text-sm font-medium">{shipment.packageCount || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">HS код</p>
                      <p className="text-sm font-semibold mt-1">{shipment.commodityCode || '-'}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Температурын шаардлага</p>
                      <p className="text-sm font-semibold mt-1">{shipment.temperatureRequirement || '-'}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Тусгай шаардлага</p>
                    <p className="text-sm mt-1">{shipment.specialHandling || '-'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ачааны мэдээлэл оруулаагүй байна.</p>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            <TabsContent value="dispatch" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Диспач</CardTitle>
                {editingDispatch ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={cancelDispatchEdit} disabled={savingDispatch}>
                      <X className="mr-2 h-4 w-4" />
                      Болих
                    </Button>
                    <Button size="sm" onClick={saveDispatchDetails} disabled={savingDispatch}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingDispatch ? 'Хадгалж байна...' : 'Хадгалах'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditingDispatch(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Засах
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                  {DISPATCH_STAGES.map((stage, index) => {
                    const isActive = stage.value === dispatchStageForUi;
                    const isCompleted = index < dispatchStageIndex;
                    return (
                      <button
                        key={stage.value}
                        type="button"
                        className={`rounded-md border px-3 py-2 text-left transition ${
                          isActive
                            ? 'border-primary bg-primary/5'
                            : isCompleted
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-border bg-background'
                        }`}
                        onClick={() => {
                          if (!editingDispatch) return;
                          setDispatchForm((prev) => ({ ...prev, stage: stage.value }));
                        }}
                        disabled={!editingDispatch}
                      >
                        <p className="text-xs text-muted-foreground">Алхам {index + 1}</p>
                        <p className="text-sm font-medium">{stage.label}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Одоогийн үе шатны зорилго</p>
                  <p className="mt-1 text-sm font-semibold">{dispatchPlaybook.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{dispatchPlaybook.focus}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Дараагийн алхам: {dispatchPlaybook.nextAction}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Гаралт / Статус: {dispatchPlaybook.output}</p>
                </div>
                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Үе шатны шаардлага хангасан байдал</p>
                    <p className="text-xs font-medium">{stageGateScore}%</p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${stageGateScore}%` }} />
                  </div>
                  <div className="mt-3 space-y-1">
                    {stageGateChecklist.map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-xs">
                        {item.ready ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        <span className={item.ready ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {!editingDispatch && (
                  <div className="flex flex-wrap items-center gap-2">
                    {nextStageCandidate && (
                      <Button size="sm" onClick={() => openDispatchEditorAtStage(nextStageCandidate)}>
                        Дараагийн үе шат: {DISPATCH_STAGES.find((item) => item.value === nextStageCandidate)?.label}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openDispatchEditorAtStage('in_transit')}>
                      Явц шинэчлэх
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingDispatch(true)}>
                      Гар аргаар шинэчлэх
                    </Button>
                  </div>
                )}
              </div>

              {editingDispatch ? (
                <div className="space-y-4">
                  {stageGateScore < 100 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Энэ үе шатанд шаардлагатай мэдээлэл бүрэн биш байна. Доорх checklist-ийг бүрэн хангаад хадгалахыг зөвлөж байна.
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dispatchStage">Диспач үе шат</Label>
                      <select
                        id="dispatchStage"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={dispatchForm.stage}
                        onChange={(e) => setDispatchForm((prev) => ({ ...prev, stage: e.target.value as DispatchStage }))}
                      >
                        {DISPATCH_STAGES.map((stage) => (
                          <option key={stage.value} value={stage.value}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dispatchEta">ETA (төлөвлөсөн хүрэх огноо)</Label>
                      <Input
                        id="dispatchEta"
                        type="date"
                        value={dispatchForm.etaDate}
                        onChange={(e) => setDispatchForm((prev) => ({ ...prev, etaDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dispatchLocation">Одоогийн байршил</Label>
                      <Input
                        id="dispatchLocation"
                        value={dispatchForm.currentLocation}
                        onChange={(e) => setDispatchForm((prev) => ({ ...prev, currentLocation: e.target.value }))}
                        placeholder="Жишээ: Choir check-point / Zamyn-Uud"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dispatchNote">Сүүлчийн үйл явдлын тэмдэглэл</Label>
                      <Input
                        id="dispatchNote"
                        value={dispatchForm.lastEventNote}
                        onChange={(e) => setDispatchForm((prev) => ({ ...prev, lastEventNote: e.target.value }))}
                        placeholder="Сүүлийн шинэчлэл"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-sm font-semibold">Үе шатны удирдлага</p>

                    {dispatchForm.stage === 'new' && (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.intakeValidated}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, intakeValidated: e.target.checked }))}
                          />
                          Order validation хийгдсэн
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.intakeDuplicateChecked}
                            onChange={(e) =>
                              setDispatchForm((prev) => ({ ...prev, intakeDuplicateChecked: e.target.checked }))
                            }
                          />
                          Duplicate check хийгдсэн
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.intakeSlaChecked}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, intakeSlaChecked: e.target.checked }))}
                          />
                          SLA шалгалт хийгдсэн
                        </label>
                        <div className="space-y-2">
                          <Label htmlFor="intakeNote">Order intake тэмдэглэл</Label>
                          <Textarea
                            id="intakeNote"
                            rows={2}
                            value={dispatchForm.intakeNote}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, intakeNote: e.target.value }))}
                          />
                        </div>
                      </>
                    )}

                    {dispatchForm.stage === 'planned' && (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.planningRouteOptimized}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, planningRouteOptimized: e.target.checked }))}
                          />
                          Route optimization хийгдсэн
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.planningCostEstimated}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, planningCostEstimated: e.target.checked }))}
                          />
                          Cost estimate бэлэн
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.planningLoadPlanned}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, planningLoadPlanned: e.target.checked }))}
                          />
                          Load planning бэлэн
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.planningAiMatched}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, planningAiMatched: e.target.checked }))}
                          />
                          AI matching ашигласан
                        </label>
                        <div className="space-y-2">
                          <Label htmlFor="planningNote">Planning тэмдэглэл</Label>
                          <Textarea
                            id="planningNote"
                            rows={2}
                            value={dispatchForm.planningNote}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, planningNote: e.target.value }))}
                          />
                        </div>
                      </>
                    )}

                    {dispatchForm.stage === 'assigned' && (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.assignmentDriverNotified}
                            onChange={(e) =>
                              setDispatchForm((prev) => ({ ...prev, assignmentDriverNotified: e.target.checked }))
                            }
                          />
                          Driver notification илгээгдсэн
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.assignmentAccepted}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, assignmentAccepted: e.target.checked }))}
                          />
                          Driver accept/reject бүртгэгдсэн
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.assignmentContractReady}
                            onChange={(e) =>
                              setDispatchForm((prev) => ({ ...prev, assignmentContractReady: e.target.checked }))
                            }
                          />
                          Digital contract бэлэн
                        </label>
                        <div className="space-y-2">
                          <Label htmlFor="assignmentNote">Assignment тэмдэглэл</Label>
                          <Textarea
                            id="assignmentNote"
                            rows={2}
                            value={dispatchForm.assignmentNote}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, assignmentNote: e.target.value }))}
                          />
                        </div>
                      </>
                    )}

                    {dispatchForm.stage === 'ready_to_depart' && (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.preTripChecklistDone}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, preTripChecklistDone: e.target.checked }))}
                          />
                          Checklist бүрэн
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.preTripFuelChecked}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, preTripFuelChecked: e.target.checked }))}
                          />
                          Fuel шалгалт
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.preTripSafetyChecked}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, preTripSafetyChecked: e.target.checked }))}
                          />
                          Safety шалгалт
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.preTripDocsChecked}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, preTripDocsChecked: e.target.checked }))}
                          />
                          Баримт бичгийн шалгалт
                        </label>
                        <div className="space-y-2">
                          <Label htmlFor="preTripInspectionPhotoUrl">Inspection зураг (URL)</Label>
                          <Input
                            id="preTripInspectionPhotoUrl"
                            value={dispatchForm.preTripInspectionPhotoUrl}
                            onChange={(e) =>
                              setDispatchForm((prev) => ({ ...prev, preTripInspectionPhotoUrl: e.target.value }))
                            }
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="preTripNote">Pre-trip тэмдэглэл</Label>
                          <Textarea
                            id="preTripNote"
                            rows={2}
                            value={dispatchForm.preTripNote}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, preTripNote: e.target.value }))}
                          />
                        </div>
                      </>
                    )}

                    {dispatchForm.stage === 'in_transit' && (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2 md:col-span-1">
                            <Label htmlFor="transitCheckpointLocation">Замын цэг</Label>
                            <Input
                              id="transitCheckpointLocation"
                              value={dispatchForm.transitCheckpointLocation}
                              onChange={(e) =>
                                setDispatchForm((prev) => ({ ...prev, transitCheckpointLocation: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="transitCheckpointEta">Цэгийн ETA</Label>
                            <Input
                              id="transitCheckpointEta"
                              type="date"
                              value={dispatchForm.transitCheckpointEta}
                              onChange={(e) => setDispatchForm((prev) => ({ ...prev, transitCheckpointEta: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="transitDistanceKm">Явсан зай (км)</Label>
                            <Input
                              id="transitDistanceKm"
                              type="number"
                              min="0"
                              step="0.1"
                              value={dispatchForm.transitDistanceKm}
                              onChange={(e) => setDispatchForm((prev) => ({ ...prev, transitDistanceKm: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="transitNote">Incident / явцын тэмдэглэл</Label>
                          <Textarea
                            id="transitNote"
                            rows={2}
                            value={dispatchForm.transitNote}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, transitNote: e.target.value }))}
                          />
                        </div>
                      </>
                    )}

                    {dispatchForm.stage === 'delivered' && (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="deliveredReceiverName">Хүлээн авсан хүн</Label>
                            <Input
                              id="deliveredReceiverName"
                              value={dispatchForm.deliveredReceiverName}
                              onChange={(e) =>
                                setDispatchForm((prev) => ({ ...prev, deliveredReceiverName: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deliveredAt">Хүргэлт хийсэн огноо</Label>
                            <Input
                              id="deliveredAt"
                              type="date"
                              value={dispatchForm.deliveredAt}
                              onChange={(e) => setDispatchForm((prev) => ({ ...prev, deliveredAt: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deliveredPodPhotoUrl">POD зураг/файл URL</Label>
                            <Input
                              id="deliveredPodPhotoUrl"
                              value={dispatchForm.deliveredPodPhotoUrl}
                              onChange={(e) =>
                                setDispatchForm((prev) => ({ ...prev, deliveredPodPhotoUrl: e.target.value }))
                              }
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.deliveredSignatureCaptured}
                            onChange={(e) =>
                              setDispatchForm((prev) => ({ ...prev, deliveredSignatureCaptured: e.target.checked }))
                            }
                          />
                          Signature capture хийгдсэн
                        </label>
                        <div className="space-y-2">
                          <Label htmlFor="deliveredDamageReport">Гэмтлийн тайлан</Label>
                          <Textarea
                            id="deliveredDamageReport"
                            rows={2}
                            value={dispatchForm.deliveredDamageReport}
                            onChange={(e) =>
                              setDispatchForm((prev) => ({ ...prev, deliveredDamageReport: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliveredNote">Хүргэлтийн тэмдэглэл</Label>
                          <Textarea
                            id="deliveredNote"
                            rows={2}
                            value={dispatchForm.deliveredNote}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, deliveredNote: e.target.value }))}
                          />
                        </div>
                      </>
                    )}

                    {dispatchForm.stage === 'completed' && (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="postTripActualDistanceKm">Бодит зай (км)</Label>
                            <Input
                              id="postTripActualDistanceKm"
                              type="number"
                              min="0"
                              value={dispatchForm.postTripActualDistanceKm}
                              onChange={(e) =>
                                setDispatchForm((prev) => ({ ...prev, postTripActualDistanceKm: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="postTripFuelCost">Fuel зардал</Label>
                            <Input
                              id="postTripFuelCost"
                              type="number"
                              min="0"
                              value={dispatchForm.postTripFuelCost}
                              onChange={(e) => setDispatchForm((prev) => ({ ...prev, postTripFuelCost: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="postTripTollCost">Toll зардал</Label>
                            <Input
                              id="postTripTollCost"
                              type="number"
                              min="0"
                              value={dispatchForm.postTripTollCost}
                              onChange={(e) => setDispatchForm((prev) => ({ ...prev, postTripTollCost: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postTripDelayInfo">Delay тайлбар</Label>
                          <Textarea
                            id="postTripDelayInfo"
                            rows={2}
                            value={dispatchForm.postTripDelayInfo}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, postTripDelayInfo: e.target.value }))}
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.postTripReconciled}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, postTripReconciled: e.target.checked }))}
                          />
                          Cost reconciliation хийгдсэн
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.postTripInvoiceReady}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, postTripInvoiceReady: e.target.checked }))}
                          />
                          Invoice бэлэн
                        </label>
                      </>
                    )}

                    {dispatchForm.stage === 'closed' && (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="analyticsSlaRate">SLA (%)</Label>
                            <Input
                              id="analyticsSlaRate"
                              type="number"
                              min="0"
                              max="100"
                              value={dispatchForm.analyticsSlaRate}
                              onChange={(e) => setDispatchForm((prev) => ({ ...prev, analyticsSlaRate: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="analyticsUtilizationRate">Utilization (%)</Label>
                            <Input
                              id="analyticsUtilizationRate"
                              type="number"
                              min="0"
                              max="100"
                              value={dispatchForm.analyticsUtilizationRate}
                              onChange={(e) =>
                                setDispatchForm((prev) => ({ ...prev, analyticsUtilizationRate: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={dispatchForm.analyticsKpiPublished}
                            onChange={(e) =>
                              setDispatchForm((prev) => ({ ...prev, analyticsKpiPublished: e.target.checked }))
                            }
                          />
                          KPI dashboard нийтлэгдсэн
                        </label>
                        <div className="space-y-2">
                          <Label htmlFor="analyticsNote">Analytics тэмдэглэл</Label>
                          <Textarea
                            id="analyticsNote"
                            rows={2}
                            value={dispatchForm.analyticsNote}
                            onChange={(e) => setDispatchForm((prev) => ({ ...prev, analyticsNote: e.target.value }))}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Диспач үе шат</p>
                      <Badge variant="outline">{dispatchStageMeta.label}</Badge>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${dispatchStageMeta.progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Явц: {dispatchStageMeta.progress}%</p>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Диспач бэлэн байдал</p>
                    <p className="mt-1 text-sm font-semibold">{dispatchReadinessScore}%</p>
                    <div className="mt-2 space-y-1">
                      {dispatchChecklist.map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          {item.ready ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          <span className={item.ready ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Тээвэрчин</p>
                    <p className="mt-1 text-sm font-semibold">{dispatchDriverName || 'Оноогоогүй'}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Тээврийн хэрэгсэл</p>
                    <p className="mt-1 text-sm font-semibold">{dispatchVehiclePlate || 'Оноогоогүй'}</p>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Одоогийн байршил</p>
                    <p className="mt-1 text-sm font-semibold">{dispatchCurrentLocation || '-'}</p>
                    <p className="mt-2 text-xs text-muted-foreground">ETA</p>
                    <p className="mt-1 text-sm font-semibold">
                      {dispatchEta ? dispatchEta.toLocaleDateString('mn-MN') : '-'}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Сүүлчийн шинэчлэлт</p>
                    <p className="mt-1 text-sm font-semibold">
                      {dispatchLastEventAt ? dispatchLastEventAt.toLocaleString('mn-MN') : '-'}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Тэмдэглэл</p>
                    <p className="mt-1 text-sm">{dispatchLastEventNote || '-'}</p>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Үе шатны удирдлагын дэлгэрэнгүй</p>
                    {dispatchStage === 'new' ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Validation: {dispatchWorkflow?.orderIntake?.validated ? 'Тийм' : 'Үгүй'}</p>
                        <p>Duplicate check: {dispatchWorkflow?.orderIntake?.duplicateChecked ? 'Тийм' : 'Үгүй'}</p>
                        <p>SLA check: {dispatchWorkflow?.orderIntake?.slaChecked ? 'Тийм' : 'Үгүй'}</p>
                        <p className="text-muted-foreground">{dispatchWorkflow?.orderIntake?.note || '-'}</p>
                      </div>
                    ) : null}
                    {dispatchStage === 'planned' ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Route optimized: {dispatchWorkflow?.planning?.routeOptimized ? 'Тийм' : 'Үгүй'}</p>
                        <p>Cost estimated: {dispatchWorkflow?.planning?.costEstimated ? 'Тийм' : 'Үгүй'}</p>
                        <p>Load planned: {dispatchWorkflow?.planning?.loadPlanned ? 'Тийм' : 'Үгүй'}</p>
                        <p>AI matched: {dispatchWorkflow?.planning?.aiMatched ? 'Тийм' : 'Үгүй'}</p>
                        <p className="text-muted-foreground">{dispatchWorkflow?.planning?.note || '-'}</p>
                      </div>
                    ) : null}
                    {dispatchStage === 'assigned' ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Driver notified: {dispatchWorkflow?.assignment?.driverNotified ? 'Тийм' : 'Үгүй'}</p>
                        <p>Accepted: {dispatchWorkflow?.assignment?.accepted ? 'Тийм' : 'Үгүй'}</p>
                        <p>Digital contract: {dispatchWorkflow?.assignment?.digitalContractReady ? 'Тийм' : 'Үгүй'}</p>
                        <p className="text-muted-foreground">{dispatchWorkflow?.assignment?.note || '-'}</p>
                      </div>
                    ) : null}
                    {dispatchStage === 'ready_to_depart' ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Checklist: {dispatchWorkflow?.preTrip?.checklistDone ? 'Тийм' : 'Үгүй'}</p>
                        <p>Fuel checked: {dispatchWorkflow?.preTrip?.fuelChecked ? 'Тийм' : 'Үгүй'}</p>
                        <p>Safety checked: {dispatchWorkflow?.preTrip?.safetyChecked ? 'Тийм' : 'Үгүй'}</p>
                        <p>Docs checked: {dispatchWorkflow?.preTrip?.docsChecked ? 'Тийм' : 'Үгүй'}</p>
                        <p className="break-all">Inspection: {dispatchWorkflow?.preTrip?.inspectionPhotoUrl || '-'}</p>
                        <p className="text-muted-foreground">{dispatchWorkflow?.preTrip?.note || '-'}</p>
                      </div>
                    ) : null}
                    {dispatchStage === 'in_transit' ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Замын цэг: {dispatchWorkflow?.transit?.checkpointLocation || '-'}</p>
                        <p>
                          Цэгийн ETA: {dispatchWorkflow?.transit?.checkpointEta
                            ? dispatchWorkflow.transit.checkpointEta.toLocaleDateString('mn-MN')
                            : '-'}
                        </p>
                        <p>Явсан зай: {dispatchWorkflow?.transit?.distanceKm ?? '-'} км</p>
                        <p className="text-muted-foreground">{dispatchWorkflow?.transit?.incidentLog || '-'}</p>
                      </div>
                    ) : null}
                    {dispatchStage === 'delivered' ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Хүлээн авсан: {dispatchWorkflow?.delivery?.receiverName || '-'}</p>
                        <p>
                          Хүргэлтийн огноо: {dispatchWorkflow?.delivery?.deliveredAt
                            ? dispatchWorkflow.delivery.deliveredAt.toLocaleDateString('mn-MN')
                            : '-'}
                        </p>
                        <p>Signature: {dispatchWorkflow?.delivery?.signatureCaptured ? 'Тийм' : 'Үгүй'}</p>
                        <p className="break-all">POD: {dispatchWorkflow?.delivery?.podPhotoUrl || '-'}</p>
                        <p>Damage report: {dispatchWorkflow?.delivery?.damageReport || '-'}</p>
                        <p className="text-muted-foreground">{dispatchWorkflow?.delivery?.note || '-'}</p>
                      </div>
                    ) : null}
                    {dispatchStage === 'completed' ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Actual distance: {dispatchWorkflow?.postTrip?.actualDistanceKm ?? '-'} км</p>
                        <p>Fuel cost: {dispatchWorkflow?.postTrip?.fuelCost ?? '-'}</p>
                        <p>Toll cost: {dispatchWorkflow?.postTrip?.tollCost ?? '-'}</p>
                        <p>Delay info: {dispatchWorkflow?.postTrip?.delayInfo || '-'}</p>
                        <p>Reconciled: {dispatchWorkflow?.postTrip?.reconciled ? 'Тийм' : 'Үгүй'}</p>
                        <p>Invoice ready: {dispatchWorkflow?.postTrip?.invoiceReady ? 'Тийм' : 'Үгүй'}</p>
                      </div>
                    ) : null}
                    {dispatchStage === 'closed' ? (
                      <div className="mt-2 space-y-1 text-sm">
                        <p>SLA: {dispatchWorkflow?.analytics?.slaRate ?? '-'}%</p>
                        <p>Utilization: {dispatchWorkflow?.analytics?.utilizationRate ?? '-'}%</p>
                        <p>KPI published: {dispatchWorkflow?.analytics?.kpiPublished ? 'Тийм' : 'Үгүй'}</p>
                        <p className="text-muted-foreground">{dispatchWorkflow?.analytics?.note || '-'}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Үе шатны түүх</p>
                    <div className="mt-2 space-y-1">
                      {dispatchHistory.length > 0 ? (
                        dispatchHistory.slice().reverse().map((item, index) => (
                          <p key={`${item.stage}-${index}`} className="text-xs">
                            <span className="font-medium">
                              {DISPATCH_STAGES.find((stage) => stage.value === normalizeDispatchStage(String(item.stage)))?.label ||
                                item.stage}
                            </span>
                            {' · '}
                            {item.at ? item.at.toLocaleString('mn-MN') : '-'}
                            {item.note ? ` · ${item.note}` : ''}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">Үе шатны түүх бүртгэгдээгүй байна.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
            </TabsContent>
          </Tabs>

      </div>
    </PageContainer>
  );
}
