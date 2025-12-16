# PRD: Buyer Checkout Flow with Unisend Shipping

**Version:** 1.0
**Date:** November 2024
**Status:** Ready for Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Flow](#2-user-flow)
3. [Technical Architecture](#3-technical-architecture)
4. [Unisend API Integration](#4-unisend-api-integration)
5. [Database Schema](#5-database-schema)
6. [UI/UX Requirements](#6-uiux-requirements)
7. [Business Logic](#7-business-logic)
8. [Error Handling](#8-error-handling)
9. [Notification System](#9-notification-system)
10. [Security Considerations](#10-security-considerations)
11. [Testing Requirements](#11-testing-requirements)
12. [Code Examples](#12-code-examples)

---

## 1. Executive Summary

### 1.1 Overview

This document describes the buyer checkout flow for a board game marketplace, integrating Unisend's Terminal-to-Terminal (T2T) shipping service for the Baltic states (Lithuania, Latvia, Estonia).

### 1.2 Goals

- Enable buyers to purchase games from multiple sellers in a single checkout session
- Provide seamless terminal selection for parcel pickup
- Implement 30-minute reservation system to prevent double-selling
- Support seller acceptance workflow with 72-hour response window
- Generate shipping labels only after seller confirmation

### 1.3 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Label creation timing | After seller accepts | Avoids cleanup if seller declines |
| Parcel size selection | Seller chooses when accepting | Seller knows actual package size |
| Max games per basket | 10 | Fits largest locker (35x61x74cm) |
| Phone validation | Per destination country | Unisend requires country-specific formats |
| Reservation timer | 30 minutes per game | Independent timers for flexibility |

---

## 2. User Flow

### 2.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BUYER CHECKOUT FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐                                               │
│  │ 1. ADD TO CART   │                                               │
│  │                  │                                               │
│  │ • Select game    │                                               │
│  │ • Add to basket  │──► Game marked "RESERVED"                     │
│  │ • 30min timer    │──► Timer starts (per game)                    │
│  │   starts         │                                               │
│  │                  │                                               │
│  │ Games grouped by │                                               │
│  │ seller (max 10   │                                               │
│  │ per basket)      │                                               │
│  └────────┬─────────┘                                               │
│           │                                                         │
│           ▼                                                         │
│  ┌──────────────────┐                                               │
│  │ 2. SHIPPING      │                                               │
│  │                  │                                               │
│  │ • Select country │──► LT / LV / EE                               │
│  │   (LT/LV/EE)     │                                               │
│  │ • Search terminal│──► Unisend API: GET /terminals                │
│  │ • Select terminal│                                               │
│  │                  │                                               │
│  │ Single terminal  │                                               │
│  │ for ALL baskets  │                                               │
│  └────────┬─────────┘                                               │
│           │                                                         │
│           ▼                                                         │
│  ┌──────────────────┐                                               │
│  │ 3. REVIEW        │                                               │
│  │                  │                                               │
│  │ • Terminal info  │                                               │
│  │ • Phone number   │──► Validated per country                      │
│  │ • Email address  │                                               │
│  │ • Order summary  │                                               │
│  └────────┬─────────┘                                               │
│           │                                                         │
│           ▼                                                         │
│  ┌──────────────────┐                                               │
│  │ 4. PAYMENT       │                                               │
│  │                  │                                               │
│  │ Per basket:      │                                               │
│  │ • Game price(s)  │                                               │
│  │ • Service fee    │                                               │
│  │ • Shipping cost  │                                               │
│  │                  │                                               │
│  │ Stripe Connect   │──► Separate payment per seller                │
│  └────────┬─────────┘                                               │
│           │                                                         │
│           ▼                                                         │
│  ┌──────────────────┐                                               │
│  │ 5. POST-PAYMENT  │                                               │
│  │                  │                                               │
│  │ • Order created  │──► Status: PENDING_SELLER                     │
│  │ • Seller notified│──► Email + dashboard notification             │
│  │ • 72h countdown  │                                               │
│  │   starts         │                                               │
│  └────────┬─────────┘                                               │
│           │                                                         │
│           ▼                                                         │
│  ┌──────────────────────────────────────────────────────┐           │
│  │ 6. SELLER RESPONSE (within 72h)                      │           │
│  │                                                      │           │
│  │  ┌─────────────┐              ┌─────────────┐        │           │
│  │  │   ACCEPTS   │              │  DECLINES/  │        │           │
│  │  │             │              │  TIMEOUT    │        │           │
│  │  │ • Selects   │              │             │        │           │
│  │  │   parcel    │              │ • Order     │        │           │
│  │  │   size      │              │   cancelled │        │           │
│  │  │   (XS/S/M/L)│              │ • Buyer     │        │           │
│  │  │             │              │   refunded  │        │           │
│  │  │ • Label     │              │ • No label  │        │           │
│  │  │   created   │              │   created   │        │           │
│  │  │   via       │              │             │        │           │
│  │  │   Unisend   │              │             │        │           │
│  │  │             │              │             │        │           │
│  │  │ • Buyer     │              │             │        │           │
│  │  │   notified  │              │             │        │           │
│  │  │   with      │              │             │        │           │
│  │  │   tracking  │              │             │        │           │
│  │  └──────┬──────┘              └─────────────┘        │           │
│  └─────────┼────────────────────────────────────────────┘           │
│            │                                                        │
│            ▼                                                        │
│  ┌──────────────────┐                                               │
│  │ 7. SHIPPING      │                                               │
│  │                  │                                               │
│  │ • Seller drops   │──► At sender terminal                         │
│  │   package        │                                               │
│  │ • Transit        │──► Tracking updates via Unisend               │
│  │ • Buyer picks up │──► At destination terminal                    │
│  └──────────────────┘                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 State Transitions

```
Game States:
AVAILABLE → RESERVED (buyer adds to cart)
RESERVED → AVAILABLE (30min timeout OR buyer removes)
RESERVED → SOLD (payment completed)

Order States:
PENDING_PAYMENT → PENDING_SELLER (payment success)
PENDING_SELLER → ACCEPTED (seller accepts within 72h)
PENDING_SELLER → CANCELLED (seller declines or 72h timeout)
ACCEPTED → SHIPPED (seller drops at terminal)
SHIPPED → IN_TRANSIT (parcel in transit)
IN_TRANSIT → DELIVERED (buyer picks up)
```

---

## 3. Technical Architecture

### 3.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Checkout  │  │  Terminal   │  │  Order      │              │
│  │   Flow      │  │  Selector   │  │  Status     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  /api/cart  │  │/api/shipping│  │ /api/orders │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICES LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Cart       │  │  Unisend    │  │  Order      │              │
│  │  Service    │  │  Client     │  │  Service    │              │
│  └─────────────┘  └──────┬──────┘  └─────────────┘              │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Unisend    │  │  Stripe     │  │  Email      │              │
│  │  API        │  │  Connect    │  │  Service    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
1. Terminal Selection:
   Frontend → Backend → Unisend API (GET /terminals)
                     ← Terminal list cached (1 hour TTL)

2. Order Creation (after payment):
   Frontend → Backend → Database (create order, update game status)
                     → Notification Service (notify seller)

3. Seller Accepts:
   Seller Dashboard → Backend → Unisend API (POST /parcel)
                             → Unisend API (POST /shipping/initiate)
                             → Unisend API (GET /shipping/barcode)
                             → Database (update order with barcode)
                             → Notification Service (notify buyer)

4. Tracking Updates:
   Cron Job/Webhook → Unisend API (GET /tracking/events)
                   → Database (update tracking)
                   → Notification Service (notify buyer)
```

---

## 4. Unisend API Integration

### 4.1 Authentication

```typescript
// Unisend uses OAuth2 authentication
// Store credentials securely in environment variables

// Environment variables needed:
UNISEND_API_URL=https://api-manosiuntostst.post.lt  // Test
UNISEND_API_URL=https://api-manosiuntos.post.lt     // Production
UNISEND_USERNAME=your_username
UNISEND_PASSWORD=your_password

// Authentication endpoint
POST /api/v2/auth
Content-Type: application/x-www-form-urlencoded

grant_type=password&username={username}&password={password}

// Response
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}

// Token management:
// - Cache token until expires_in - 60 seconds
// - Use refresh_token to get new access_token
// - All subsequent requests use: Authorization: Bearer {access_token}
```

### 4.2 API Endpoints Used

#### 4.2.1 Get Terminals

```typescript
// Fetch available pickup terminals
GET /api/v2/terminals?countryCode={LT|LV|EE}&find={searchQuery}

// Response
[
  {
    "id": "0001",
    "name": "Vilnius Akropolis",
    "countryCode": "LT",
    "city": "Vilnius",
    "address": "Ozo g. 25",
    "postalCode": "LT-07150",
    "boxes": ["XS", "S", "M", "L"],
    "latitude": "54.7066",
    "longitude": "25.2622",
    "servicingHours": "08:00-22:00",
    "comment": "Located near main entrance"
  }
]

// Implementation notes:
// - Cache terminal list for 1 hour (terminals rarely change)
// - Filter client-side for search functionality
// - Display boxes array to show available sizes
```

#### 4.2.2 Create Parcel

```typescript
// Create a parcel (called when seller accepts)
POST /api/v2/parcel
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "plan": {
    "code": "TERMINAL"  // T2T shipping
  },
  "parcel": {
    "type": "T2T",
    "size": "M"  // XS, S, M, L - chosen by seller
  },
  "services": [],  // Optional additional services
  "receiver": {
    "name": "Buyer Name",
    "address": {
      "countryCode": "LT",
      "terminalId": "0001"  // Destination terminal
    },
    "contacts": {
      "phone": "+37060012345",  // Country-specific format required
      "email": "buyer@example.com"
    }
  }
  // Note: Sender info comes from your Unisend account settings
}

// Success Response
{
  "parcelId": 4598836,
  "warnings": []
}

// Error Response (400)
[
  {
    "error": "INCORRECT RECEIVER",
    "field": "receiver.contacts.phone",
    "error_description": "Incorrectly specified recipient's mobile phone No. Expected format +3706 XXXXXXX."
  }
]
```

#### 4.2.3 Initiate Shipping

```typescript
// Finalize the shipment and generate label
POST /api/v2/shipping/initiate?processAsync=false
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "parcelIds": [4598836]
}

// Response
{
  "requestId": "f666e1af-f72e-3efd-8d59-b3ef513da993",
  "status": "SUCCESSFUL"  // or "IN_PROGRESS", "PARTIALLY_SUCCESSFUL", "ERROR"
}
```

#### 4.2.4 Get Barcode/Tracking Info

```typescript
// Get barcode and tracking URL
GET /api/v2/shipping/barcode?parcelIds=4598836
Authorization: Bearer {access_token}

// Response
[
  {
    "parcelId": "4598836",
    "barcode": "CC800129904LT",
    "trackingUrl": "https://manosiuntos.post.lt/tracking/CC800129904LT"
  }
]
```

#### 4.2.5 Generate Label PDF

```typescript
// Download shipping label PDF
GET /api/v2/label?layout=LAYOUT_10x15&labelOrientation=LANDSCAPE&parcelIds=4598836
Authorization: Bearer {access_token}

// Response: application/pdf binary data

// Layout options:
// - LAYOUT_10x15 (thermal printer)
// - LAYOUT_A4 (standard printer)
// - LAYOUT_MAX

// Orientation options:
// - LANDSCAPE
// - PORTRAIT
```

#### 4.2.6 Get Tracking Events

```typescript
// Get tracking history for a parcel
GET /api/v2/tracking/{barcode}/events
Authorization: Bearer {access_token}
Accept-Language: en  // or 'lt'

// Response
[
  {
    "eventType": "LABEL_CREATED",
    "stateType": "LABEL_CREATED",
    "stateText": "Shipment created",
    "timestamp": "2024-01-15T10:30:00Z",
    "description": "Label has been generated"
  },
  {
    "eventType": "ACCEPTED_TERMINAL",
    "stateType": "PARCEL_RECEIVED",
    "stateText": "Parcel received",
    "timestamp": "2024-01-16T14:20:00Z",
    "location": "Vilnius Akropolis Terminal",
    "description": "Package dropped off at sender terminal"
  }
]

// State types for UI display:
// - LABEL_CREATED (blue) - Shipment created
// - PARCEL_RECEIVED (purple) - Dropped at terminal
// - ON_THE_WAY (yellow) - In transit
// - PARCEL_DELIVERED (green) - Delivered
// - PARCEL_CANCELED (red) - Cancelled
// - RETURNING (orange) - Being returned
```

### 4.3 Phone Number Validation

```typescript
// Phone formats required by Unisend (validated server-side)
const phoneFormats: Record<string, { regex: RegExp; example: string }> = {
  LT: {
    regex: /^\+3706\d{7}$/,
    example: "+37060012345"
  },
  LV: {
    regex: /^\+371\d{8}$/,
    example: "+37120012345"
  },
  EE: {
    regex: /^\+372\d{7,8}$/,
    example: "+3725012345"
  }
};

// Client-side: Show placeholder based on selected country
// Server-side: Unisend validates and returns specific error if invalid
```

### 4.4 Error Handling

```typescript
// Unisend returns different error formats:

// 1. Validation errors (array)
// Status: 400
[
  {
    "error": "INCORRECT RECEIVER",
    "field": "receiver.contacts.phone",
    "error_description": "Incorrectly specified..."
  }
]

// 2. Single error object
// Status: 400/401/404/500
{
  "error": "UNAUTHORIZED",
  "error_description": "Access token is invalid or expired"
}

// 3. Plain text (rare)
"Internal server error"

// Implementation: Parse all formats and normalize to:
interface ApiError {
  error: string;
  validationErrors?: Array<{
    field: string;
    error: string;
    message: string;
  }>;
}
```

---

## 5. Database Schema

### 5.1 Tables

```sql
-- Baskets (shopping carts grouped by seller)
CREATE TABLE baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id)
);

-- Basket Items (games in basket)
CREATE TABLE basket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id),
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- reserved_at + 30 minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id)  -- A game can only be in one basket
);

-- Orders (created after payment)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "ORD-2024-001234"
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),

  -- Shipping info (captured at checkout)
  destination_country VARCHAR(2) NOT NULL,  -- LT, LV, EE
  destination_terminal_id VARCHAR(20) NOT NULL,
  destination_terminal_name VARCHAR(255) NOT NULL,
  destination_terminal_address TEXT NOT NULL,
  receiver_name VARCHAR(255) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  receiver_email VARCHAR(255),

  -- Pricing
  games_total DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,

  -- Payment
  stripe_payment_intent_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Seller response
  seller_response_deadline TIMESTAMP WITH TIME ZONE,  -- paid_at + 72 hours
  seller_responded_at TIMESTAMP WITH TIME ZONE,
  seller_decline_reason TEXT,
  parcel_size VARCHAR(2),  -- XS, S, M, L (set by seller when accepting)

  -- Unisend data (populated when seller accepts)
  unisend_parcel_id BIGINT,
  unisend_request_id VARCHAR(255),
  barcode VARCHAR(50),
  tracking_url TEXT,
  label_generated_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_PAYMENT',
  -- PENDING_PAYMENT, PENDING_SELLER, ACCEPTED, CANCELLED, SHIPPED, IN_TRANSIT, DELIVERED

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items (games in order)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id),
  price DECIMAL(10,2) NOT NULL,  -- Price at time of purchase
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracking Events (synced from Unisend)
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  state_type VARCHAR(50) NOT NULL,
  state_text VARCHAR(255),
  location VARCHAR(255),
  description TEXT,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id, event_type, event_timestamp)
);

