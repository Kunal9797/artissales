'use client';

/**
 * Visits by Type Chart
 *
 * Bar chart showing visits breakdown by account type
 * Uses Tremor for responsive, accessible charts
 */

import { BarChart, Card, Title } from '@tremor/react';

interface VisitsData {
  distributor: number;
  dealer: number;
  architect: number;
  contractor: number;
}

interface VisitsByTypeChartProps {
  data: VisitsData | undefined;
  isLoading?: boolean;
}

export function VisitsByTypeChart({ data, isLoading }: VisitsByTypeChartProps) {
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
      name: 'Distributor',
      Visits: data.distributor,
    },
    {
      name: 'Dealer',
      Visits: data.dealer,
    },
    {
      name: 'Architect',
      Visits: data.architect,
    },
    {
      name: 'Contractor',
      Visits: data.contractor,
    },
  ];

  return (
    <Card className="shadow-lg">
      <Title className="text-xl font-bold text-gray-900">Visits by Type</Title>
      <BarChart
        data={chartData}
        index="name"
        categories={['Visits']}
        colors={['blue']}
        valueFormatter={(number) => `${number} visits`}
        yAxisWidth={60}
        showLegend={false}
        className="mt-6 h-80"
      />
    </Card>
  );
}
