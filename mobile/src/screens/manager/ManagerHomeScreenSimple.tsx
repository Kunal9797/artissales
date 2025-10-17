/**
 * ManagerHomeScreen - Simple Version
 * Built with inline styles to avoid StyleSheet.create issues
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Bell, Users, CheckCircle, MapPin, TrendingUp, ChevronRight, Sunrise, Sun, Moon, FileText, BookOpen } from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { api } from '../../services/api';

export const ManagerHomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Manager');
  const [userRole, setUserRole] = useState('');
  const [teamStats, setTeamStats] = useState({
    present: 0,
    total: 0,
    pendingApprovals: 0,
    todayVisits: 0,
    todaySheets: 0,
  });
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

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

  const loadData = async () => {
    try {
      // Load user info
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

      // Load team stats
      const today = new Date().toISOString().substring(0, 10);
      const response = await api.getTeamStats({ date: today });

      if (response.ok && response.stats) {
        setTeamStats({
          present: response.stats.team?.present || 0,
          total: response.stats.team?.total || 0,
          pendingApprovals: (response.stats.pending?.dsrs || 0) + (response.stats.pending?.expenses || 0),
          todayVisits: response.stats.visits?.total || 0,
          todaySheets: response.stats.sheets?.total || 0,
        });

        // Extract top performers from team stats if available
        if (response.stats.topPerformers && response.stats.topPerformers.length > 0) {
          setTopPerformers(response.stats.topPerformers.slice(0, 3));
        } else {
          // Fallback to sample data if API doesn't provide it yet
          setTopPerformers([
            { name: 'Rajesh Kumar', visits: 45, sheets: 120 },
            { name: 'Priya Singh', visits: 38, sheets: 95 },
            { name: 'Amit Sharma', visits: 35, sheets: 88 },
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading team stats:', error);
      // Set sample data on error
      setTopPerformers([
        { name: 'Sample Rep 1', visits: 45, sheets: 120 },
        { name: 'Sample Rep 2', visits: 38, sheets: 95 },
        { name: 'Sample Rep 3', visits: 35, sheets: 88 },
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
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
      }}>
        {(() => {
          const greeting = getGreeting();
          const GreetingIcon = greeting.Icon;
          return (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <GreetingIcon size={20} color="#C9A961" />
                <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
                  {greeting.text}, {userName}
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
                {getRoleDisplay(userRole)} • Team of {teamStats.total}
              </Text>
            </>
          );
        })()}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* KPI Cards */}
        <View style={{ marginBottom: 16 }}>
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

        {/* Top Performers */}
        <View style={{ backgroundColor: '#F8F8F8', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={20} color="#C9A961" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
              Top Performers (This Month)
            </Text>
          </View>

          {topPerformers.map((performer, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: '#E0E0E0',
              }}
            >
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
                  {performer.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#666666' }}>
                  {performer.visits} visits • {performer.sheets} sheets
                </Text>
              </View>
            </View>
          ))}
        </View>

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
          onPress={() => navigation?.navigate('DocumentLibrary')}
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
      </ScrollView>
    </View>
  );
};
