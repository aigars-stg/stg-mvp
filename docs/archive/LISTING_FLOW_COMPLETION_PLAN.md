# Listing Creation Flow - Completion Plan

**Analysis Date:** 2025-01-25
**Status:** In Progress - Step 2 & 3 Need Implementation

---

## Current State Analysis

### **`/sell` Route** (RECOMMENDED - Better UX)

| Step | Sub-Step | Status | Component | Quality |
|------|----------|--------|-----------|---------|
| **1: Game Selection** | Search | ✅ Complete | GameSearch.tsx | ⭐⭐⭐⭐⭐ |
| | Version | ✅ Complete | VersionSelector.tsx | ⭐⭐⭐⭐⭐ |
| | Condition | ✅ Complete | ConditionSelector.tsx | ⭐⭐⭐⭐⭐ |
| **2: Details & Photos** | - | ❌ PLACEHOLDER | - | - |
| **3: Review** | - | ❌ PLACEHOLDER | - | - |

**Strengths:**
- ✅ Excellent BGG integration with real-time search
- ✅ Version selector with publisher/language/year
- ✅ Comprehensive condition selector with templates
- ✅ Clean, modern UI
- ✅ Good mobile responsiveness
- ✅ Draft auto-save

**Missing:**
- ❌ Photo upload component
- ❌ Pricing & shipping form
- ❌ Review/preview screen
- ❌ Actual submission to backend

---

### **`/sell/new` Route** (More Complete, Older UX)

| Step | Status | Quality |
|------|--------|---------|
| **1: Game Selection** | ✅ Complete | ⭐⭐⭐⭐ |
| **2: Condition Details** | ✅ Complete | ⭐⭐⭐⭐⭐ |
| **3: Photos** | ✅ Complete | ⭐⭐⭐⭐ |
| **4: Pricing & Shipping** | ✅ Complete | ⭐⭐⭐⭐ |
| **5: Review & Publish** | ✅ Complete | ⭐⭐⭐⭐ |

**Strengths:**
- ✅ Fully functional photo upload with preview
- ✅ Main photo selection
- ✅ Comprehensive pricing & shipping options
- ✅ City selector for local pickup
- ✅ Review screen with all details
- ✅ Success modal after publish
- ✅ Component completeness checklist
- ✅ "Why selling" field

**Weaknesses:**
- ⚠️ No version selector (less precise than `/sell`)
- ⚠️ Slightly less polished UI
- ⚠️ More steps (5 vs 3) - feels longer

---

## Recommended Solution: Merge Best of Both

### **Strategy: Enhance `/sell` with Missing Features from `/sell/new`**

**Rationale:**
1. `/sell` has better UX foundation (cleaner UI, version selector)
2. `/sell/new` has the complete features we need
3. Merging gives us best of both worlds

---

## Implementation Plan

### **Phase 1: Create Missing Components for `/sell`**
**Estimated Time: 4-6 hours**

#### 1.1 Photo Upload Component
**File:** `packages/marketplace/components/sell/PhotoUpload.tsx`

**Features to Port from `/sell/new`:**
```typescript
interface PhotoUploadProps {
  photos: PhotoFile[];
  onPhotosChange: (photos: PhotoFile[]) => void;
  maxPhotos?: number; // default 8
}

interface PhotoFile {
  file: File;
  preview: string;
  isMain: boolean;
}
```

**UI Elements:**
- Drag & drop upload zone
- Multiple file selection
- Image preview grid (2x2 on mobile, 4x4 on desktop)
- Set main photo button
- Remove photo button
- Photo count indicator (e.g., "3/8 photos")
- File type & size validation (JPEG/PNG, max 5MB)
- Photo guidelines card

**Validation:**
- Minimum 3 photos required
- Maximum 8 photos
- Each file max 5MB
- Only JPEG/PNG formats

---

#### 1.2 Pricing & Shipping Component
**File:** `packages/marketplace/components/sell/PricingShipping.tsx`

**Features:**
```typescript
interface PricingShippingProps {
  price: string;
  shippingOptions: {
    standard: boolean;
    express: boolean;
    localPickup: boolean;
  };
  pickupCity: string;
  shippingNotes: string;
  whySelling: string;
  onChange: (field: string, value: any) => void;
}
```

**UI Sections:**

**A. Price Input**
- EUR currency input (number)
- Price suggestion based on condition (pulled from similar listings)
- Optional: "Accept offers" checkbox
- Optional: "Minimum offer" field

