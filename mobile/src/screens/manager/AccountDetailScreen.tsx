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
  Phone,
  MapPin,
  Edit2,
  Calendar,
  User,
  Camera,
  ChevronDown,
  Gift,
} from 'lucide-react-native';
import { WhatsAppIcon } from '../../components/icons/WhatsAppIcon';
import { api } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Skeleton } from '../../patterns';
import { colors, spacing, featureColors } from '../../theme';
import { PhotoViewer } from '../../components/PhotoViewer';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { formatPhoneForDisplay } from '../../utils/formatTime';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountDetail'>;

interface AccountData {
  id: string;
  name: string;
  type: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  address?: string;
  city: string;
  state: string;
  pincode?: string;
  birthdate?: string;           // YYYY-MM-DD format
  parentDistributorId?: string;
  territory?: string;
  assignedRepUserId?: string;
  status?: string;              // 'active' | 'inactive'
  lastVisitAt?: string;         // ISO timestamp
  createdAt?: string;           // ISO timestamp
  createdByUserId?: string;
  extra?: {
    catalogs?: string[];        // Catalogs this distributor services
  };
}

// Catalog colors (matching SheetsEntryScreen)
const CATALOG_COLORS: Record<string, { bg: string; text: string }> = {
  'Fine Decor': { bg: '#F3E5F5', text: '#9C27B0' },
  'Artvio': { bg: '#E3F2FD', text: '#1976D2' },
  'Woodrica': { bg: '#E8F5E9', text: '#388E3C' },
  'Artis 1MM': { bg: '#FFF3E0', text: '#E65100' },
  'Artis': { bg: '#FFF3E0', text: '#E65100' },
};

const getCatalogColor = (catalog: string) => {
  return CATALOG_COLORS[catalog] || { bg: '#F5F5F5', text: '#666666' };
};

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

