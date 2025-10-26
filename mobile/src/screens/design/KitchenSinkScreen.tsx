/**
 * Kitchen Sink - Design Testing Playground
 * Test various UI components and design patterns
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MoreVertical, ChevronRight, CheckCircle, XCircle, User } from 'lucide-react-native';

// Mock account data
const mockAccount = {
  id: '1',
  name: 'Pradeep Construction Co.',
  type: 'contractor' as const,
  city: 'Mumbai',
  state: 'Maharashtra',
  phone: '+919876543212',
};

const mockAccount2 = {
  id: '2',
  name: 'Archspace Design Studio test',
  type: 'architect' as const,
  city: 'Delhi',
  state: 'Delhi',
  phone: '+919876555432',
};

const mockAccount3 = {
  id: '3',
  name: 'Artis Laminates Depot',
  type: 'distributor' as const,
  city: 'Pune',
  state: 'Maharashtra',
  phone: '+919876543210',
};

// Mock user data
const mockUser1 = {
  id: '1',
  name: 'Rajesh Kumar',
  role: 'rep' as const,
  territory: 'Mumbai',
  phone: '+919876543212',
  isActive: true,
};

const mockUser2 = {
  id: '2',
  name: 'Priya Sharma',
  role: 'area_manager' as const,
  territory: 'Delhi NCR',
  phone: '+919876555432',
  isActive: true,
};

const mockUser3 = {
  id: '3',
  name: 'Amit Patel',
  role: 'rep' as const,
  territory: 'Pune',
  phone: '+919876543210',
  isActive: false,
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'distributor': return '#1976D2'; // Blue
    case 'dealer': return '#FFA726'; // Orange
    case 'architect': return '#9C27B0'; // Purple
    case 'contractor': return '#666666'; // Gray
    default: return '#999999';
  }
};

const getTypeLabel = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'rep': return '#1976D2'; // Blue
    case 'area_manager': return '#2E7D32'; // Green
    case 'zonal_head': return '#F57C00'; // Orange
    case 'national_head': return '#7B1FA2'; // Purple
    case 'admin': return '#424242'; // Gray
    default: return '#999999';
  }
};

const getRoleLabel = (role: string) => {
  const roleMap: Record<string, string> = {
    rep: 'Sales Rep',
    area_manager: 'Area Manager',
    zonal_head: 'Zonal Head',
    national_head: 'National Head',
    admin: 'Admin',
  };
  return roleMap[role] || role;
};

export const KitchenSinkScreen: React.FC = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
      }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
          Design Kitchen Sink
        </Text>
        <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
          Account & Team Card Design Options
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Option A: Modern Compact Card */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
            Option A: Modern Compact
          </Text>
          <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
            2 rows, badge + meta inline, max density
          </Text>

          {/* Card A - Account 1 */}
          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                {mockAccount.name}
              </Text>
              <MoreVertical size={20} color="#999999" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                backgroundColor: getTypeColor(mockAccount.type),
              }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                  {getTypeLabel(mockAccount.type)}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
              <Text style={{ fontSize: 13, color: '#666666' }} numberOfLines={1}>
                {mockAccount.city}, {mockAccount.state.substring(0, 2).toUpperCase()}
              </Text>
              <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
              <Text style={{ fontSize: 13, color: '#666666' }}>
                {mockAccount.phone.substring(0, 13)}...
              </Text>
            </View>
          </TouchableOpacity>

          {/* Card A - Account 2 */}
          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                {mockAccount2.name}
              </Text>
              <MoreVertical size={20} color="#999999" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                backgroundColor: getTypeColor(mockAccount2.type),
              }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                  {getTypeLabel(mockAccount2.type)}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
              <Text style={{ fontSize: 13, color: '#666666' }} numberOfLines={1}>
                {mockAccount2.city}, {mockAccount2.state.substring(0, 2).toUpperCase()}
              </Text>
              <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
              <Text style={{ fontSize: 13, color: '#666666' }}>
                {mockAccount2.phone.substring(0, 13)}...
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Option B: Left-Aligned Badge Stack */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
            Option B: Badge Stack
          </Text>
          <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
            3 rows, badge prominent, full meta
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                {mockAccount.name}
              </Text>
              <ChevronRight size={20} color="#999999" />
            </View>
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              backgroundColor: getTypeColor(mockAccount.type),
              alignSelf: 'flex-start',
              marginBottom: 8,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                {getTypeLabel(mockAccount.type)}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#666666' }}>
              {mockAccount.city}, {mockAccount.state} • {mockAccount.phone}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                {mockAccount2.name}
              </Text>
              <ChevronRight size={20} color="#999999" />
            </View>
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              backgroundColor: getTypeColor(mockAccount2.type),
              alignSelf: 'flex-start',
              marginBottom: 8,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                {getTypeLabel(mockAccount2.type)}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#666666' }}>
              {mockAccount2.city}, {mockAccount2.state} • {mockAccount2.phone}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Option C: Inline Badge Prefix */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
            Option C: Badge Prefix
          </Text>
          <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
            2 rows, badge first, minimal meta
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={{
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 4,
                  backgroundColor: getTypeColor(mockAccount.type),
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFFFFF' }}>
                    {getTypeLabel(mockAccount.type)}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                  {mockAccount.name}
                </Text>
              </View>
              <MoreVertical size={20} color="#999999" />
            </View>
            <Text style={{ fontSize: 13, color: '#666666' }}>
              {mockAccount.city} • {mockAccount.phone.substring(0, 13)}...
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={{
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 4,
                  backgroundColor: getTypeColor(mockAccount2.type),
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFFFFF' }}>
                    {getTypeLabel(mockAccount2.type)}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                  {mockAccount2.name}
                </Text>
              </View>
              <MoreVertical size={20} color="#999999" />
            </View>
            <Text style={{ fontSize: 13, color: '#666666' }}>
              {mockAccount2.city} • {mockAccount2.phone.substring(0, 13)}...
            </Text>
          </TouchableOpacity>
        </View>

        {/* Option D: Card with Divider */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
            Option D: Premium Divider
          </Text>
          <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
            3 rows, name prominent, polished feel
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              paddingTop: 16,
              paddingHorizontal: 16,
              paddingBottom: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }} numberOfLines={1}>
              {mockAccount.name}
            </Text>
            <View style={{ height: 1, backgroundColor: '#E0E0E0', marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  backgroundColor: getTypeColor(mockAccount.type),
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                    {getTypeLabel(mockAccount.type)}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                <Text style={{ fontSize: 13, color: '#666666' }} numberOfLines={1}>
                  {mockAccount.city}, {mockAccount.state.substring(0, 2).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {mockAccount.phone.substring(0, 10)}...
                </Text>
              </View>
              <ChevronRight size={20} color="#999999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              paddingTop: 16,
              paddingHorizontal: 16,
              paddingBottom: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }} numberOfLines={1}>
              {mockAccount2.name}
            </Text>
            <View style={{ height: 1, backgroundColor: '#E0E0E0', marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  backgroundColor: getTypeColor(mockAccount2.type),
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                    {getTypeLabel(mockAccount2.type)}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                <Text style={{ fontSize: 13, color: '#666666' }} numberOfLines={1}>
                  {mockAccount2.city}, {mockAccount2.state.substring(0, 2).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {mockAccount2.phone.substring(0, 10)}...
                </Text>
              </View>
              <ChevronRight size={20} color="#999999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* === TEAM USER CARDS === */}
        <View style={{ marginTop: 32, marginBottom: 24, paddingTop: 24, borderTopWidth: 2, borderTopColor: '#E0E0E0' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
            Team User Cards - Reimagined
          </Text>
          <Text style={{ fontSize: 14, color: '#666666', marginBottom: 24 }}>
            Fresh designs focused on actionable info (no status badges)
          </Text>

          {/* Team Option 1: Today's Activity Focus */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Option 1: Today's Activity Focus ⭐
            </Text>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              Green dot = checked in, shows check-in time + today's activity
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32' }} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser1.name}
                  </Text>
                </View>
                <MoreVertical size={20} color="#999999" />
              </View>
              <Text style={{ fontSize: 13, color: '#666666', paddingLeft: 16 }}>
                {getRoleLabel(mockUser1.role)} • {mockUser1.territory} • 8:45 AM • 3 visits
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' }} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser3.name}
                  </Text>
                </View>
                <MoreVertical size={20} color="#999999" />
              </View>
              <Text style={{ fontSize: 13, color: '#999999', paddingLeft: 16 }}>
                {getRoleLabel(mockUser3.role)} • {mockUser3.territory} • Not checked in
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32' }} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser2.name}
                  </Text>
                </View>
                <MoreVertical size={20} color="#999999" />
              </View>
              <Text style={{ fontSize: 13, color: '#666666', paddingLeft: 16 }}>
                {getRoleLabel(mockUser2.role)} • {mockUser2.territory} • 9:15 AM • 1 visit
              </Text>
            </TouchableOpacity>
          </View>

          {/* Team Option 2: Ultra-Minimal with Role Color */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Option 2: Ultra-Minimal (Role Color Bar)
            </Text>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              4px left bar, 2 rows, cleanest possible design
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                paddingLeft: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
              }}
              activeOpacity={0.7}
            >
              <View style={{ width: 4, backgroundColor: getRoleColor(mockUser1.role), borderRadius: 2, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser1.name}
                  </Text>
                  <ChevronRight size={20} color="#999999" />
                </View>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {getRoleLabel(mockUser1.role)} • {mockUser1.territory} • {mockUser1.phone}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                paddingLeft: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
              }}
              activeOpacity={0.7}
            >
              <View style={{ width: 4, backgroundColor: getRoleColor(mockUser2.role), borderRadius: 2, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser2.name}
                  </Text>
                  <ChevronRight size={20} color="#999999" />
                </View>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {getRoleLabel(mockUser2.role)} • {mockUser2.territory} • {mockUser2.phone}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                paddingLeft: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
              }}
              activeOpacity={0.7}
            >
              <View style={{ width: 4, backgroundColor: getRoleColor(mockUser3.role), borderRadius: 2, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser3.name}
                  </Text>
                  <ChevronRight size={20} color="#999999" />
                </View>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {getRoleLabel(mockUser3.role)} • {mockUser3.territory} • {mockUser3.phone}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Team Option 3: Stats-Driven Card */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Option 3: Stats-Driven (Weekly Performance)
            </Text>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              Show performance metrics instead of status
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                  {mockUser1.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#999999', fontWeight: '600' }}>THIS WEEK</Text>
                  <MoreVertical size={20} color="#999999" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {getRoleLabel(mockUser1.role)} • {mockUser1.territory}
                </Text>
                <Text style={{ fontSize: 13, color: '#1A1A1A', fontWeight: '600' }}>
                  12 visits • 87 sheets
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                  {mockUser2.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#999999', fontWeight: '600' }}>THIS WEEK</Text>
                  <MoreVertical size={20} color="#999999" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {getRoleLabel(mockUser2.role)} • {mockUser2.territory}
                </Text>
                <Text style={{ fontSize: 13, color: '#1A1A1A', fontWeight: '600' }}>
                  8 visits • 45 sheets
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                  {mockUser3.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#999999', fontWeight: '600' }}>THIS WEEK</Text>
                  <MoreVertical size={20} color="#999999" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {getRoleLabel(mockUser3.role)} • {mockUser3.territory}
                </Text>
                <Text style={{ fontSize: 13, color: '#999999', fontWeight: '600' }}>
                  0 visits • 0 sheets
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Team Option 4: Contact-First Design */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Option 4: Contact-First (Quick Actions)
            </Text>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              Initials avatar + call button for quick communication
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: getRoleColor(mockUser1.role),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                  {mockUser1.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }} numberOfLines={1}>
                  {mockUser1.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {getRoleLabel(mockUser1.role)} • {mockUser1.territory}
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#2E7D32',
                  borderRadius: 6,
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Call</Text>
              </TouchableOpacity>
              <MoreVertical size={20} color="#999999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: getRoleColor(mockUser2.role),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                  {mockUser2.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }} numberOfLines={1}>
                  {mockUser2.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {getRoleLabel(mockUser2.role)} • {mockUser2.territory}
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#2E7D32',
                  borderRadius: 6,
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Call</Text>
              </TouchableOpacity>
              <MoreVertical size={20} color="#999999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: getRoleColor(mockUser3.role),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                  {mockUser3.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }} numberOfLines={1}>
                  {mockUser3.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#666666' }}>
                  {getRoleLabel(mockUser3.role)} • {mockUser3.territory}
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#2E7D32',
                  borderRadius: 6,
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Call</Text>
              </TouchableOpacity>
              <MoreVertical size={20} color="#999999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* === OLD TEAM USER CARDS (with status badges) === */}
        <View style={{ marginTop: 32, marginBottom: 24, paddingTop: 24, borderTopWidth: 2, borderTopColor: '#E0E0E0' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
            Old Team User Cards (With Status Badges)
          </Text>
          <Text style={{ fontSize: 14, color: '#666666', marginBottom: 24 }}>
            Previous designs - kept for comparison
          </Text>

          {/* Team Option A: Compact No-Avatar */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Option A: Compact (No Avatar)
            </Text>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              2 rows, role + territory + phone inline, status badge
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                  {mockUser1.name}
                </Text>
                <MoreVertical size={20} color="#999999" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 13, color: '#666666' }}>
                    {getRoleLabel(mockUser1.role)}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                  <Text style={{ fontSize: 13, color: '#666666' }}>
                    {mockUser1.territory}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                  <Text style={{ fontSize: 13, color: '#666666' }}>
                    {mockUser1.phone.substring(0, 13)}...
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: '#E8F5E9',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginLeft: 8,
                }}>
                  <CheckCircle size={12} color="#2E7D32" />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#2E7D32' }}>Active</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                  {mockUser3.name}
                </Text>
                <MoreVertical size={20} color="#999999" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 13, color: '#666666' }}>
                    {getRoleLabel(mockUser3.role)}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                  <Text style={{ fontSize: 13, color: '#666666' }}>
                    {mockUser3.territory}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                  <Text style={{ fontSize: 13, color: '#666666' }}>
                    {mockUser3.phone.substring(0, 13)}...
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: '#FFEBEE',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginLeft: 8,
                }}>
                  <XCircle size={12} color="#EF5350" />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF5350' }}>Inactive</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Team Option B: Role-Colored Accent Bar */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Option B: Role-Colored Accent
            </Text>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              4px left bar (role color), 2 rows, visual scanning
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                paddingLeft: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
              }}
              activeOpacity={0.7}
            >
              <View style={{ width: 4, backgroundColor: getRoleColor(mockUser1.role), borderRadius: 2, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser1.name}
                  </Text>
                  <MoreVertical size={20} color="#999999" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {getRoleLabel(mockUser1.role)}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {mockUser1.territory}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {mockUser1.phone.substring(0, 10)}...
                    </Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: '#E8F5E9',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginLeft: 8,
                  }}>
                    <CheckCircle size={12} color="#2E7D32" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#2E7D32' }}>Active</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                paddingLeft: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
              }}
              activeOpacity={0.7}
            >
              <View style={{ width: 4, backgroundColor: getRoleColor(mockUser2.role), borderRadius: 2, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser2.name}
                  </Text>
                  <MoreVertical size={20} color="#999999" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {getRoleLabel(mockUser2.role)}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {mockUser2.territory}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {mockUser2.phone.substring(0, 10)}...
                    </Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: '#E8F5E9',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginLeft: 8,
                  }}>
                    <CheckCircle size={12} color="#2E7D32" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#2E7D32' }}>Active</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Team Option C: Mini Avatar with Initials */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Option C: Mini Avatar (32px)
            </Text>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              Small initials avatar, keeps visual identity
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: getRoleColor(mockUser1.role),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                  {mockUser1.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser1.name}
                  </Text>
                  <MoreVertical size={20} color="#999999" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {getRoleLabel(mockUser1.role)}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {mockUser1.territory}
                    </Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: '#E8F5E9',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginLeft: 8,
                  }}>
                    <CheckCircle size={12} color="#2E7D32" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#2E7D32' }}>Active</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: getRoleColor(mockUser2.role),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                  {mockUser2.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser2.name}
                  </Text>
                  <MoreVertical size={20} color="#999999" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {getRoleLabel(mockUser2.role)}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
                    <Text style={{ fontSize: 13, color: '#666666' }}>
                      {mockUser2.territory}
                    </Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: '#E8F5E9',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginLeft: 8,
                  }}>
                    <CheckCircle size={12} color="#2E7D32" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#2E7D32' }}>Active</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Team Option D: Icon-Only Status */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Option D: Icon-Only Status
            </Text>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              No avatar, small status icon instead of badge
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <CheckCircle size={16} color="#2E7D32" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser1.name}
                  </Text>
                </View>
                <ChevronRight size={20} color="#999999" />
              </View>
              <Text style={{ fontSize: 13, color: '#666666', paddingLeft: 24 }}>
                {getRoleLabel(mockUser1.role)} • {mockUser1.territory} • {mockUser1.phone.substring(0, 13)}...
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <XCircle size={16} color="#EF5350" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                    {mockUser3.name}
                  </Text>
                </View>
                <ChevronRight size={20} color="#999999" />
              </View>
              <Text style={{ fontSize: 13, color: '#666666', paddingLeft: 24 }}>
                {getRoleLabel(mockUser3.role)} • {mockUser3.territory} • {mockUser3.phone.substring(0, 13)}...
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Design Notes */}
        <View style={{
          backgroundColor: '#E3F2FD',
          borderRadius: 8,
          padding: 16,
          marginTop: 8,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
            Account Cards - Design Notes
          </Text>
          <Text style={{ fontSize: 13, color: '#666666', lineHeight: 20 }}>
            • Option A: Best balance of density and readability{'\n'}
            • Option B: Most readable, but tallest{'\n'}
            • Option C: Most compact, but badge position unconventional{'\n'}
            • Option D: Premium feel, good for important accounts
          </Text>
        </View>

        {/* Team Design Notes */}
        <View style={{
          backgroundColor: '#E8F5E9',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
            Team Cards - Reimagined Design Notes
          </Text>
          <Text style={{ fontSize: 13, color: '#666666', lineHeight: 20 }}>
            • Option 1: Best for daily monitoring (check-in status + activity){'\n'}
            • Option 2: Cleanest design, role color bar for hierarchy{'\n'}
            • Option 3: Performance-focused, shows weekly metrics{'\n'}
            • Option 4: Communication-first, one-tap calling
          </Text>
        </View>

        {/* Recommendation */}
        <View style={{
          backgroundColor: '#FFF3E0',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
            💡 Recommendation
          </Text>
          <Text style={{ fontSize: 13, color: '#666666', lineHeight: 20 }}>
            For Accounts: Option A (Modern Compact){'\n'}
            For Team: Option 1 (Today's Activity) or Option 2 (Ultra-Minimal){'\n\n'}
            Both are ~56px height, clean, and information-dense without clutter.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};