**B. Shipping Options** (Checkboxes)
- ☐ Standard shipping - €5 (2-4 business days)
- ☐ Express shipping - €12 (1-2 business days)
- ☐ Local pickup - Free (public location)

**C. Location (if local pickup checked)**
- City dropdown:
  - Riga, Vilnius, Tallinn, Tartu, Kaunas, Klaipėda, Pärnu
- Auto-show based on pickup selection

**D. Additional Fields**
- Shipping notes (optional textarea)
- Why selling (optional textarea)
  - Helps build trust
  - Examples: "Moving abroad", "Gaming preferences evolved"

**Validation:**
- Price > 0 required
- At least one shipping option required
- If local pickup selected, city required

---

#### 1.3 Review & Submit Component
**File:** `packages/marketplace/components/sell/ListingReview.tsx`

**Features:**
```typescript
interface ListingReviewProps {
  formData: ListingFormData;
  onEdit: (step: number) => void;
  onPublish: () => void;
}
```

**UI Sections:**

**A. Preview Card**
- Main photo (large)
- Game title, designer, year
- Condition badge
- Price display (+ shipping)

**B. Details Summary**
- Version info (publisher, language, year)
- Condition description (collapsible if long)
- Component completeness
- Extras included
- Shipping options
- Location

**C. Photo Gallery**
- Thumbnail grid of all photos
- Indicator showing main photo

**D. Terms & Publish**
- Checkbox: "I accurately described this game's condition..."
- Publish button (disabled until terms checked)
- Save as draft button

**E. Edit Buttons**
- "Edit" button for each section → jumps back to that step

---

#### 1.4 Success Modal Enhancement
**File:** Enhance existing Modal in `/sell/page.tsx`

**Features:**
- Large checkmark animation
- "Your game is now listed!" heading
- Game title + condition + price summary
- Action buttons:
  - "View My Listing" (navigate to detail page)
  - "List Another Game" (reset form)
  - "Share" (copy link / social share)

---

### **Phase 2: Update `/sell/page.tsx` Main Flow**
**Estimated Time: 2-3 hours**

#### 2.1 Extend Form Data Interface

```typescript
interface ListingFormData {
  // Step 1 (existing)
  selectedGame: BGGGame | null;
  selectedVersion: BGGVersion | null;
  condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | null;
  conditionNotes: string;
  allComponentsPresent: boolean;
  missingComponents: string;
  extras: {
    sleeved: boolean;
    promos: boolean;
    customInsert: boolean;
    other: string;
  };

  // Step 2 (NEW)
  photos: PhotoFile[];
  price: string;
  acceptOffers: boolean;
  minimumOffer: string;
  shippingOptions: {
    standard: boolean;
    express: boolean;
    localPickup: boolean;
  };
  pickupCity: string;
  shippingNotes: string;
  whySelling: string;

  // Step 3 (NEW)
  termsAccepted: boolean;
}
```

#### 2.2 Step 2: Integrate New Components

```tsx
{currentStep === 2 && (
  <div>
    <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">
      Photos & Pricing
    </h2>
    <p className="text-sm sm:text-base text-text-secondary mb-6">
      Add clear photos and set your price
    </p>

    <div className="space-y-8">
      {/* Photo Upload */}
      <PhotoUpload
        photos={formData.photos}
        onPhotosChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
      />

      {/* Pricing & Shipping */}
      <PricingShipping
        price={formData.price}
        shippingOptions={formData.shippingOptions}
        pickupCity={formData.pickupCity}
        shippingNotes={formData.shippingNotes}
        whySelling={formData.whySelling}
        onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
      />
    </div>
  </div>
)}
```

#### 2.3 Step 3: Review Screen

```tsx
{currentStep === 3 && (
  <ListingReview
    formData={formData}
    onEdit={(step) => setCurrentStep(step)}
    onPublish={handlePublish}
  />
)}
```

#### 2.4 Add Validation Logic

```typescript
const validateStep = (step: number): boolean => {
  switch (step) {
    case 1:
      if (subStep === 'search') return !!formData.selectedGame;
      if (subStep === 'version') return !!formData.selectedVersion;
      if (subStep === 'condition') return !!formData.condition;
      return false;

    case 2:
      // Photos (min 3)
      if (formData.photos.length < 3) {
        alert('Please upload at least 3 photos');
        return false;
      }
      // Price
      if (!formData.price || parseFloat(formData.price) <= 0) {
        alert('Please enter a valid price');
        return false;
      }
      // Shipping options
      const hasShipping = Object.values(formData.shippingOptions).some(v => v);
      if (!hasShipping) {
        alert('Please select at least one shipping option');
        return false;
      }
      // City if local pickup
      if (formData.shippingOptions.localPickup && !formData.pickupCity) {
        alert('Please select your city for local pickup');
        return false;
      }
      return true;

    case 3:
      return formData.termsAccepted;

    default:
      return false;
  }
};
```

