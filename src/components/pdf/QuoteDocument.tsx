
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import type { Order, OrderItem, ServiceType, Region, Warehouse, VehicleType, TrailerType, PackagingType, OrderItemCargo } from '@/types';
import { format } from 'date-fns';

// Register Mongolian font
Font.register({
  family: 'Noto Sans Mongolian',
  src: 'https://fonts.gstatic.com/s/notosansmongolian/v18/VdGGA2DTt_GFoP-J2a3hPDUrAL3J_g2G-Q.ttf'
});


// Create styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Noto Sans Mongolian',
    fontSize: 9,
    padding: 30,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 10,
    marginBottom: 20,
  },
  headerLeft: {},
  headerRight: {
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 3,
    marginBottom: 5,
  },
  text: {
    marginBottom: 3,
  },
  bold: {
    fontWeight: 'bold',
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableColHeader: {
    backgroundColor: '#f2f2f2',
    padding: 5,
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#ccc',
    fontWeight: 'bold',
  },
  tableCol: {
    padding: 5,
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#ccc',
  },
  col1: { width: '20%' },
  col2: { width: '40%' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  totalText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: 'grey',
    fontSize: 8,
  }
});

const roundCurrency = (value: number | undefined | null): number => {
    if (value == null || isNaN(value)) return 0;
    return Math.round(value * 100) / 100;
};

const nf = new Intl.NumberFormat('mn-MN');
const fmt = (n: number) => nf.format(roundCurrency(n));

type AllData = {
  serviceTypes: ServiceType[];
  regions: Region[];
  warehouses: Warehouse[];
  vehicleTypes: VehicleType[];
  trailerTypes: TrailerType[];
  packagingTypes: PackagingType[];
};

type QuoteDocumentProps = {
  order: Order;
  orderItems: OrderItem[];
  allData: AllData;
};

const QuoteDocument = ({ order, orderItems, allData }: QuoteDocumentProps) => {
  const getRegionName = (id: string) => allData.regions.find(r => r.id === id)?.name || 'N/A';
  
  const { totalFinalPrice } = orderItems.reduce(
    (acc, item) => {
      acc.totalFinalPrice += roundCurrency(item.finalPrice);
      return acc;
    },
    { totalFinalPrice: 0 }
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Tumen Tech TMS</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.subtitle}>ҮНИЙН САНАЛ</Text>
            <Text style={{...styles.text, marginTop: 5}}>Огноо: {format(new Date(), 'yyyy-MM-dd')}</Text>
            <Text style={styles.text}>Захиалгын №: {order.orderNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Захиалагчийн мэдээлэл</Text>
          <Text style={styles.text}><Text style={styles.bold}>Байгууллага:</Text> {order.customerName}</Text>
          <Text style={styles.text}><Text style={styles.bold}>Хариуцсан ажилтан:</Text> {order.employeeName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тээвэрлэлтийн үнийн санал</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              <Text style={{...styles.tableColHeader, ...styles.col1}}>Тээвэрлэлт</Text>
              <Text style={{...styles.tableColHeader, ...styles.col2}}>Чиглэл</Text>
              <Text style={{...styles.tableColHeader, ...styles.col3}}>НӨАТ-гүй дүн</Text>
              <Text style={{...styles.tableColHeader, ...styles.col4}}>Нийт дүн</Text>
            </View>
            {/* Table Body */}
            {orderItems.map((item, index) => {
                 const finalPrice = roundCurrency(item.finalPrice);
                 const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
                return (
                    <View style={styles.tableRow} key={item.id}>
                        <Text style={{...styles.tableCol, ...styles.col1}}>Тээвэрлэлт #{index + 1}</Text>
                        <Text style={{...styles.tableCol, ...styles.col2}}>{getRegionName(item.startRegionId)} &rarr; {getRegionName(item.endRegionId)}</Text>
                        <Text style={{...styles.tableCol, ...styles.col3}}>{fmt(priceBeforeVat)}₮</Text>
                        <Text style={{...styles.tableCol, ...styles.col4}}>{fmt(finalPrice)}₮</Text>
                    </View>
                )
            })}
          </View>
          <View style={styles.totalRow}>
             <Text style={styles.totalText}>Нийт дүн: {fmt(totalFinalPrice)}₮</Text>
          </View>
        </View>
        
        {order.conditions && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Тээврийн нөхцөл</Text>
                <Text style={styles.text}><Text style={styles.bold}>Ачилт:</Text> {order.conditions.loading}</Text>
                <Text style={styles.text}><Text style={styles.bold}>Буулгалт:</Text> {order.conditions.unloading}</Text>
                <Text style={styles.text}><Text style={styles.bold}>Төлбөрийн нөхцөл:</Text> {order.conditions.paymentTerm}</Text>
            </View>
        )}
        
        <Text style={styles.footer}>Tumen Tech TMS - Тээвэр ложистикийн удирдлагын систем</Text>
      </Page>
    </Document>
  );
}

export default QuoteDocument;

    
