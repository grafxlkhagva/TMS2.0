
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import type {
  Order,
  OrderItem,
  ServiceType,
  Region,
  VehicleType,
  TrailerType,
  Warehouse,
  PackagingType,
  OrderItemCargo,
} from '@/types';
import { format } from 'date-fns';

// Since we can't use tailwind, we define styles using StyleSheet API
// DeJa Vu Sans is one of the few fonts that supports Mongolian characters
Font.register({
  family: 'DejaVu Sans',
  fonts: [
    { src: 'https://fonts.cdnfonts.com/s/15067/DejaVuSans.woff', fontWeight: 'normal' },
    { src: 'https://fonts.cdnfonts.com/s/15067/DejaVuSans-Bold.woff', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'DejaVu Sans',
    fontSize: 9,
    padding: 30,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
    paddingBottom: 12,
    marginBottom: 20,
  },
  headerLeft: {
  },
  headerRight: {
    textAlign: 'right',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  headerText: {
    flexDirection: 'row',
    fontSize: 9,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    paddingBottom: 2,
    marginBottom: 6,
  },
  infoText: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  infoValue: {
    marginLeft: 4,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderCollapse: 'collapse',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    backgroundColor: '#fff',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  tableColHeader: {
    fontWeight: 'bold',
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#9ca3af',
  },
  tableCol: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#9ca3af',
  },
  tableCell: {
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  col2: {
    width: '50%',
  },
  conditionsList: {
    flexDirection: 'column',
    marginLeft: 16,
  }
});

const roundCurrency = (value: number | undefined | null): number => {
  if (value == null) return 0;
  return Math.round(value * 100) / 100;
};

type AllData = {
  serviceTypes: ServiceType[];
  regions: Region[];
  warehouses: Warehouse[];
  vehicleTypes: VehicleType[];
  trailerTypes: TrailerType[];
  packagingTypes: PackagingType[];
};

type QuoteDocumentProps = {
  order: Order | null;
  orderItems: OrderItem[];
  allData: AllData;
};

const QuoteDocument = ({ order, orderItems, allData }: QuoteDocumentProps) => {
  if (!order) return null;

  const getServiceName = (id: string) => allData.serviceTypes.find(s => s.id === id)?.name || 'N/A';
  const getRegionName = (id: string) => allData.regions.find(r => r.id === id)?.name || 'N/A';
  const getWarehouseName = (id: string) => allData.warehouses.find(w => w.id === id)?.name || 'N/A';
  const getVehicleTypeName = (id: string) => allData.vehicleTypes.find(v => v.id === id)?.name || 'N/A';
  const getTrailerTypeName = (id: string) => allData.trailerTypes.find(t => t.id === id)?.name || 'N/A';
  const getPackagingTypeName = (id: string) => allData.packagingTypes.find(p => p.id === id)?.name || 'N/A';
  
  const acceptedItems = orderItems.filter(
    (item) => item.acceptedQuoteId && item.finalPrice != null
  );

  const { totalPayment, totalVat, totalFinalPrice } = acceptedItems.reduce(
    (acc, item) => {
      const finalPrice = roundCurrency(item.finalPrice);
      const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
      const vat = finalPrice - priceBeforeVat;
      
      acc.totalPayment += priceBeforeVat;
      acc.totalVat += vat;
      acc.totalFinalPrice += finalPrice;
      return acc;
    },
    { totalPayment: 0, totalVat: 0, totalFinalPrice: 0 }
  );
  
  const quoteDate = order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  const formatNumber = (num: number) => {
    return roundCurrency(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Tumen Tech TMS</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.subTitle}>ҮНИЙН САНАЛ</Text>
            <View style={styles.headerText}><Text style={{fontWeight: 'bold'}}>Огноо: </Text><Text>{quoteDate}</Text></View>
            <View style={styles.headerText}><Text style={{fontWeight: 'bold'}}>Захиалгын №: </Text><Text>{order.orderNumber}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Захиалагчийн мэдээлэл</Text>
          <View style={styles.infoText}><Text style={styles.infoLabel}>Байгууллага:</Text><Text style={styles.infoValue}>{order.customerName}</Text></View>
          <View style={styles.infoText}><Text style={styles.infoLabel}>Хариуцсан ажилтан:</Text><Text style={styles.infoValue}>{order.employeeName}</Text></View>
        </View>

        <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableColHeader, {width: '10%'}]}>Үйлчилгээ</Text>
                <Text style={[styles.tableColHeader, {width: '15%'}]}>Ачаа</Text>
                <Text style={[styles.tableColHeader, {width: '10%'}]}>Ачих</Text>
                <Text style={[styles.tableColHeader, {width: '10%'}]}>Буулгах</Text>
                <Text style={[styles.tableColHeader, {width: '7%', textAlign: 'right'}]}>Зам</Text>
                <Text style={[styles.tableColHeader, {width: '10%'}]}>Тэрэгсэл</Text>
                <Text style={[styles.tableColHeader, {width: '8%', textAlign: 'right'}]}>Тээв.үнэ</Text>
                <Text style={[styles.tableColHeader, {width: '5%', textAlign: 'right'}]}>Тоо</Text>
                <Text style={[styles.tableColHeader, {width: '10%', textAlign: 'right'}]}>Дүн</Text>
                <Text style={[styles.tableColHeader, {width: '7%', textAlign: 'right'}]}>НӨАТ</Text>
                <Text style={[styles.tableColHeader, {width: '8%', textAlign: 'right', borderRightWidth: 0}]}>Нийт</Text>
            </View>
            {acceptedItems.map((item) => {
              const frequency = item.frequency && item.frequency > 0 ? item.frequency : 1;
              const finalPrice = roundCurrency(item.finalPrice);
              const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
              const vatAmount = finalPrice - priceBeforeVat;
              const singleTransportPriceWithProfit = priceBeforeVat / frequency;

              return (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={[styles.tableCol, {width: '10%'}]}>{getServiceName(item.serviceTypeId)}</Text>
                  <View style={[styles.tableCol, {width: '15%'}]}>
                    {(item.cargoItems || []).map((cargo: OrderItemCargo, i: number) => (
                      <View key={cargo.id || i} style={{marginBottom: 2}}>
                        <Text style={{fontWeight: 'bold'}}>{cargo.name}</Text>
                        <Text>{`${cargo.quantity} ${cargo.unit} (${getPackagingTypeName(cargo.packagingTypeId)})`}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.tableCol, {width: '10%'}]}>{getRegionName(item.startRegionId)} {getWarehouseName(item.startWarehouseId)}</Text>
                  <Text style={[styles.tableCol, {width: '10%'}]}>{getRegionName(item.endRegionId)} {getWarehouseName(item.endWarehouseId)}</Text>
                  <Text style={[styles.tableCol, {width: '7%', textAlign: 'right'}]}>{item.totalDistance} км</Text>
                  <Text style={[styles.tableCol, {width: '10%'}]}>{getVehicleTypeName(item.vehicleTypeId)}</Text>
                  <Text style={[styles.tableCol, {width: '8%', textAlign: 'right'}]}>{formatNumber(singleTransportPriceWithProfit)}</Text>
                  <Text style={[styles.tableCol, {width: '5%', textAlign: 'right'}]}>{frequency}</Text>
                  <Text style={[styles.tableCol, {width: '10%', textAlign: 'right'}]}>{formatNumber(priceBeforeVat)}</Text>
                  <Text style={[styles.tableCol, {width: '7%', textAlign: 'right'}]}>{formatNumber(vatAmount)}</Text>
                  <Text style={[styles.tableCol, {width: '8%', textAlign: 'right', fontWeight: 'bold', borderRightWidth: 0}]}>{formatNumber(finalPrice)}</Text>
                </View>
              )
            })}
             <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableColHeader, {width: '65%', textAlign: 'right'}]}>Нийт дүн:</Text>
                <Text style={[styles.tableColHeader, {width: '8%', textAlign: 'right'}]}></Text>
                <Text style={[styles.tableColHeader, {width: '5%', textAlign: 'right'}]}></Text>
                <Text style={[styles.tableColHeader, {width: '10%', textAlign: 'right'}]}>{formatNumber(totalPayment)}</Text>
                <Text style={[styles.tableColHeader, {width: '7%', textAlign: 'right'}]}>{formatNumber(totalVat)}</Text>
                <Text style={[styles.tableColHeader, {width: '8%', textAlign: 'right', borderRightWidth: 0}]}>{formatNumber(totalFinalPrice)}</Text>
            </View>
        </View>

        {order.conditions && (
          <View style={[styles.section, {marginTop: 20}]} wrap={false}>
            <Text style={styles.sectionTitle}>Тээврийн нөхцөл</Text>
            <View style={styles.grid}>
              <View style={styles.col2}><Text><Text style={styles.infoLabel}>Ачилт: </Text><Text style={styles.infoValue}>{order.conditions.loading}</Text></Text></View>
              <View style={styles.col2}><Text><Text style={styles.infoLabel}>Буулгалт: </Text><Text style={styles.infoValue}>{order.conditions.unloading}</Text></Text></View>
              <View style={styles.col2}><Text><Text style={styles.infoLabel}>ТХ-н бэлэн байдал: </Text><Text style={styles.infoValue}>{order.conditions.vehicleAvailability}</Text></Text></View>
              <View style={styles.col2}><Text><Text style={styles.infoLabel}>Төлбөрийн нөхцөл: </Text><Text style={styles.infoValue}>{order.conditions.paymentTerm}</Text></Text></View>
              <View style={{width: '100%', marginTop: 2}}><Text><Text style={styles.infoLabel}>Даатгал: </Text><Text style={styles.infoValue}>{order.conditions.insurance}</Text></Text></View>
              <View style={{width: '100%', marginTop: 2}}>
                <Text style={styles.infoLabel}>Зөвшөөрөл:</Text>
                 {(order.conditions.permits?.roadPermit || order.conditions.permits?.roadToll) ? (
                  <View style={styles.conditionsList}>
                    {order.conditions.permits.roadPermit && <Text>• Замын зөвшөөрөл авна</Text>}
                    {order.conditions.permits.roadToll && <Text>• Замын хураамж тушаана</Text>}
                  </View>
                ) : <Text style={styles.infoValue}> Тодорхойлоогүй</Text>}
              </View>
              {order.conditions.additionalConditions && (
                 <View style={{width: '100%', marginTop: 2}}><Text><Text style={styles.infoLabel}>Нэмэлт нөхцөл: </Text><Text style={styles.infoValue}>{order.conditions.additionalConditions}</Text></Text></View>
              )}
            </View>
          </View>
        )}

        <Text style={styles.footer}>Tumen Tech TMS - Тээвэр ложистикийн удирдлагын систем</Text>
      </Page>
    </Document>
  )
};

export default QuoteDocument;

    