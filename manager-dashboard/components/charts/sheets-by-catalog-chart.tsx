'use client';

/**
 * Sheets by Catalog Chart
 *
 * Bar chart showing sheets sold breakdown by catalog
 * Uses Tremor for responsive, accessible charts
 */

import { BarChart, Card, Title } from '@tremor/react';

interface SheetsData {
  'Fine Decor': number;
  'Artvio': number;
  'Woodrica': number;
  'Artis 1MM': number;
}

interface SheetsByCatalogChartProps {
  data: SheetsData | undefined;
  isLoading?: boolean;
}

export function SheetsByCatalogChart({ data, isLoading }: SheetsByCatalogChartProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="h-6 w-40 bg-gray-200 animate-pulse rounded mb-4"></div>
        <div className="h-64 bg-gray-100 animate-pulse rounded mt-6"></div>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Transform data for Tremor BarChart
  const chartData = [
    {
      name: 'Fine Decor',
      Sheets: data['Fine Decor'],
    },
    {
      name: 'Artvio',
      Sheets: data['Artvio'],
    },
    {
      name: 'Woodrica',
      Sheets: data['Woodrica'],
    },
    {
      name: 'Artis 1MM',
      Sheets: data['Artis 1MM'],
    },
  ];

  return (
    <Card className="shadow-lg">
      <Title className="text-xl font-bold text-gray-900">Sheets Sold by Catalog</Title>
      <BarChart
        data={chartData}
        index="name"
        categories={['Sheets']}
        colors={['violet']}
        valueFormatter={(number) => `${number} sheets`}
        yAxisWidth={60}
        showLegend={false}
        className="mt-6 h-80"
      />
    </Card>
  );
}