// Get type abbreviation for badge (matching SelectAccountScreen)
const getTypeAbbr = (type: string) => {
  const t = type.toLowerCase();
  if (t === 'distributor') return 'D';
  if (t === 'dealer') return 'DL';
  if (t === 'architect') return 'A';
  if (t === 'oem') return 'O';
  return t.charAt(0).toUpperCase();
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

// Calculate days until birthday (handles year wrap)
const getDaysUntilBirthday = (birthdate: string | undefined): number | null => {
  if (!birthdate) return null;
  try {
    const [, month, day] = birthdate.split('-').map(Number);
    if (!month || !day) return null;
    const today = new Date();
    const thisYear = today.getFullYear();
    let birthday = new Date(thisYear, month - 1, day);
    // Reset time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    birthday.setHours(0, 0, 0, 0);
    if (birthday < today) {
      birthday = new Date(thisYear + 1, month - 1, day);
    }
    const diff = birthday.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
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

  // Handle WhatsApp
  const handleWhatsApp = useCallback(() => {
    const phone = account?.phone?.trim();
    if (!phone) return;
    // WhatsApp expects number without + prefix
    const cleaned = phone.replace(/[^\d]/g, '');
    const url = `whatsapp://send?phone=${cleaned}`;
    Linking.openURL(url).catch(err => logger.error('Failed to open WhatsApp:', err));
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

  // Compute birthday info
  const daysUntilBirthday = getDaysUntilBirthday(account.birthdate);
  const showBirthday = daysUntilBirthday !== null && daysUntilBirthday <= 30;

  return (
    <View style={styles.container}>
      {/* Header - Compact design */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.inverse} />
          </TouchableOpacity>

          {/* Quick Actions */}
          <View style={styles.headerActions}>
            {account.phone?.trim() && (
              <>
                <TouchableOpacity style={styles.headerActionBtn} onPress={handleCall}>
                  <Phone size={20} color={colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} onPress={handleWhatsApp}>
                  <WhatsAppIcon size={20} />
                </TouchableOpacity>
              </>
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
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Identity - Compact with type badge */}
        <View style={styles.accountRow}>
          <View style={[styles.typeIndicator, { backgroundColor: typeColor.primary }]}>
            <Text style={styles.typeIndicatorText}>{getTypeAbbr(account.type)}</Text>
          </View>
          <View style={styles.accountDetails}>
            <Text style={styles.accountName} numberOfLines={2}>{account.name}</Text>
            {account.contactPerson?.trim() && (
              <Text style={styles.contactPersonText}>{account.contactPerson}</Text>
            )}
            {account.status && account.status !== 'active' && (
              <Text style={styles.inactiveText}>Inactive</Text>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + bottomPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Info */}
        <View style={styles.infoCard}>
          {/* Phone */}
          <View style={styles.infoRow}>
            <Phone size={18} color={colors.primary} />
            <Text style={styles.infoValue}>{formatPhoneForDisplay(account.phone)}</Text>
          </View>
          {/* Location */}
          <View style={styles.infoRow}>
            <MapPin size={18} color={colors.primary} />
            <Text style={styles.infoValue}>
              {[
                account.address?.trim(),
                account.city,
                account.state,
                account.pincode,
              ].filter(Boolean).join(', ')}
            </Text>
          </View>
          {/* Catalogs - for distributors */}
          {account.extra?.catalogs && account.extra.catalogs.length > 0 && (
            <View style={styles.catalogsRow}>
              {account.extra.catalogs.map((catalog) => {
                const catalogColor = getCatalogColor(catalog);
                // Normalize "Artis" to "Artis 1MM" for display
                const displayName = catalog === 'Artis' ? 'Artis 1MM' : catalog;
                return (
                  <View
                    key={catalog}
                    style={[styles.catalogBadge, { backgroundColor: catalogColor.bg }]}
                  >
                    <Text style={[styles.catalogBadgeText, { color: catalogColor.text }]}>
                      {displayName}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Birthday Alert - only when relevant */}
        {showBirthday && (
          <View style={styles.birthdayBanner}>
            <Gift size={18} color="#E65100" />
            <Text style={styles.birthdayBannerText}>
              {daysUntilBirthday === 0 ? 'Birthday Today!' : `Birthday in ${daysUntilBirthday} days`}
            </Text>
          </View>
        )}

        {/* Visit History Section - Main Focus */}
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
            /* Visit Cards - Compact */
            <>
              {visits.map((visit) => {
                const purposeColor = getPurposeColor(visit.purpose);
                return (
                  <View key={visit.id} style={styles.visitCard}>
                    {/* Top Row: User + Date + Purpose */}
                    <View style={styles.visitTopRow}>
                      <View style={styles.visitUserInfo}>
                        <View style={styles.visitUserAvatar}>
                          <User size={12} color="#888" />
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

                    {/* Bottom Row: Purpose + Photos */}
                    <View style={styles.visitBottomRow}>
                      <View style={[styles.purposeBadge, { backgroundColor: purposeColor.bg }]}>
                        <Text style={[styles.purposeText, { color: purposeColor.text }]}>
                          {formatPurpose(visit.purpose)}
                        </Text>
                      </View>
                      {visit.photoCount !== undefined && visit.photoCount > 0 && (
                        <TouchableOpacity
                          style={styles.photosBtn}
                          onPress={() => handlePhotoTap(visit.id, visit.photoCount!)}
                          disabled={loadingPhotos === visit.id}
                        >
                          {loadingPhotos === visit.id ? (
                            <ActivityIndicator size="small" color="#666" />
                          ) : (
                            <Camera size={14} color="#666" />
                          )}
                          <Text style={styles.photosBtnText}>
                            {loadingPhotos === visit.id ? '...' : `${visit.photoCount} Photo`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Notes - only if present */}
                    {visit.notes && (
                      <Text style={styles.visitNotes} numberOfLines={2}>{visit.notes}</Text>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    backgroundColor: colors.accent,
  },

  // Account Row - Compact header layout
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIndicator: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIndicatorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.inverse,
    lineHeight: 22,
  },
  contactPersonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  inactiveText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    lineHeight: 22,
  },
  catalogsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  catalogBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  catalogBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  birthdayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  birthdayBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
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

  // Visit Card - Compact
  visitCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  visitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitUserAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  visitDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  visitBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purposeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  purposeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visitNotes: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
    marginTop: 8,
  },
  photosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  photosBtnText: {
    fontSize: 12,
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
