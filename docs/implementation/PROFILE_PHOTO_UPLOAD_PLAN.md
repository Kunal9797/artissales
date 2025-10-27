# Profile Photo Upload - Implementation Plan

**Last Updated:** October 27, 2025
**Status:** Backend Complete ✅ | Frontend UI Pending
**Design Direction:** Executive Dashboard (Direction 1) - Simplified

---

## Context & Current State

### ✅ What's Already Complete (Backend Infrastructure)

**Backend API:**
- ✅ `updateProfile` API extended to accept `profilePhotoUrl` parameter
- ✅ Validation: Must be valid Firebase Storage URL
- ✅ Deployed at: https://updateprofile-rzybjg6apq-uc.a.run.app
- ✅ User type updated with `profilePhotoUrl?: string` field

**Frontend Infrastructure:**
- ✅ `expo-image-picker` installed
- ✅ Storage service functions ready:
  - `uploadProfilePhoto(photoUri)` - Uploads to `profilePhotos/{userId}/profile.jpg`
  - `deleteProfilePhoto()` - Deletes profile photo
  - Compression: 512x512px, 70% quality
- ✅ Photo selection utilities created (`mobile/src/utils/photoUtils.ts`):
  - `selectPhotoFromCamera()` - Camera with permissions
  - `selectPhotoFromGallery()` - Gallery with permissions
  - `selectPhoto()` - Modal with options

**Files Modified:**
1. `functions/src/api/profile.ts` - Added profilePhotoUrl support
2. `functions/src/types/index.ts` - Added profilePhotoUrl to User interface
3. `mobile/src/services/storage.ts` - Added profile photo functions
4. `mobile/src/utils/photoUtils.ts` - NEW FILE with photo utilities
5. `mobile/package.json` - Added expo-image-picker dependency

### ❌ What's NOT Done Yet

**NO UI CHANGES YET!**
- ProfileScreen has not been modified
- No profile photo upload button exists
- Pressing "R" to reload won't show any changes

---

## Design Specification

### User's Chosen Design: Direction 1 (Executive Dashboard) - Simplified

**What to Include:**
- ✅ Large profile card with photo (120x120, left-aligned)
- ✅ Name and role displayed next to photo
- ✅ "Change Photo" button
- ✅ Personal Information card (existing - keep as-is)
- ✅ Account Details card (existing - keep as-is)
- ✅ Professional/corporate feel

**What to Skip:**
- ❌ No stats in profile card (target, visits, etc.)
- ❌ No performance metrics card
- ❌ No settings card
- ❌ No extra features beyond photo upload

### Visual Design

**Current State:**
```
┌─────────────────────────────────────┐
│  ┌────────┐  John Smith            │
│  │ [Icon] │  Sales Representative  │
│  │ 80x80  │                        │
│  └────────┘                         │
└─────────────────────────────────────┘
```

**New Design:**
```
┌─────────────────────────────────────┐
│  ┌────────────┐  John Smith         │
│  │            │  Sales Rep          │
│  │   PHOTO    │                     │
│  │  or ICON   │  [📷 Change Photo]  │
│  │  120x120   │                     │
│  └────────────┘                     │
│     (Gold border if photo exists)   │
└─────────────────────────────────────┘

[Rest of ProfileScreen stays the same]
```

