/**
 * ReviewHomeScreen - DSR Approval Dashboard
 *
 * Review and approve Daily Sales Reports (DSRs)
 * DSRs contain: attendance, visits, sheets sold, expenses for the day
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput } from 'react-native';
import { FileText, User as UserIcon, CheckCircle, XCircle, Clock, MapPin, TrendingUp, IndianRupee, FileBarChart, Search } from 'lucide-react-native';
import { api } from '../../services/api';
import { Skeleton } from '../../patterns';

export const ReviewHomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [dsrs, setDsrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const dsrResponse = await api.getPendingDSRs({ status: statusFilter === 'all' ? undefined : statusFilter });

      if (dsrResponse.ok) {
        setDsrs(dsrResponse.dsrs || []);
      }
    } catch (error) {
      console.error('Error loading DSRs:', error);
      setDsrs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: '#E8F5E9', color: '#2E7D32', Icon: CheckCircle, label: 'Approved' };
      case 'rejected':
        return { bg: '#FFEBEE', color: '#EF5350', Icon: XCircle, label: 'Rejected' };
      default:
        return { bg: '#FFF3E0', color: '#FFA726', Icon: Clock, label: 'Pending' };
    }
  };

  const handleReportsPress = () => {
    Alert.alert('Performance Reports', 'Report generation coming soon');
  };

  // Filter DSRs by search term
  const filteredDSRs = dsrs.filter((dsr) =>
    dsr.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDSRItem = ({ item }: { item: any }) => {
    const badge = getStatusBadge(item.status || 'pending');
    const BadgeIcon = badge.Icon;

    return (
      <TouchableOpacity
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E0E0E0',
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
        }}
        onPress={() => {
          if (navigation) {
            navigation.navigate('DSRApprovalDetail', { reportId: item.id });
          }
        }}
      >
        {/* Header Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <UserIcon size={18} color="#666666" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
              {item.userName || 'Unknown User'}
            </Text>
          </View>

          {/* Status Badge */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: badge.bg,
            borderRadius: 12,
          }}>
            <BadgeIcon size={12} color={badge.color} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: badge.color }}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Clock size={14} color="#999999" />
          <Text style={{ fontSize: 14, color: '#666666' }}>
            {new Date(item.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
          {item.totalVisits > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} color="#1976D2" />
              <Text style={{ fontSize: 14, color: '#666666' }}>
                {item.totalVisits} visits
              </Text>
            </View>
          )}

          {item.totalSheets > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={14} color="#7B1FA2" />
              <Text style={{ fontSize: 14, color: '#666666' }}>
                {item.totalSheets} sheets
              </Text>
            </View>
          )}

          {item.totalExpenses > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IndianRupee size={14} color="#E65100" />
              <Text style={{ fontSize: 14, color: '#666666' }}>
                ₹{item.totalExpenses?.toLocaleString('en-IN') || 0}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
              Review DSRs
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
              {dsrs.length} reports
            </Text>
          </View>

          {/* Reports Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#C9A961',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={handleReportsPress}
          >
            <FileBarChart size={18} color="#393735" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Reports</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F5F5F5',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}>
          <Search size={20} color="#999999" />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 14,
              color: '#1A1A1A',
            }}
            placeholder="Search by user name..."
            placeholderTextColor="#999999"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Status Filter Chips - No background for seamless look */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { value: 'pending', label: 'Pending', count: filteredDSRs.filter(d => d.status === 'pending').length },
            { value: 'approved', label: 'Approved', count: filteredDSRs.filter(d => d.status === 'approved').length },
            { value: 'all', label: 'All', count: filteredDSRs.length },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: statusFilter === filter.value ? '#393735' : '#FFFFFF',
                borderWidth: 1,
                borderColor: statusFilter === filter.value ? '#393735' : '#E0E0E0',
              }}
              onPress={() => setStatusFilter(filter.value as any)}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: statusFilter === filter.value ? '#FFFFFF' : '#666666',
              }}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* DSR List */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <Skeleton card />
          <Skeleton card />
          <Skeleton card />
          <Skeleton card />
        </View>
      ) : (
        <FlatList
          data={filteredDSRs}
          renderItem={renderDSRItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <FileText size={48} color="#E0E0E0" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginTop: 16 }}>
                {searchTerm ? 'No matching DSRs found' : `No ${statusFilter === 'all' ? '' : statusFilter} DSRs`}
              </Text>
              <Text style={{ fontSize: 14, color: '#666666', marginTop: 8, textAlign: 'center' }}>
                {searchTerm
                  ? 'Try a different search term'
                  : (statusFilter === 'pending' ? 'All DSRs have been reviewed' : 'Pull down to refresh')
                }
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};
