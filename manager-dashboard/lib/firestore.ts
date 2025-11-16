/**
 * Firestore Helper Functions
 *
 * This file provides helper functions for Firestore queries
 */

import { doc, getDoc, DocumentSnapshot } from 'firebase/firestore';
import { getDb } from './firebase';
import type { User, UserRole } from '@/types';

/**
 * Get user document from Firestore by UID
 *
 * @param userId - User's Firebase Auth UID
 * @returns User data or null if not found
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const db = getDb();
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: userDoc.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
        reportsToUserId: data.reportsToUserId,
        territory: data.territory,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as User;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

/**
 * Check if a user has manager-level access
 *
 * @param role - User's role
 * @returns True if user is a manager (area_manager, zonal_head, national_head, admin)
 */
export function isManagerRole(role: UserRole): boolean {
  const managerRoles: UserRole[] = ['area_manager', 'zonal_head', 'national_head', 'admin'];
  return managerRoles.includes(role);
}

/**
 * Check if a user is allowed to access the manager dashboard
 *
 * @param userId - User's Firebase Auth UID
 * @returns True if user has manager access, throws error otherwise
 */
export async function checkManagerAccess(userId: string): Promise<boolean> {
  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found in database');
  }

  if (!user.isActive) {
    throw new Error('Your account has been deactivated. Contact support.');
  }

  if (!isManagerRole(user.role)) {
    throw new Error('Access denied. This dashboard is for managers only.');
  }

  return true;
}
