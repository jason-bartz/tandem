import { NextResponse } from 'next/server';

// Apple's receipt validation endpoints
const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Shared secret for auto-renewable subscriptions (if you have one set in App Store Connect)
// You should store this in environment variables for security
const SHARED_SECRET = process.env.APP_STORE_SHARED_SECRET || '';

export async function POST(request) {
  try {
    const { receiptData } = await request.json();

    if (!receiptData) {
      return NextResponse.json({ error: 'Receipt data is required' }, { status: 400 });
    }

    // First, try production environment
    let validationResponse = await validateReceipt(receiptData, PRODUCTION_URL);

    // If we get status 21007, it's a sandbox receipt, retry with sandbox URL
    if (validationResponse.status === 21007) {
      console.log('Sandbox receipt detected, retrying with sandbox URL');
      validationResponse = await validateReceipt(receiptData, SANDBOX_URL);
    }

    // Check validation status
    if (validationResponse.status !== 0) {
      return NextResponse.json(
        {
          error: 'Receipt validation failed',
          status: validationResponse.status,
          message: getStatusMessage(validationResponse.status),
        },
        { status: 400 }
      );
    }

    // Extract subscription info from the receipt
    const subscriptionInfo = extractSubscriptionInfo(validationResponse.receipt);

    return NextResponse.json({
      success: true,
      environment: validationResponse.environment || 'Production',
      subscriptionInfo,
    });
  } catch (error) {
    console.error('Receipt validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error during receipt validation' },
      { status: 500 }
    );
  }
}

async function validateReceipt(receiptData, url) {
  const requestBody = {
    'receipt-data': receiptData,
    'exclude-old-transactions': true,
  };

  // Add shared secret if available (required for auto-renewable subscriptions)
  if (SHARED_SECRET) {
    requestBody.password = SHARED_SECRET;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  return response.json();
}

function extractSubscriptionInfo(receipt) {
  if (!receipt) {
    return null;
  }

  const info = {
    bundleId: receipt.bundle_id,
    inApp: [],
    latestReceiptInfo: [],
    pendingRenewalInfo: [],
  };

  // Extract in-app purchases
  if (receipt.in_app && Array.isArray(receipt.in_app)) {
    info.inApp = receipt.in_app.map((item) => ({
      productId: item.product_id,
      transactionId: item.transaction_id,
      originalTransactionId: item.original_transaction_id,
      purchaseDate: item.purchase_date_ms,
      expiresDate: item.expires_date_ms,
      isTrialPeriod: item.is_trial_period === 'true',
    }));
  }

  // Extract latest receipt info (for auto-renewable subscriptions)
  if (receipt.latest_receipt_info && Array.isArray(receipt.latest_receipt_info)) {
    info.latestReceiptInfo = receipt.latest_receipt_info.map((item) => ({
      productId: item.product_id,
      transactionId: item.transaction_id,
      originalTransactionId: item.original_transaction_id,
      purchaseDate: item.purchase_date_ms,
      expiresDate: item.expires_date_ms,
      isTrialPeriod: item.is_trial_period === 'true',
      subscriptionGroupIdentifier: item.subscription_group_identifier,
    }));
  }

  // Extract pending renewal info
  if (receipt.pending_renewal_info && Array.isArray(receipt.pending_renewal_info)) {
    info.pendingRenewalInfo = receipt.pending_renewal_info.map((item) => ({
      productId: item.product_id,
      autoRenewStatus: item.auto_renew_status === '1',
      autoRenewProductId: item.auto_renew_product_id,
      expirationIntent: item.expiration_intent,
    }));
  }

  // Determine active subscriptions
  const now = Date.now();
  info.activeSubscriptions = [];

  // Check latest receipt info for active subscriptions
  if (info.latestReceiptInfo.length > 0) {
    info.activeSubscriptions = info.latestReceiptInfo
      .filter((item) => {
        if (!item.expiresDate) {
          // Non-consumable (lifetime) purchase
          return true;
        }
        return parseInt(item.expiresDate) > now;
      })
      .map((item) => ({
        productId: item.productId,
        expiresDate: item.expiresDate,
        isActive: true,
      }));
  }

  return info;
}

function getStatusMessage(status) {
  const statusMessages = {
    0: 'Valid receipt',
    21000: 'The request to the App Store was not made using the HTTP POST request method',
    21001: 'This status code is no longer sent by the App Store',
    21002: 'The receipt-data property was malformed or missing',
    21003: 'The receipt could not be authenticated',
    21004: 'The shared secret does not match the shared secret on file for your account',
    21005: 'The receipt server was temporarily unable to provide the receipt',
    21006: 'This receipt is valid but the subscription has expired',
    21007: 'This receipt is from the test environment (sandbox)',
    21008: 'This receipt is from the production environment',
    21009: 'Internal data access error',
    21010: 'The user account cannot be found or has been deleted',
  };

  return statusMessages[status] || 'Unknown status code';
}