**Design Details:**
- Avatar size: 120x120 (increased from 80x80)
- Gold border (#C9A961) when photo exists (3px)
- Default gray border when no photo (3px)
- "Change Photo" button: Gold text, light gold background
- Photo displayed with Image component, fallback to UserIcon
- Loading overlay while uploading

---

## Implementation Plan

### 1. Add State Management
**File:** `mobile/src/screens/profile/ProfileScreen.tsx`

**Add to existing state (around line 36):**
```typescript
const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
const [uploadingPhoto, setUploadingPhoto] = useState(false);
```

**Update useEffect (around line 56):**
```typescript
setProfilePhotoUrl(data?.profilePhotoUrl || null);
```

### 2. Add Photo Handlers
**File:** `mobile/src/screens/profile/ProfileScreen.tsx`

**Add after handleSave function (around line 123):**
```typescript
const handleChangePhoto = async () => {
  const photoUri = await selectPhoto({
    title: 'Profile Photo',
    includeRemove: !!profilePhotoUrl,
    onRemove: handleRemovePhoto,
  });

  if (!photoUri) return;

  try {
    setUploadingPhoto(true);
    const downloadUrl = await uploadProfilePhoto(photoUri);
    await api.updateProfile({ profilePhotoUrl: downloadUrl });
    setProfilePhotoUrl(downloadUrl);
    Alert.alert('Success', 'Profile photo updated!');
  } catch (error: any) {
    logger.error('Profile photo upload error:', error);
    Alert.alert('Error', 'Failed to upload photo. Please try again.');
  } finally {
    setUploadingPhoto(false);
  }
};

const handleRemovePhoto = async () => {
  Alert.alert(
    'Remove Photo',
    'Are you sure you want to remove your profile photo?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setUploadingPhoto(true);
            await deleteProfilePhoto();
            await api.updateProfile({ profilePhotoUrl: '' });
            setProfilePhotoUrl(null);
            Alert.alert('Success', 'Profile photo removed');
          } catch (error: any) {
            logger.error('Profile photo removal error:', error);
            Alert.alert('Error', 'Failed to remove photo');
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
    ]
  );
};
```

### 3. Update Profile Card UI
**File:** `mobile/src/screens/profile/ProfileScreen.tsx`

**Replace lines 231-241 with:**
```typescript
<Card elevation="md" style={styles.profileCard}>
  <View style={styles.avatarSection}>
    <TouchableOpacity
      style={[
        styles.avatar,
        profilePhotoUrl && styles.avatarWithPhoto
      ]}
      onPress={handleChangePhoto}
      disabled={uploadingPhoto}
    >
      {profilePhotoUrl ? (
        <Image
          source={{ uri: profilePhotoUrl }}
          style={styles.avatarImage}
        />
      ) : (
        <UserIcon size={56} color={colors.primary} />
      )}
      {uploadingPhoto && (
        <View style={styles.avatarLoading}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </TouchableOpacity>

    <View style={styles.profileInfo}>
      <Text style={styles.profileName}>{name || 'User'}</Text>
      <Badge variant="neutral">{getRoleDisplay(role)}</Badge>

      <TouchableOpacity
        style={styles.changePhotoButton}
        onPress={handleChangePhoto}
        disabled={uploadingPhoto}
      >
        <Camera size={14} color="#C9A961" />
        <Text style={styles.changePhotoText}>
          {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Card>
```

### 4. Update Imports
**File:** `mobile/src/screens/profile/ProfileScreen.tsx` (top of file)

**Add to existing imports (around line 18):**
```typescript
import { uploadProfilePhoto, deleteProfilePhoto } from '../../services/storage';
import { selectPhoto } from '../../utils/photoUtils';
import { Camera } from 'lucide-react-native';
```

### 5. Update Styles
**File:** `mobile/src/screens/profile/ProfileScreen.tsx` (styles section)

**Update avatar style (around line 387):**
```typescript
avatar: {
  width: 120,           // Changed from 80
  height: 120,          // Changed from 80
  borderRadius: 60,     // Changed from 40
  backgroundColor: colors.surface,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 3,       // Changed from 2
  borderColor: colors.border.default,
  overflow: 'hidden',   // NEW
},
```

**Add new styles after avatar style:**
```typescript
avatarWithPhoto: {
  borderColor: '#C9A961',
  borderWidth: 3,
},
avatarImage: {
  width: '100%',
  height: '100%',
  borderRadius: 60,
},
avatarLoading: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 60,
},
changePhotoButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginTop: 8,
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 6,
  backgroundColor: 'rgba(201, 169, 97, 0.1)',
  alignSelf: 'flex-start',
},
changePhotoText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#C9A961',
},
```

---

## User Flow

### Upload Photo:
1. User taps avatar OR "Change Photo" button
2. Alert shows options:
   - 📷 Take Photo
   - 🖼️ Choose from Gallery
   - 🗑️ Remove Photo (if photo exists)
   - ❌ Cancel
3. User selects option → Camera/Gallery opens
4. User takes/selects photo with 1:1 crop
5. Photo compresses (512x512, 70% quality)
6. Uploads to `profilePhotos/{userId}/profile.jpg`
7. Updates Firestore via API
8. UI updates immediately
9. Success message shown

### Remove Photo:
1. User selects "Remove Photo" from options
2. Confirmation alert shown
3. If confirmed:
   - Deletes from Storage
   - Updates Firestore (null)
   - Shows default icon
   - Success message

---

## Files to Modify

**Only one file needs changes:**
1. `mobile/src/screens/profile/ProfileScreen.tsx`
   - Add state (2 lines)
   - Add handlers (2 functions)
   - Update profile card UI (1 section)
   - Add imports (3 lines)
   - Update styles (1 change + 5 new styles)

---

## Testing Checklist

- [ ] Upload photo from camera
- [ ] Upload photo from gallery
- [ ] Photo displays correctly (circular, 120x120)
- [ ] Gold border shows when photo exists
- [ ] Remove photo works
- [ ] Default icon shows after removal
- [ ] Photo persists after app reload
- [ ] Loading state shows during upload
- [ ] Permissions handled gracefully
- [ ] Error messages are user-friendly
- [ ] Works on slow network

---

## Key Design Decisions

**Why 120x120?**
- Large enough to see clearly
- Not too large (keeps card compact)
- Common profile photo size

**Why gold border?**
- Matches Artis brand color (#C9A961)
- Indicates "premium" uploaded photo
- Differentiates from default gray border

**Why "Change Photo" button?**
- Some users may not realize avatar is tappable
- Explicit call-to-action
- Accessible for all users

**Why compress to 512x512?**
- Smaller than visit photos (1024x1024)
- Profile photos don't need high resolution
- Faster upload/download
- Less storage cost

---

## Estimated Effort

- UI updates: 1 hour
- Testing: 30 minutes
- **Total: 1.5 hours**

---

## Next Steps After Implementation

1. Test thoroughly with different devices
2. Consider adding to other screens (nav bar, header)
3. Consider showing profile photos in team lists (manager view)
4. Add image editing (crop, rotate) if needed

---

## Notes

- Backend is FULLY READY - just needs UI
- All utilities are tested and working
- Design is approved by user (simplified Direction 1)
- Keep it simple - no extra features for now