'use client';

/**
 * Dashboard Home Page
 *
 * Main dashboard view for managers
 */

import { useAuth, useSignOut, useManagerAccess } from '@/hooks/use-auth';
import { useTeamStatsData } from '@/hooks/use-team-stats';
import { VisitsByTypeChart } from '@/components/charts/visits-by-type-chart';
import { SheetsByCatalogChart } from '@/components/charts/sheets-by-catalog-chart';
import { Card, Grid, Metric, Text, Flex, BadgeDelta } from '@tremor/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { formatIndianNumber, formatPercentage } from '@/lib/utils';

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: accessLoading, role, userProfile } = useManagerAccess();
  const { stats, isLoading: statsLoading, error: statsError } = useTeamStatsData();
  const signOutMutation = useSignOut();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync();
    router.push('/login');
  };

  // Loading state
  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A961] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect
  }

  // Access denied - user is not a manager
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#393735] to-[#1a1918]">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Access Denied Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              This dashboard is for managers only. Your role: <span className="font-semibold text-red-600">{role}</span>
            </p>

            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                If you believe this is an error, contact your administrator.
              </p>

              <button
                onClick={handleSignOut}
                disabled={signOutMutation.isPending}
                className="w-full bg-[#C9A961] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#D4AF37] transition disabled:opacity-50"
              >
                {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Temporary Navbar */}
      <nav className="bg-[#393735] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-[#C9A961]">Artis Dashboard</h1>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/team')}
                  className="text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  Team
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white text-sm">{userProfile?.name}</p>
                <p className="text-gray-400 text-xs capitalize">{role?.replace('_', ' ')}</p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signOutMutation.isPending}
                className="bg-[#C9A961] text-white px-4 py-2 rounded-lg hover:bg-[#D4AF37] transition disabled:opacity-50"
              >
                {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userProfile?.name}! 👋
          </h2>
          <Text className="text-gray-600">
            {role?.replace('_', ' ').toUpperCase()} • {userProfile?.phone}
            {userProfile?.territory && <> • {userProfile.territory}</>}
          </Text>
        </div>

        {/* KPI Cards - Custom Styled */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Team Present */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-emerald-100 text-sm font-medium mb-2">Team Present</p>
            <p className="text-4xl font-bold mb-3">
              {stats?.team.present || 0}<span className="text-2xl">/{stats?.team.total || 0}</span>
            </p>
            <p className="text-emerald-100 text-sm">
              {formatPercentage((stats?.team.presentPercentage || 0) / 100)} attendance
            </p>
          </div>

          {/* Today's Visits */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-blue-100 text-sm font-medium mb-2">Today's Visits</p>
            <p className="text-4xl font-bold mb-3">{formatIndianNumber(stats?.visits.total || 0)}</p>
            <p className="text-blue-100 text-sm">
              {stats?.visits.distributor || 0} Dist • {stats?.visits.dealer || 0} Deal • {stats?.visits.architect || 0} Arch
            </p>
          </div>

          {/* Pending Approvals */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-amber-100 text-sm font-medium mb-2">Pending Approvals</p>
            <p className="text-4xl font-bold mb-3">
              {(stats?.pending.dsrs || 0) + (stats?.pending.expenses || 0)}
            </p>
            <p className="text-amber-100 text-sm">
              {stats?.pending.dsrs || 0} DSRs • {stats?.pending.expenses || 0} Expenses
            </p>
          </div>

          {/* Sheets Sold */}
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg p-6 text-white">
            <p className="text-violet-100 text-sm font-medium mb-2">Today's Sheets</p>
            <p className="text-4xl font-bold mb-3">{formatIndianNumber(stats?.sheets.total || 0)}</p>
            <p className="text-violet-100 text-sm">Total sheets sold today</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <VisitsByTypeChart data={stats?.visits} isLoading={statsLoading} />
          <SheetsByCatalogChart data={stats?.sheets.byCatalog} isLoading={statsLoading} />
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-gradient-to-r from-[#393735] to-[#1a1918] rounded-lg shadow-md p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">More Features Coming Soon 🚧</h3>
          <p className="mb-6">
            Team List, User Details, DSR Reviews, and Account Management pages are being built next!
          </p>
          <div className="inline-block bg-[#C9A961] px-6 py-3 rounded-lg">
            <p className="font-semibold">Phase 2 In Progress: Dashboard with Real Data ✅</p>
          </div>
        </div>
      </main>
    </div>
  );
}
