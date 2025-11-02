/**
 * ManagerHomeScreen - Simple Version
 * Built with inline styles to avoid StyleSheet.create issues
 */

import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '../../utils/logger';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { Bell, Users, MapPin, TrendingUp, ChevronRight, Sunrise, Sun, Moon, BookOpen, Palette } from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { api } from '../../services/api';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { Skeleton } from '../../patterns/Skeleton';
import { useQuery } from '@tanstack/react-query';

export const ManagerHomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Manager');
  const [userRole, setUserRole] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', Icon: Sunrise };
    if (hour < 18) return { text: 'Good Afternoon', Icon: Sun };
    return { text: 'Good Evening', Icon: Moon };
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      national_head: 'National Head',
      zonal_head: 'Zonal Head',
      area_manager: 'Area Manager',
      admin: 'Admin',
    };
    return roleMap[role] || role;
  };

  // Get today's date for team stats
  const today = useMemo(() => new Date().toISOString().substring(0, 10), []);

  // Fetch team stats using React Query with caching
  const {
    data: teamStatsData,
    isLoading: loading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['teamStats', today],
    queryFn: async () => {
      const response = await api.getTeamStats({ date: today });

      if (response.ok && response.stats) {
        return {
          present: response.stats.team?.present || 0,
          total: response.stats.team?.total || 0,
          pendingApprovals: (response.stats.pending?.dsrs || 0) + (response.stats.pending?.expenses || 0),
          todayVisits: response.stats.visits?.total || 0,
          todaySheets: response.stats.sheets?.total || 0,
        };
      }
      return {
        present: 0,
        total: 0,
        pendingApprovals: 0,
        todayVisits: 0,
        todaySheets: 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (fresher data for manager dashboard)
  });

  const teamStats = teamStatsData || {
    present: 0,
    total: 0,
    pendingApprovals: 0,
    todayVisits: 0,
    todaySheets: 0,
  };

  // Load user info on mount
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData?.name || 'Manager');
            setUserRole(userData?.role || '');
          }
        }
      } catch (error) {
        logger.error('Error loading user info:', error);
      }
    };
    loadUserInfo();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header with Greeting */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        position: 'relative',
      }}>
        {/* Artis Logo - Translucent background (behind text) */}
        <View style={{
          position: 'absolute',
          right: 16,
          top: 40,
          opacity: 0.15,
          zIndex: 0,
        }}>
          <Image
            source={require('../../../assets/images/artislogo_blackbgrd.png')}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>

        {/* Greeting content - overlays logo */}
        <View style={{ zIndex: 1 }}>
          {(() => {
            const greeting = getGreeting();
            const GreetingIcon = greeting.Icon;
            return (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <GreetingIcon size={20} color="#C9A961" />
                  <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF', flex: 1 }}>
                    {greeting.text}, {userName.charAt(0).toUpperCase() + userName.slice(1)}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
                  {getRoleDisplay(userRole)} • Team of {teamStats.total}
                </Text>
              </>
            );
          })()}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 60 + bottomPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* KPI Cards */}
        <View style={{ marginBottom: 16 }}>
          {loading ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <Skeleton card style={{ flex: 1, height: 110 }} />
                <Skeleton card style={{ flex: 1, height: 110 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Skeleton card style={{ flex: 1, height: 110 }} />
                <Skeleton card style={{ flex: 1, height: 110 }} />
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {/* Team Present */}
                <View style={{ flex: 1, backgroundColor: '#F8F8F8', padding: 16, borderRadius: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Users size={20} color="#2E7D32" />
                    <Text style={{ fontSize: 12, color: '#666666', fontWeight: '500' }}>TEAM PRESENT</Text>
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A' }}>
                    {teamStats.present}/{teamStats.total}
                  </Text>
                </View>

                {/* Pending Approvals */}
                <View style={{ flex: 1, backgroundColor: '#F8F8F8', padding: 16, borderRadius: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Bell size={20} color="#FFA726" />
                    <Text style={{ fontSize: 12, color: '#666666', fontWeight: '500' }}>PENDING</Text>
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A' }}>
                    {teamStats.pendingApprovals}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* Today's Visits */}
                <View style={{ flex: 1, backgroundColor: '#F8F8F8', padding: 16, borderRadius: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <MapPin size={20} color="#1976D2" />
                    <Text style={{ fontSize: 12, color: '#666666', fontWeight: '500' }}>VISITS</Text>
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A' }}>
                    {teamStats.todayVisits}
                  </Text>
                </View>

                {/* Today's Sheets */}
                <View style={{ flex: 1, backgroundColor: '#F8F8F8', padding: 16, borderRadius: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TrendingUp size={20} color="#7B1FA2" />
                    <Text style={{ fontSize: 12, color: '#666666', fontWeight: '500' }}>SHEETS</Text>
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A' }}>
                    {teamStats.todaySheets}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Alerts Section */}
        {teamStats.pendingApprovals > 0 && (
          <View style={{ backgroundColor: '#FFF3E0', borderRadius: 8, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FFA726' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Bell size={20} color="#FFA726" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
                Alerts
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, color: '#666666' }}>
                • {teamStats.pendingApprovals} pending approvals require attention
              </Text>
              {teamStats.present < teamStats.total && (
                <Text style={{ fontSize: 14, color: '#666666' }}>
                  • {teamStats.total - teamStats.present} team members not checked in today
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Documents - Compact Card */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8F8F8',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#E0E0E0',
          }}
          onPress={() => navigation?.navigate('Documents')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#393735',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BookOpen size={20} color="#C9A961" />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
                Document Library
              </Text>
              <Text style={{ fontSize: 13, color: '#666666' }}>
                Catalogs, price lists & resources
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color="#999999" />
        </TouchableOpacity>

        {/* Design Kitchen Sink - Compact Card */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8F8F8',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#E0E0E0',
          }}
          onPress={() => navigation?.navigate('AccountDesignKitchenSink')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#9C27B0',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Palette size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
                Design Kitchen Sink
              </Text>
              <Text style={{ fontSize: 13, color: '#666666' }}>
                UI component testing playground
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color="#999999" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
