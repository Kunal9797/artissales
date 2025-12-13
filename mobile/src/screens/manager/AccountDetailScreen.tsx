/**
 * AccountDetailScreen - View account details and visit history
 *
 * Design: Modern card-based UI matching TeamStatsScreen
 * Performance: Account details load instantly, visits load separately
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Building2,
  Phone,
  MapPin,
  Edit2,
  Calendar,
  User,
  Camera,
  ChevronDown,
  ExternalLink,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Skeleton } from '../../patterns';
import { colors, spacing, featureColors } from '../../theme';
import { PhotoViewer } from '../../components/PhotoViewer';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountDetail'>;

interface AccountData {
  id: string;
  name: string;
  type: string;
  phone?: string;
  city: string;
  state: string;
  pincode?: string;
  createdBy?: string;
}

interface Visit {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  purpose: string;
  notes?: string;
  photoCount?: number;
}

const VISITS_PER_PAGE = 10;

// Type colors matching SelectAccountScreen
const TYPE_COLORS = {
  distributor: { primary: '#1976D2', light: '#E3F2FD' },  // Blue
  dealer: { primary: '#388E3C', light: '#E8F5E9' },       // Green
  architect: { primary: '#F57C00', light: '#FFF3E0' },    // Orange
  oem: { primary: '#7B1FA2', light: '#F3E5F5' },          // Purple
} as const;

const getTypeColor = (type: string) => {
  const normalizedType = type.toLowerCase() as keyof typeof TYPE_COLORS;
  return TYPE_COLORS[normalizedType] || { primary: '#666666', light: '#F5F5F5' };
};

const getTypeLabel = (type: string) => {
  if (type === 'OEM') return 'OEM';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Purpose badge colors
const PURPOSE_COLORS: Record<string, { bg: string; text: string }> = {
  sample_delivery: { bg: '#E3F2FD', text: '#1976D2' },
  follow_up: { bg: '#F3E5F5', text: '#7B1FA2' },
  complaint: { bg: '#FFEBEE', text: '#C62828' },
  new_lead: { bg: '#E8F5E9', text: '#2E7D32' },
  payment_collection: { bg: '#FFF3E0', text: '#E65100' },
  other: { bg: '#F5F5F5', text: '#666666' },
};

const getPurposeColor = (purpose: string) => {
  return PURPOSE_COLORS[purpose] || PURPOSE_COLORS.other;
};

const formatPurpose = (purpose: string) => {
  return purpose
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const AccountDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const bottomPadding = useBottomSafeArea(12);
  const { accountId, account: passedAccount } = route.params as { accountId: string; account?: AccountData };

  // Account can be shown instantly if passed, otherwise load it
  const [account, setAccount] = useState<AccountData | null>(passedAccount || null);
  const [accountLoading, setAccountLoading] = useState(!passedAccount);

  // Visits load separately
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [lastVisitId, setLastVisitId] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  // Photo viewer state
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<string | null>(null);

  // Handle phone call
  const handleCall = useCallback(() => {
    const phone = account?.phone?.trim();
    if (!phone) return;
    // Remove all non-digit characters except + at the start
    const phoneNumber = phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    // encodeURIComponent converts + to %2B which Android dialer understands
    const url = `tel:${encodeURIComponent(phoneNumber)}`;
    Linking.openURL(url).catch(err => logger.error('Failed to open phone:', err));
  }, [account?.phone]);

  // Lazy load photos when user taps
  const handlePhotoTap = useCallback(async (visitId: string, photoCount: number) => {
    if (photoCount === 0) return;

    setLoadingPhotos(visitId);
    try {
      const response = await api.getVisitPhotos({ visitId });
      if (response.ok && response.photos?.length > 0) {
        setViewingPhotos(response.photos);
        setPhotoViewerVisible(true);
      }
    } catch (error) {
      logger.error('Error loading photos:', error);
    } finally {
      setLoadingPhotos(null);
    }
  }, []);

  // Load account and visits data
  const loadData = async (isRefresh = false) => {
    try {
      const response = await api.getAccountDetails({
        accountId,
        limit: VISITS_PER_PAGE,
      });

      if (response.ok) {
        setAccount(response.account);
        setAccountLoading(false);
        setVisits(response.visits || []);
        setHasMore(response.hasMore || false);
        setLastVisitId(response.lastVisitId);
      } else {
        logger.error('API returned not ok:', response);
        if (!passedAccount) {
          setAccount(null);
          setAccountLoading(false);
        }
        setVisits([]);
      }
    } catch (error) {
      logger.error('Error loading account details:', error);
      if (!passedAccount) {
        setAccount(null);
        setAccountLoading(false);
      }
      setVisits([]);
    } finally {
      setVisitsLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreVisits = async () => {
    if (!hasMore || loadingMore || !lastVisitId) return;

    setLoadingMore(true);
    try {
      const response = await api.getAccountDetails({
        accountId,
        limit: VISITS_PER_PAGE,
        startAfter: lastVisitId,
      });

      if (response.ok) {
        setVisits(prev => [...prev, ...(response.visits || [])]);
        setHasMore(response.hasMore || false);
        setLastVisitId(response.lastVisitId);
      }
    } catch (error) {
      logger.error('Error loading more visits:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accountId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  // Loading state for account (only if not passed)
  if (accountLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.inverse} />
          </TouchableOpacity>
          <Skeleton rows={1} />
        </View>
        <ScrollView style={styles.content} contentContainerStyle={{ padding: spacing.lg }}>
          <Skeleton card />
          <Skeleton rows={3} />
        </ScrollView>
      </View>
    );
  }

  // Account not found
  if (!account) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Account not found</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColor = getTypeColor(account.type);

  return (
    <View style={styles.container}>
      {/* Header - Shows instantly */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.inverse} />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            {account.phone?.trim() && (
              <TouchableOpacity style={styles.headerActionBtn} onPress={handleCall}>
                <Phone size={20} color={colors.accent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.headerActionBtn, styles.editBtn]}
              onPress={() => {
                navigation.navigate('EditAccount', {
                  account,
                  onAccountUpdated: () => loadData(),
                });
              }}
            >
              <Edit2 size={18} color={colors.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Info Card */}
        <View style={styles.accountCard}>
          <View style={[styles.accountIcon, { backgroundColor: typeColor.light }]}>
            <Building2 size={28} color={typeColor.primary} />
          </View>

          <View style={styles.accountInfo}>
            <Text style={styles.accountName} numberOfLines={2}>{account.name}</Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColor.primary }]}>
              <Text style={styles.typeBadgeText}>{getTypeLabel(account.type)}</Text>
            </View>
          </View>
        </View>

        {/* Contact Details */}
        <View style={styles.contactRow}>
          {account.phone?.trim() && (
            <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
              <Phone size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.contactText}>{account.phone}</Text>
              <ExternalLink size={12} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
          <View style={styles.contactItem}>
            <MapPin size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.contactText}>
              {account.city}, {account.state}
              {account.pincode && ` - ${account.pincode}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Content - Visit History */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + bottomPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Visit History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: featureColors.visits.light }]}>
                <Calendar size={16} color={featureColors.visits.primary} />
              </View>
              <Text style={styles.sectionTitle}>VISIT HISTORY</Text>
            </View>
            {visits.length > 0 && (
              <Text style={styles.sectionCount}>{visits.length}{hasMore ? '+' : ''}</Text>
            )}
          </View>

          {/* Loading State */}
          {visitsLoading ? (
            <View style={styles.card}>
              <Skeleton rows={3} />
            </View>
          ) : visits.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyCard}>
              <Calendar size={48} color="#E0E0E0" />
              <Text style={styles.emptyText}>No visits recorded yet</Text>
              <Text style={styles.emptySubtext}>Visits to this account will appear here</Text>
            </View>
          ) : (
            /* Visit Cards */
            <>
              {visits.map((visit) => {
                const purposeColor = getPurposeColor(visit.purpose);
                return (
                  <View key={visit.id} style={styles.visitCard}>
                    {/* Visit Header */}
                    <View style={styles.visitHeader}>
                      <View style={styles.visitUserRow}>
                        <View style={styles.visitUserAvatar}>
                          <User size={14} color="#666" />
                        </View>
                        <Text style={styles.visitUserName}>{visit.userName || 'Unknown'}</Text>
                      </View>
                      <Text style={styles.visitDate}>
                        {new Date(visit.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>

                    {/* Purpose Badge */}
                    <View style={[styles.purposeBadge, { backgroundColor: purposeColor.bg }]}>
                      <Text style={[styles.purposeText, { color: purposeColor.text }]}>
                        {formatPurpose(visit.purpose)}
                      </Text>
                    </View>

                    {/* Notes */}
                    {visit.notes && (
                      <Text style={styles.visitNotes}>{visit.notes}</Text>
                    )}

                    {/* Photos Button */}
                    {visit.photoCount !== undefined && visit.photoCount > 0 && (
                      <TouchableOpacity
                        style={styles.photosBtn}
                        onPress={() => handlePhotoTap(visit.id, visit.photoCount!)}
                        disabled={loadingPhotos === visit.id}
                      >
                        {loadingPhotos === visit.id ? (
                          <ActivityIndicator size="small" color="#666" />
                        ) : (
                          <Camera size={16} color="#666" />
                        )}
                        <Text style={styles.photosBtnText}>
                          {loadingPhotos === visit.id
                            ? 'Loading...'
                            : `${visit.photoCount} ${visit.photoCount === 1 ? 'Photo' : 'Photos'}`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {/* Load More Button */}
              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={loadMoreVisits}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <>
                      <ChevronDown size={18} color="#666" />
                      <Text style={styles.loadMoreText}>Load More Visits</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Photo Viewer Modal */}
      <PhotoViewer
        visible={photoViewerVisible}
        photos={viewingPhotos}
        onClose={() => setPhotoViewerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 16,
  },
  goBackBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackBtnText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: 52,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    width: 'auto',
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.accent,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Account Card
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  accountIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.inverse,
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.inverse,
  },

  // Contact Row
  contactRow: {
    marginTop: 16,
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },

  // Cards
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
  },
  emptyCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 4,
  },

  // Visit Card
  visitCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  visitUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  visitDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  purposeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  purposeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visitNotes: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: 4,
  },
  photosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  photosBtnText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },

  // Load More
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
