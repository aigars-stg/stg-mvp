/**
 * Unisend Label Generation Service
 * Handles creating parcels, generating labels, and storing them
 */

import { getUnisendClient } from './client';
import type { CreateParcelRequest } from './types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GenerateLabelParams {
  orderId: string;
  orderNumber: string;
  senderName: string;
  senderPhone: string;
  senderCountry: 'LT' | 'LV' | 'EE';
  receiverName: string;
  receiverPhone: string;
  receiverCountry: 'LT' | 'LV' | 'EE';
  destinationTerminalId: string;
  parcelSize: 'XS' | 'S' | 'M' | 'L';
  parcelWeight?: number; // kg
}

interface GenerateLabelResult {
  parcelId: number;
  barcode: string;
  trackingUrl?: string;
  labelUrl: string;
}

/**
 * Generate shipping label for an accepted T2T order
 */
export async function generateShippingLabel(
  params: GenerateLabelParams
): Promise<GenerateLabelResult> {
  const unisend = getUnisendClient();

  console.log(`📦 [Unisend] Generating label for order ${params.orderNumber}...`);

  // Step 1: Create parcel
  const parcelRequest: CreateParcelRequest = {
    plan: {
      code: 'TERMINAL',
    },
    sender: {
      name: params.senderName,
      address: {
        countryCode: params.senderCountry,
      },
      contacts: {
        phone: params.senderPhone,
      },
    },
    receiver: {
      name: params.receiverName,
      address: {
        countryCode: params.receiverCountry,
        terminalId: params.destinationTerminalId,
      },
      contacts: {
        phone: params.receiverPhone,
      },
    },
    parcel: {
      type: 'T2T',
      reference: params.orderNumber,
      size: params.parcelSize,
      weight: params.parcelWeight || 2, // Default 2kg if not specified
    },
  };

  console.log(`📦 [Unisend] Creating parcel...`);
  const { parcelId, barcode, trackingUrl } = await unisend.createAndShipParcel(parcelRequest);

  console.log(`✅ [Unisend] Parcel created: ${parcelId}, Barcode: ${barcode}`);

  // Step 2: Generate label PDF
  console.log(`📄 [Unisend] Generating label PDF...`);
  const labelBlob = await unisend.generateLabel([parcelId], 'LAYOUT_10x15', 'LANDSCAPE');

  // Step 3: Upload label to Supabase Storage
  console.log(`☁️ [Unisend] Uploading label to storage...`);
  const fileName = `${params.orderId}_${Date.now()}.pdf`;
  const filePath = `shipping-labels/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('order-documents')
    .upload(filePath, labelBlob, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    console.error('❌ [Unisend] Failed to upload label:', uploadError);
    throw new Error(`Failed to upload label: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('order-documents')
    .getPublicUrl(filePath);

  const labelUrl = urlData.publicUrl;

  console.log(`✅ [Unisend] Label generated and stored: ${labelUrl}`);

  return {
    parcelId,
    barcode,
    trackingUrl,
    labelUrl,
  };
}

/**
 * Get label PDF as buffer (for email attachment)
 */
export async function getLabelPdfBuffer(labelUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(labelUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch label: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('❌ [Unisend] Failed to get label PDF:', error);
    throw error;
  }
}

/**
 * Download label directly from storage
 */
export async function downloadLabelFromStorage(orderId: string): Promise<Blob | null> {
  // Find the label file for this order
  const { data: files, error: listError } = await supabase.storage
    .from('order-documents')
    .list('shipping-labels', {
      search: orderId,
    });

  if (listError || !files || files.length === 0) {
    console.error('❌ [Unisend] Label not found in storage');
    return null;
  }

  // Get the first matching file
  const fileName = files[0].name;
  const filePath = `shipping-labels/${fileName}`;

  const { data, error } = await supabase.storage
    .from('order-documents')
    .download(filePath);

  if (error) {
    console.error('❌ [Unisend] Failed to download label:', error);
    return null;
  }

  return data;
}