#### 2.5 Backend Submission

```typescript
const handlePublish = async () => {
  try {
    // 1. Upload photos to storage (Supabase Storage or similar)
    const uploadedPhotoUrls = await uploadPhotos(formData.photos);

    // 2. Create listing object
    const listing = {
      // Game info
      bggId: formData.selectedGame?.id,
      bggVersionId: formData.selectedVersion?.id,
      title: formData.selectedGame?.name,
      publisher: formData.selectedVersion?.publisher,
      language: formData.selectedVersion?.language,
      languageCode: formData.selectedVersion?.language?.toLowerCase().slice(0, 2),
      yearPublished: formData.selectedVersion?.yearPublished,

      // Condition
      condition: formData.condition,
      conditionNotes: formData.conditionNotes,
      allComponentsPresent: formData.allComponentsPresent,
      missingComponents: formData.missingComponents,

      // Extras
      extras: formData.extras,

      // Photos
      imageUrl: uploadedPhotoUrls[0], // Main photo
      images: uploadedPhotoUrls,

      // Pricing
      price: parseFloat(formData.price),
      acceptOffers: formData.acceptOffers,
      minimumOffer: formData.minimumOffer ? parseFloat(formData.minimumOffer) : null,

      // Shipping
      shippingOptions: {
        standard: formData.shippingOptions.standard ? 5 : null,
        express: formData.shippingOptions.express ? 12 : null,
        localPickup: formData.shippingOptions.localPickup,
      },
      location: formData.pickupCity,
      shippingNotes: formData.shippingNotes,
      whySelling: formData.whySelling,

      // Meta
      seller_id: 'current-user-id', // From auth
      status: 'active',
      created_at: new Date().toISOString(),
    };

    // 3. Submit to backend
    const response = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listing),
    });

    if (!response.ok) throw new Error('Failed to create listing');

    const { listingId } = await response.json();

    // 4. Clear draft
    localStorage.removeItem('listing-draft');

    // 5. Show success modal
    setSuccessModalOpen(true);
    setCreatedListingId(listingId);

  } catch (error) {
    console.error('Error creating listing:', error);
    alert('Failed to create listing. Please try again.');
  }
};
```

---

### **Phase 3: Backend API Implementation**
**Estimated Time: 3-4 hours**

#### 3.1 Photo Upload API
**File:** `packages/marketplace/app/api/upload/route.ts`

```typescript
export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll('photos') as File[];

  // Upload to Supabase Storage
  const uploadedUrls = await Promise.all(
    files.map(file => uploadToStorage(file))
  );

  return NextResponse.json({ urls: uploadedUrls });
}
```

#### 3.2 Create Listing API
**File:** `packages/marketplace/app/api/listings/route.ts`

```typescript
export async function POST(request: Request) {
  const listing = await request.json();

  // Validate
  // Insert to Supabase
  const { data, error } = await supabase
    .from('listings')
    .insert(listing)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({ listingId: data.id });
}
```

---

### **Phase 4: Polish & Testing**
**Estimated Time: 2-3 hours**

#### 4.1 UX Improvements
- [ ] Add loading spinners for photo upload
- [ ] Add progress indicators during submission
- [ ] Add image compression before upload
- [ ] Add photo cropping/rotation tools
- [ ] Add preview mode (view as buyer would see it)

#### 4.2 Validation Enhancements
- [ ] Real-time price validation
- [ ] Photo format/size validation with user feedback
- [ ] Form field highlighting for errors
- [ ] Inline validation messages

#### 4.3 Mobile Experience
- [ ] Test photo upload on mobile
- [ ] Optimize image preview grid for mobile
- [ ] Touch-friendly photo management (drag to reorder)
- [ ] Mobile camera integration

#### 4.4 Error Handling
- [ ] Network error recovery
- [ ] Photo upload failure handling
- [ ] Submission timeout handling
- [ ] Draft recovery on crash

---

## Component Architecture Diagram