-- Indexes
CREATE INDEX idx_basket_items_expires_at ON basket_items(expires_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_seller_response_deadline ON orders(seller_response_deadline);
CREATE INDEX idx_orders_barcode ON orders(barcode);
CREATE INDEX idx_tracking_events_order_id ON tracking_events(order_id);
```

### 5.2 Game Status Management

```sql
-- Add reservation status to games table
ALTER TABLE games ADD COLUMN status VARCHAR(20) DEFAULT 'AVAILABLE';
-- AVAILABLE, RESERVED, SOLD

-- Update game status when added to basket
UPDATE games SET status = 'RESERVED', updated_at = NOW()
WHERE id = $1 AND status = 'AVAILABLE';

-- Release expired reservations (run every minute via cron)
UPDATE games SET status = 'AVAILABLE', updated_at = NOW()
WHERE id IN (
  SELECT game_id FROM basket_items
  WHERE expires_at < NOW()
);
DELETE FROM basket_items WHERE expires_at < NOW();
```

---

## 6. UI/UX Requirements

### 6.1 Screens

#### 6.1.1 Cart Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Shopping Cart                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Seller: BoardGameFan123                          Basket 1/2 │ │
│ │                                                             │ │
│ │ ┌─────┐ Ticket to Ride Europe          €35.00   ⏱️ 28:45   │ │
│ │ │ IMG │ Condition: Like New             [Remove]            │ │
│ │ └─────┘                                                     │ │
│ │                                                             │ │
│ │ ┌─────┐ Catan                          €25.00   ⏱️ 15:30   │ │
│ │ │ IMG │ Condition: Good                 [Remove]            │ │
│ │ └─────┘                                                     │ │
│ │                                                             │ │
│ │                              Subtotal: €60.00               │ │
│ │                           Service fee: €2.00                │ │
│ │                              Shipping: €3.50                │ │
│ │                                 ─────────────               │ │
│ │                                 Total: €65.50               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Seller: GameCollector99                          Basket 2/2 │ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                          [Continue to Shipping →]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Timer Display Rules:**
- Green: > 10 minutes remaining
- Yellow: 5-10 minutes remaining
- Red: < 5 minutes remaining
- When expired: Remove item and show notification

#### 6.1.2 Shipping Selection Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Select Pickup Terminal                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Country: [Lithuania ▼]                                          │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search terminals by name, address, city...              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📍 Vilnius Akropolis                                        │ │
│ │    Ozo g. 25, LT-07150 Vilnius                             │ │
│ │    Hours: 08:00-22:00                                       │ │
│ │    Sizes: XS S M L                            [Select]      │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 📍 Vilnius Ozas                                             │ │
│ │    Ozo g. 18, LT-08243 Vilnius                             │ │
│ │    Hours: 08:00-21:00                                       │ │
│ │    Sizes: XS S M L                            [Select]      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [← Back]                              [Continue to Review →]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.1.3 Review Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Review Your Order                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ DELIVERY INFORMATION                                    [Edit] │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📍 Vilnius Akropolis                                        │ │
│ │    Ozo g. 25, LT-07150 Vilnius                             │ │
│ │    Hours: 08:00-22:00                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ CONTACT INFORMATION                                     [Edit] │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Name:  [John Smith                               ]          │ │
│ │ Phone: [+37060012345                             ]          │ │
│ │        ℹ️ Format: +3706XXXXXXX (Lithuanian mobile)          │ │
│ │ Email: [john@example.com                         ]          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ORDER SUMMARY                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Basket 1: BoardGameFan123                                   │ │
│ │   2 games                               €60.00              │ │
│ │   Service fee                            €2.00              │ │
│ │   Shipping                               €3.50              │ │
│ │                                         ───────             │ │
│ │                                         €65.50              │ │
│ │                                                             │ │
│ │ Basket 2: GameCollector99                                   │ │
│ │   ...                                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ⚠️ Each basket is paid separately                              │
│                                                                 │
│ [← Back]                                  [Pay €65.50 →]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.1.4 Order Status Page (Buyer)

```
┌─────────────────────────────────────────────────────────────────┐
│ Order #ORD-2024-001234                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Status: ⏳ Waiting for seller response                          │
│         Seller has 68h 45m to respond                          │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                    TRACKING TIMELINE                        │ │
│ │                                                             │ │
│ │  ✅ Order placed                    Jan 15, 10:30          │ │
│ │  │                                                          │ │
│ │  ⏳ Waiting for seller              ---                     │ │
│ │  │                                                          │ │
│ │  ○ Seller ships                     ---                     │ │
│ │  │                                                          │ │
│ │  ○ In transit                       ---                     │ │
│ │  │                                                          │ │
│ │  ○ Ready for pickup                 ---                     │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ITEMS                                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Ticket to Ride Europe                              €35.00  │ │
│ │ Catan                                              €25.00  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ DELIVERY                                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📍 Vilnius Akropolis                                        │ │
│ │    Ozo g. 25, LT-07150 Vilnius                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Component Library

```typescript
// Components to implement:

// Terminal selector with search and country filter
<TerminalSelector
  country={selectedCountry}
  onCountryChange={setSelectedCountry}
  selectedTerminal={terminal}
  onSelect={setTerminal}
/>

// Phone input with country-specific formatting
<PhoneInput
  country={destinationCountry}
  value={phone}
  onChange={setPhone}
  error={errors.phone}
/>

// Countdown timer for reservations
<ReservationTimer
  expiresAt={item.expiresAt}
  onExpire={() => removeFromCart(item.id)}
/>

// Order status timeline
<OrderTimeline
  status={order.status}
  events={trackingEvents}
/>
```

---

## 7. Business Logic

### 7.1 Reservation System

```typescript
// When buyer adds game to cart:
async function addToCart(buyerId: string, gameId: string) {
  // 1. Check game is available
  const game = await db.games.findUnique({ where: { id: gameId } });
  if (game.status !== 'AVAILABLE') {
    throw new Error('Game is no longer available');
  }

  // 2. Get or create basket for this seller
  let basket = await db.baskets.findFirst({
    where: { buyerId, sellerId: game.sellerId }
  });

  if (!basket) {
    basket = await db.baskets.create({
      data: { buyerId, sellerId: game.sellerId }
    });
  }

  // 3. Check basket limit
  const itemCount = await db.basketItems.count({
    where: { basketId: basket.id }
  });

  if (itemCount >= 10) {
    throw new Error('Maximum 10 games per seller');
  }

  // 4. Reserve game and add to basket
  await db.$transaction([
    db.games.update({
      where: { id: gameId },
      data: { status: 'RESERVED' }
    }),
    db.basketItems.create({
      data: {
        basketId: basket.id,
        gameId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }
    })
  ]);
}

// Cron job to release expired reservations (runs every minute):
async function releaseExpiredReservations() {
  const expired = await db.basketItems.findMany({
    where: { expiresAt: { lt: new Date() } }
  });

  await db.$transaction([
    db.games.updateMany({
      where: { id: { in: expired.map(i => i.gameId) } },
      data: { status: 'AVAILABLE' }
    }),
    db.basketItems.deleteMany({
      where: { id: { in: expired.map(i => i.id) } }
    })
  ]);
}
```

### 7.2 Seller Response Deadline

```typescript
// When payment completes:
async function createOrder(paymentIntent: Stripe.PaymentIntent) {
  const order = await db.orders.create({
    data: {
      // ... order details
      status: 'PENDING_SELLER',
      paidAt: new Date(),
      sellerResponseDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
    }
  });

  // Mark games as sold
  await db.games.updateMany({
    where: { id: { in: order.items.map(i => i.gameId) } },
    data: { status: 'SOLD' }
  });

  // Notify seller
  await notificationService.notifySeller(order);
}

// Cron job to handle expired seller responses (runs every 5 minutes):
async function handleExpiredSellerDeadlines() {
  const expired = await db.orders.findMany({
    where: {
      status: 'PENDING_SELLER',
      sellerResponseDeadline: { lt: new Date() }
    }
  });

  for (const order of expired) {
    await db.$transaction([
      // Cancel order
      db.orders.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' }
      }),
      // Release games back to available
      db.games.updateMany({
        where: { id: { in: order.items.map(i => i.gameId) } },
        data: { status: 'AVAILABLE' }
      })
    ]);

    // Process refund
    await stripeService.refund(order.stripePaymentIntentId);

    // Notify buyer
    await notificationService.notifyBuyerOrderCancelled(order);
  }
}
```

### 7.3 Seller Acceptance Flow

```typescript
// When seller accepts order:
async function sellerAcceptOrder(orderId: string, parcelSize: 'XS'|'S'|'M'|'L') {
  const order = await db.orders.findUnique({ where: { id: orderId } });

  // 1. Create parcel in Unisend
  const parcelResponse = await unisendClient.createParcel({
    plan: { code: 'TERMINAL' },
    parcel: { type: 'T2T', size: parcelSize },
    receiver: {
      name: order.receiverName,
      address: {
        countryCode: order.destinationCountry,
        terminalId: order.destinationTerminalId
      },
      contacts: {
        phone: order.receiverPhone,
        email: order.receiverEmail
      }
    }
  });

  // 2. Initiate shipping (generates label)
  const shippingResponse = await unisendClient.initiateShipping({
    parcelIds: [parcelResponse.parcelId]
  });

  // 3. Get barcode and tracking URL
  const barcodes = await unisendClient.getBarcodes([parcelResponse.parcelId]);

  // 4. Update order
  await db.orders.update({
    where: { id: orderId },
    data: {
      status: 'ACCEPTED',
      sellerRespondedAt: new Date(),
      parcelSize,
      unisendParcelId: parcelResponse.parcelId,
      unisendRequestId: shippingResponse.requestId,
      barcode: barcodes[0].barcode,
      trackingUrl: barcodes[0].trackingUrl,
      labelGeneratedAt: new Date()
    }
  });

  // 5. Notify buyer
  await notificationService.notifyBuyerOrderAccepted(order, barcodes[0]);
}
```

---

## 8. Error Handling

### 8.1 Unisend API Errors

```typescript
// Custom error class for validation errors
class UnisendValidationError extends Error {
  validationErrors: Array<{
    field: string;
    error: string;
    message: string;
  }>;

  constructor(message: string, validationErrors: typeof this.validationErrors) {
    super(message);
    this.name = 'UnisendValidationError';
    this.validationErrors = validationErrors;
  }
}

// API route error handling
async function handleUnisendResponse(response: Response) {
  if (response.ok) {
    return response.json();
  }

  const text = await response.text();

  try {
    const data = JSON.parse(text);

    // Array of validation errors
    if (Array.isArray(data) && data.length > 0) {
      throw new UnisendValidationError('Validation failed', data.map(e => ({
        field: e.field,
        error: e.error,
        message: e.error_description || e.error
      })));
    }

    // Single error object
    if (data.error || data.error_description) {
      throw new Error(data.error_description || data.error);
    }
  } catch (e) {
    if (e instanceof UnisendValidationError) throw e;
  }

  throw new Error(`Unisend API error: ${response.status} ${text}`);
}

// Field mapping for UI display
const fieldNameMap: Record<string, string> = {
  'receiver.contacts.phone': 'Phone number',
  'receiver.contacts.email': 'Email address',
  'receiver.name': 'Recipient name',
  'receiver.address.terminalId': 'Terminal',
  'parcel.size': 'Parcel size'
};
```

### 8.2 Error Recovery

| Error | Recovery Action |
|-------|-----------------|
| Token expired | Automatically refresh and retry |
| Network timeout | Retry up to 3 times with exponential backoff |
| Invalid phone format | Show field-specific error with correct format |
| Terminal not found | Clear selection, refresh terminal list |
| Parcel creation fails | Show error, allow seller to retry |
| Label generation fails | Queue for retry, notify support if repeated |

### 8.3 User-Facing Error Messages

```typescript
const userFriendlyMessages: Record<string, string> = {
  'INCORRECT RECEIVER': 'Please check the recipient information',
  'TERMINAL_NOT_FOUND': 'Selected terminal is no longer available. Please choose another.',
  'UNAUTHORIZED': 'Session expired. Please log in again.',
  'SERVICE_UNAVAILABLE': 'Shipping service temporarily unavailable. Please try again later.',
  'NETWORK_ERROR': 'Connection error. Please check your internet and try again.'
};
```

---

## 9. Notification System

### 9.1 Email Templates

#### Order Placed (to Seller)
```
Subject: New Order #ORD-2024-001234 - Action Required

Hi {seller_name},

You have a new order! Please respond within 72 hours.

ORDER DETAILS:
- {game_count} game(s)
- Total: €{total}
- Buyer: {buyer_name}
- Delivery: {terminal_name}, {terminal_city}

[View Order & Respond →]

If you don't respond within 72 hours, the order will be
automatically cancelled and the buyer will be refunded.
```

#### Order Accepted (to Buyer)
```
Subject: Great news! Your order #ORD-2024-001234 is confirmed

Hi {buyer_name},

The seller has accepted your order and is preparing your shipment!

TRACKING INFORMATION:
Tracking Number: {barcode}
Track your package: {tracking_url}

PICKUP LOCATION:
{terminal_name}
{terminal_address}
{terminal_city}, {terminal_postal_code}

You'll receive another email when your package arrives.
```

#### Package Ready (to Buyer)
```
Subject: Your package is ready for pickup! Order #ORD-2024-001234

Hi {buyer_name},

Your package has arrived and is waiting for you!

PICKUP LOCATION:
{terminal_name}
{terminal_address}

PICKUP CODE: {pickup_code}

Terminal hours: {terminal_hours}

Don't forget to pick up your package within 7 days.
```

### 9.2 Push Notifications

```typescript
const pushNotifications = {
  ORDER_PENDING: {
    title: 'New Order!',
    body: 'You have a new order. Respond within 72h.',
    action: '/seller/orders/{orderId}'
  },
  ORDER_ACCEPTED: {
    title: 'Order Confirmed!',
    body: 'Your order has been accepted. Track: {barcode}',
    action: '/orders/{orderId}'
  },
  PACKAGE_SHIPPED: {
    title: 'Package Shipped!',
    body: 'Your package is on the way to {terminal_name}',
    action: '/orders/{orderId}'
  },
  PACKAGE_READY: {
    title: 'Package Ready!',
    body: 'Pick up at {terminal_name}',
    action: '/orders/{orderId}'
  },
  ORDER_CANCELLED: {
    title: 'Order Cancelled',
    body: 'Your order was cancelled. Refund processed.',
    action: '/orders/{orderId}'
  }
};
```

---

## 10. Security Considerations

### 10.1 API Security

```typescript
// Store Unisend credentials securely
// NEVER expose in client-side code
const unisendConfig = {
  apiUrl: process.env.UNISEND_API_URL,
  username: process.env.UNISEND_USERNAME,
  password: process.env.UNISEND_PASSWORD
};

// All Unisend calls go through your backend
// Frontend → Your API → Unisend API

// Rate limiting for terminal search
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30 // 30 requests per minute per user
});
```

### 10.2 Data Validation

```typescript
// Server-side validation for all inputs
const orderSchema = z.object({
  terminalId: z.string().min(1),
  receiverName: z.string().min(2).max(100),
  receiverPhone: z.string().regex(/^\+\d{10,15}$/),
  receiverEmail: z.string().email().optional()
});

// Sanitize user input before sending to Unisend
function sanitizeReceiverName(name: string): string {
  return name.trim().replace(/[<>]/g, '');
}
```

### 10.3 Payment Security

```typescript
// Stripe Connect for marketplace payments
// - Buyer pays platform
// - Platform holds funds until seller ships
// - Funds released to seller after delivery confirmation
// - Automatic refund if seller doesn't respond in 72h
```

---

## 11. Testing Requirements

### 11.1 Unit Tests

```typescript
// UnisendClient tests (see __tests__/lib/unisend-client.test.ts)
describe('UnisendClient', () => {
  it('should authenticate successfully')
  it('should fetch terminals for a country')
  it('should create a parcel successfully')
  it('should throw UnisendValidationError for invalid phone')
  it('should initiate shipping')
  it('should get barcodes')
  it('should generate label')
  it('should fetch tracking events')
});

// API route tests
describe('POST /api/parcel', () => {
  it('should create parcel successfully')
  it('should parse validation errors array')
  it('should handle multiple validation errors')
  it('should handle network errors')
});
```

### 11.2 Integration Tests

```typescript
describe('Checkout Flow', () => {
  it('should complete full checkout flow')
  it('should release reservation after 30 minutes')
  it('should prevent adding >10 games per seller')
  it('should create order after payment')
  it('should cancel order if seller does not respond')
});

describe('Seller Flow', () => {
  it('should create label when seller accepts')
  it('should notify buyer with tracking info')
  it('should handle Unisend API failures gracefully')
});
```

### 11.3 Test Environment

```
Unisend Test API: https://api-manosiuntostst.post.lt
- Use test credentials provided by Unisend
- Test terminals available for LT, LV, EE
- Labels generated are marked as "TEST"
- No actual shipments are created
```

---

## 12. Code Examples

### 12.1 Unisend Client Implementation

See: `lib/unisend-client.ts`

```typescript
import {
  AuthResponse,
  Terminal,
  CreateParcelRequest,
  ParcelResponse,
  ShippingInitiateRequest,
  ShippingInitiateResponse,
  BarcodeInfo,
  TrackingEvent,
  ApiErrorResponse,
  UnisendValidationError,
} from "./types";

const API_BASE_URL = "/api"; // Proxied through your backend

export class UnisendClient {
  private accessToken: string | null = null;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || null;
  }

  async authenticate(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Authentication failed");
    }

    const data: AuthResponse = await response.json();
    this.accessToken = data.access_token;
    return data;
  }

  async getTerminals(countryCode: string, find?: string): Promise<Terminal[]> {
    const params = new URLSearchParams({ countryCode });
    if (find) params.append("find", find);

    const response = await fetch(`${API_BASE_URL}/terminals?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch terminals");
    }

    return response.json();
  }

  async createParcel(data: CreateParcelRequest): Promise<ParcelResponse> {
    const response = await fetch(`${API_BASE_URL}/parcel`, {
      method: "POST",
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      if (errorData.validationErrors?.length) {
        throw new UnisendValidationError(
          errorData.error || "Validation failed",
          errorData.validationErrors
        );
      }
      throw new Error(errorData.error || "Failed to create parcel");
    }

    return response.json();
  }

  async initiateShipping(data: ShippingInitiateRequest): Promise<ShippingInitiateResponse> {
    const response = await fetch(`${API_BASE_URL}/shipping/initiate`, {
      method: "POST",
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to initiate shipping");
    }

    return response.json();
  }

  async getBarcodes(parcelIds: number[]): Promise<BarcodeInfo[]> {
    const params = new URLSearchParams();
    parcelIds.forEach(id => params.append("parcelIds", String(id)));

    const response = await fetch(`${API_BASE_URL}/shipping/barcode?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get barcodes");
    }

    return response.json();
  }

  async generateLabel(
    parcelIds: number[],
    layout: "LAYOUT_10x15" | "LAYOUT_A4" = "LAYOUT_10x15",
    orientation: "LANDSCAPE" | "PORTRAIT" = "LANDSCAPE"
  ): Promise<Blob> {
    const params = new URLSearchParams({ layout, labelOrientation: orientation });
    parcelIds.forEach(id => params.append("parcelIds", String(id)));

    const response = await fetch(`${API_BASE_URL}/label?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to generate label");
    }

    return response.blob();
  }

  async getTrackingEvents(barcode: string, lang: "en" | "lt" = "en"): Promise<TrackingEvent[]> {
    const params = new URLSearchParams({ barcode, lang });

    const response = await fetch(`${API_BASE_URL}/tracking/events?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get tracking events");
    }

    return response.json();
  }

  private getAuthHeaders(): HeadersInit {
    if (!this.accessToken) {
      throw new Error("No access token available. Please authenticate first.");
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }
}

export const createUnisendClient = (accessToken?: string) => {
  return new UnisendClient(accessToken);
};
```

### 12.2 Types

See: `lib/types.ts`

```typescript
export interface Terminal {
  id: string;
  name: string;
  countryCode: string;
  city: string;
  address: string;
  postalCode: string;
  boxes: string[];
  latitude: string;
  longitude: string;
  servicingHours: string;
  comment?: string;
}

export interface CreateParcelRequest {
  plan: { code: "TERMINAL" | "HANDS" | "SIGNED" | "TRACKED" | "UNTRACKED" };
  parcel: {
    type: "T2T" | "H2H" | "P2H" | "H2F";
    size?: "XS" | "S" | "M" | "L";
  };
  services?: Array<{ code: string; value?: string }>;
  receiver: {
    name: string;
    address: { countryCode: string; terminalId: string };
    contacts: { phone: string; email?: string };
  };
}

export interface ParcelResponse {
  parcelId: number;
  warnings?: string[];
}

export interface ShippingInitiateRequest {
  parcelIds: number[];
}

export interface ShippingInitiateResponse {
  requestId: string;
  status?: "IN_PROGRESS" | "SUCCESSFUL" | "PARTIALLY_SUCCESSFUL" | "ERROR";
}

export interface BarcodeInfo {
  parcelId: string;
  barcode: string;
  trackingUrl?: string;
}

export type TrackingStateType =
  | "LABEL_CREATED"
  | "ON_THE_WAY"
  | "PARCEL_RECEIVED"
  | "PARCEL_DELIVERED"
  | "PARCEL_CANCELED"
  | "RETURNING";

export interface TrackingEvent {
  eventType: string;
  stateType: TrackingStateType;
  stateText: string;
  timestamp: string;
  location?: string;
  description?: string;
}

export interface ValidationError {
  field: string;
  error: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  validationErrors?: ValidationError[];
}

export class UnisendValidationError extends Error {
  validationErrors: ValidationError[];

  constructor(message: string, validationErrors: ValidationError[]) {
    super(message);
    this.name = "UnisendValidationError";
    this.validationErrors = validationErrors;
  }
}
```

---

## Appendix A: Environment Variables

```bash
# Unisend API
UNISEND_API_URL=https://api-manosiuntostst.post.lt  # Test
# UNISEND_API_URL=https://api-manosiuntos.post.lt   # Production
UNISEND_USERNAME=your_username
UNISEND_PASSWORD=your_password

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=...
```

## Appendix B: Cron Jobs

```
# Release expired basket reservations
* * * * *  /path/to/job release-expired-reservations

# Handle expired seller deadlines
*/5 * * * *  /path/to/job handle-seller-timeouts

# Sync tracking events
*/15 * * * *  /path/to/job sync-tracking-events
```

## Appendix C: Reference Implementation

The complete working MVP implementation with 72 passing tests is available at:
`unisend_mvp/`

Key files:
- `lib/unisend-client.ts` - API client
- `lib/types.ts` - TypeScript types
- `app/api/` - API routes (auth, terminals, parcel, shipping, tracking)
- `app/create-shipment/page.tsx` - Create shipment UI
- `app/tracking/page.tsx` - Tracking UI
- `__tests__/` - Test suite