```
/sell (page.tsx)
├── Step 1: Game Selection
│   ├── GameSearch.tsx ✅
│   ├── VersionSelector.tsx ✅
│   └── ConditionSelector.tsx ✅
│
├── Step 2: Photos & Pricing
│   ├── PhotoUpload.tsx ❌ (TO CREATE)
│   │   ├── Upload zone
│   │   ├── Preview grid
│   │   └── Photo management
│   └── PricingShipping.tsx ❌ (TO CREATE)
│       ├── Price input
│       ├── Shipping options
│       ├── Location selector
│       └── Additional fields
│
└── Step 3: Review & Submit
    ├── ListingReview.tsx ❌ (TO CREATE)
    │   ├── Preview card
    │   ├── Details summary
    │   ├── Photo gallery
    │   └── Terms & publish
    └── SuccessModal ✅ (enhance existing)
```

---

## File Checklist

### **To Create:**
```
✅ packages/marketplace/components/sell/PhotoUpload.tsx
✅ packages/marketplace/components/sell/PricingShipping.tsx
✅ packages/marketplace/components/sell/ListingReview.tsx
✅ packages/marketplace/app/api/upload/route.ts
✅ packages/marketplace/app/api/listings/route.ts
✅ packages/marketplace/lib/uploadHelpers.ts (photo upload utilities)
```

### **To Update:**
```
✅ packages/marketplace/app/sell/page.tsx (add Step 2 & 3)
✅ packages/marketplace/lib/bgg-api.ts (if needed for additional helpers)
```

### **To Delete (After Migration):**
```
❌ packages/marketplace/app/sell/new/page.tsx
❌ packages/marketplace/lib/bgg-games.ts (if only used by /sell/new)
```

---

## Testing Checklist

### **Functional Testing:**
- [ ] Can search and select game
- [ ] Can select version
- [ ] Can select condition and fill description
- [ ] Can upload 3-8 photos
- [ ] Can set main photo
- [ ] Can remove photos
- [ ] Can enter price
- [ ] Can select shipping options
- [ ] Can save draft at any step
- [ ] Can resume from draft
- [ ] Can navigate back/forward between steps
- [ ] Can successfully publish listing
- [ ] Draft clears after publish
- [ ] Success modal appears with correct data

### **Validation Testing:**
- [ ] Cannot continue without selecting game
- [ ] Cannot continue without selecting version
- [ ] Cannot continue without selecting condition
- [ ] Cannot continue with <3 photos
- [ ] Cannot continue without price
- [ ] Cannot continue without shipping option
- [ ] Cannot continue without city (if local pickup)
- [ ] Cannot publish without accepting terms

### **Edge Cases:**
- [ ] Network failure during upload
- [ ] Large photo file (>5MB) rejection
- [ ] Invalid photo format rejection
- [ ] Duplicate photo prevention
- [ ] Form state preservation on page refresh
- [ ] Browser back button handling

---

## Timeline & Milestones

**Total Estimated Time: 11-16 hours**

### **Week 1:**
- [ ] Day 1-2: Create PhotoUpload component (4 hours)
- [ ] Day 3: Create PricingShipping component (2 hours)
- [ ] Day 4: Create ListingReview component (2 hours)

### **Week 2:**
- [ ] Day 1: Integrate components into /sell page (2 hours)
- [ ] Day 2: Backend API routes (3 hours)
- [ ] Day 3: Testing & bug fixes (3 hours)
- [ ] Day 4: Polish & mobile optimization (2 hours)

---

## Success Criteria

✅ **MVP Complete When:**
1. User can create listing end-to-end
2. Photos upload successfully
3. Listing appears in browse page
4. Draft auto-save works
5. Mobile experience is smooth
6. All validations work
7. Success flow feels rewarding

✅ **Nice to Have (Post-MVP):**
- Photo editing (crop, rotate, filters)
- Price suggestions based on market data
- Shipping cost calculator
- Listing preview before publish
- Social sharing after publish
- Email confirmation

---

## Next Steps

**Would you like me to:**

1. **Start building the components?**
   - I can create PhotoUpload.tsx first
   - Then PricingShipping.tsx
   - Then ListingReview.tsx

2. **Provide detailed code for all 3 components?**
   - Complete implementation
   - Ready to copy-paste

3. **Focus on a specific part?**
   - Just photo upload?
   - Just pricing?
   - Just review?

4. **Create the backend APIs first?**
   - Photo upload endpoint
   - Listing creation endpoint

**Let me know which approach you prefer and I'll get started!** 🚀
