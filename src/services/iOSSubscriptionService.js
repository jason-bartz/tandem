import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getCurrentPuzzleNumber, getPuzzleNumberForDate } from '@/lib/puzzleNumber';
import { getApiUrl } from '@/lib/api-config';
import logger from '@/lib/logger';

// Product IDs - must match App Store Connect configuration
const PRODUCTS = {
  BUDDY_MONTHLY: 'com.tandemdaily.app.buddypass',
  BEST_FRIENDS_YEARLY: 'com.tandemdaily.app.bestfriends',
  SOULMATES_LIFETIME: 'com.tandemdaily.app.soulmates',
};

// Storage keys - using Capacitor Preferences for iOS persistence
const STORAGE_KEYS = {
  SUBSCRIPTION_STATUS: 'tandem_subscription_status',
  PURCHASE_DATE: 'tandem_purchase_date',
  PRODUCT_ID: 'tandem_product_id',
  EXPIRY_DATE: 'tandem_expiry_date',
  RECEIPT_DATA: 'tandem_receipt_data',
  TRANSACTION_ID: 'tandem_transaction_id',
  ORIGINAL_TRANSACTION_ID: 'tandem_original_transaction_id',
};

// Initialization states following iOS best practices
const INIT_STATE = {
  NOT_STARTED: 'NOT_STARTED',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  FAILED: 'FAILED',
};

class SubscriptionService {
  constructor() {
    this.store = null;
    this.products = {};
    this.initState = INIT_STATE.NOT_STARTED;
    this.subscriptionStatus = null;
    this.initPromise = null;
    this.stateListeners = [];
    this.handlersSetup = false;
    this.pendingPurchases = {}; // Track pending purchases and their promise resolvers
    this.restoringPurchases = false;
  }

  /**
   * Get current initialization state
   * @returns {string} One of INIT_STATE values
   */
  getInitState() {
    return this.initState;
  }

  /**
   * Add a listener for initialization state changes
   * @param {Function} callback - Called with (newState, oldState)
   * @returns {Function} Unsubscribe function
   */
  onStateChange(callback) {
    this.stateListeners.push(callback);
    return () => {
      this.stateListeners = this.stateListeners.filter((cb) => cb !== callback);
    };
  }

  _notifyStateChange(newState) {
    const oldState = this.initState;
    this.initState = newState;
    this.stateListeners.forEach((cb) => cb(newState, oldState));
  }

  /**
   * Initialize the subscription service
   * This is idempotent - multiple calls will return the same promise
   * @returns {Promise<void>}
   */
  async initialize() {
    // If already initializing or initialized, return the existing promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // If already failed, don't retry automatically
    if (this.initState === INIT_STATE.FAILED) {
      return Promise.resolve();
    }

    // Start initialization
    this._notifyStateChange(INIT_STATE.INITIALIZING);

    this.initPromise = this._doInitialize().catch(() => {
      this._notifyStateChange(INIT_STATE.FAILED);
      // Don't throw - app should still work without IAP
    });

    return this.initPromise;
  }

  /**
   * Force re-initialization of the service
   * Use this when initialization fails and you want to retry
   * @returns {Promise<void>}
   */
  async forceReinitialize() {
    // If already initialized, just refresh products
    if (this.store && this.initState === INIT_STATE.READY) {
      await this.store.update();
      // Re-load products
      const allProducts = this.store.products || [];
      this.products = {};
      for (const product of allProducts) {
        if (
          product.id === PRODUCTS.BUDDY_MONTHLY ||
          product.id === PRODUCTS.BEST_FRIENDS_YEARLY ||
          product.id === PRODUCTS.SOULMATES_LIFETIME
        ) {
          this.products[product.id] = product;
        }
      }
      // Restore purchases automatically to refresh ownership status
      await this.restorePurchases();
      return;
    }

    this.initPromise = null;
    this.initState = INIT_STATE.NOT_STARTED;
    this.products = {};
    this.subscriptionStatus = null;

    return this.initialize();
  }

  async _doInitialize() {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      await this.loadSubscriptionStatus();
      this._notifyStateChange(INIT_STATE.READY);
      return;
    }

    try {
      // Wait for CdvPurchase to be available (v13 uses window.CdvPurchase)
      let attempts = 0;
      while (attempts < 20 && !window.CdvPurchase) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;
      }

      if (!window.CdvPurchase) {
        throw new Error(
          'CdvPurchase not available after waiting - plugin may not be installed correctly'
        );
      }

      this.store = window.CdvPurchase.store;

      // Configure store for v13
      this.store.verbosity = window.CdvPurchase.LogLevel.ERROR;

      // this.store.validator = 'https://your-api/validate';

      // Register products (v13 syntax)

      this.store.register([
        {
          id: PRODUCTS.BUDDY_MONTHLY,
          type: window.CdvPurchase.ProductType.PAID_SUBSCRIPTION,
          platform: window.CdvPurchase.Platform.APPLE_APPSTORE,
        },
        {
          id: PRODUCTS.BEST_FRIENDS_YEARLY,
          type: window.CdvPurchase.ProductType.PAID_SUBSCRIPTION,
          platform: window.CdvPurchase.Platform.APPLE_APPSTORE,
        },
        {
          id: PRODUCTS.SOULMATES_LIFETIME,
          type: window.CdvPurchase.ProductType.NON_CONSUMABLE,
          platform: window.CdvPurchase.Platform.APPLE_APPSTORE,
        },
      ]);

      this.setupEventHandlers();

      await this.store.initialize([window.CdvPurchase.Platform.APPLE_APPSTORE]);

      // Wait a moment for products to load
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Store products for easy access
      const allProducts = this.store.products;

      for (const product of allProducts) {
        if (
          product.id === PRODUCTS.BUDDY_MONTHLY ||
          product.id === PRODUCTS.BEST_FRIENDS_YEARLY ||
          product.id === PRODUCTS.SOULMATES_LIFETIME
        ) {
          this.products[product.id] = product;
        }
      }

      // Load subscription status from persistent storage
      await this.loadSubscriptionStatus();

      // Automatically restore purchases on app launch to ensure ownership is up-to-date
      // This is a best practice recommended by Apple
      await this.restorePurchases();

      this._notifyStateChange(INIT_STATE.READY);
    } catch (error) {
      await this.loadSubscriptionStatus();
      this._notifyStateChange(INIT_STATE.FAILED);
      throw error;
    }
  }

  setupEventHandlers() {
    if (!this.store || this.handlersSetup) {
      return;
    }

    this.handlersSetup = true;

    // When any product is updated
    this.store.when().productUpdated((product) => {
      this.products[product.id] = product;
    });

    // When a transaction is approved (purchase successful)
    // Store the pending purchase resolver so we can call it when the purchase completes
    this.store.when().approved(async (transaction) => {
      if (transaction.products && transaction.products.length > 0) {
        const productId = transaction.products[0].id;

        await this.handlePurchaseSuccess(transaction.products[0], transaction);

        // Then finish the transaction
        transaction.finish();

        if (this.pendingPurchases && this.pendingPurchases[productId]) {
          const { resolve, timeout } = this.pendingPurchases[productId];
          clearTimeout(timeout);
          delete this.pendingPurchases[productId];
          resolve(transaction.products[0]);
        }
      }
    });

    // When a transaction is verified - update subscription status
    this.store.when().verified(async (_receipt) => {
      // Receipt verified - update local status
      await this.loadSubscriptionStatus();
    });

    // When a transaction is finished
    this.store.when().finished(async () => {
      // Transaction finished - ensure status is updated
      await this.loadSubscriptionStatus();
    });

    this.store.when().receiptUpdated(async (_receipt) => {
      // Receipt updated - refresh subscription status
      await this.loadSubscriptionStatus();
    });

    this.store.when().updated(async () => {
      // Store state updated - refresh subscription status
      if (!this.restoringPurchases) {
        await this.loadSubscriptionStatus();
      }
    });

    this.store.when().unverified(() => {
      // Unverified receipt - log for debugging
      logger.warn('[SubscriptionService] Unverified receipt detected');
    });
  }

  async handlePurchaseSuccess(product, transaction) {
    const purchaseDate = new Date().toISOString();

    // Use Capacitor Preferences for iOS, fallback to localStorage for web
    const storage = Capacitor.isNativePlatform()
      ? Preferences
      : {
          set: async ({ key, value }) => localStorage.setItem(key, value),
          get: async ({ key }) => ({ value: localStorage.getItem(key) }),
          remove: async ({ key }) => localStorage.removeItem(key),
        };

    await storage.set({ key: STORAGE_KEYS.SUBSCRIPTION_STATUS, value: 'active' });
    await storage.set({ key: STORAGE_KEYS.PURCHASE_DATE, value: purchaseDate });
    await storage.set({ key: STORAGE_KEYS.PRODUCT_ID, value: product.id });

    // Store transaction ID for validation
    let originalTransactionId = null;
    if (transaction) {
      const transactionId = transaction.transactionId || transaction.id;
      originalTransactionId =
        transaction.originalTransactionId || transaction.originalId || transactionId;

      if (transactionId) {
        await storage.set({ key: STORAGE_KEYS.TRANSACTION_ID, value: transactionId });
      }
      if (originalTransactionId) {
        await storage.set({
          key: STORAGE_KEYS.ORIGINAL_TRANSACTION_ID,
          value: originalTransactionId,
        });
      }
    }

    let expiryDate;
    if (product.id === PRODUCTS.SOULMATES_LIFETIME) {
      // Lifetime purchase - set expiry far in future
      expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 100);
      await storage.set({ key: STORAGE_KEYS.EXPIRY_DATE, value: expiryDate.toISOString() });
    } else {
      expiryDate = new Date();
      if (product.id === PRODUCTS.BUDDY_MONTHLY) {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (product.id === PRODUCTS.BEST_FRIENDS_YEARLY) {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }
      await storage.set({ key: STORAGE_KEYS.EXPIRY_DATE, value: expiryDate.toISOString() });
    }

    // If user is authenticated, link purchase to their account
    await this.linkPurchaseToAccount(originalTransactionId, product.id, expiryDate);

    // Force refresh the store to update product ownership
    if (this.store) {
      await this.store.update();

      // Wait a bit for the update to propagate
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await this.loadSubscriptionStatus();
  }

  /**
   * Link Apple IAP purchase to authenticated user account
   * Called automatically after successful purchase if user is signed in
   */
  async linkPurchaseToAccount(originalTransactionId, productId, expiryDate) {
    if (!originalTransactionId) {
      return;
    }

    try {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseBrowserClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      // Call API to link purchase
      const apiUrl = getApiUrl('/api/iap/link-to-user');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          originalTransactionId,
          productId,
          expiryDate: expiryDate?.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('[iOSSubscription] Failed to link purchase to account', null, errorData);
        return;
      }

      await response.json();
    } catch (error) {
      logger.error('[iOSSubscription] Error linking purchase to account', error);
      // Don't throw - linking is optional and shouldn't break the purchase flow
    }
  }

  async loadSubscriptionStatus() {
    // First check the store for owned products (most authoritative source)
    if (this.store && this.store.ready) {
      const monthly = this.store.get(PRODUCTS.BUDDY_MONTHLY);
      const yearly = this.store.get(PRODUCTS.BEST_FRIENDS_YEARLY);
      const lifetime = this.store.get(PRODUCTS.SOULMATES_LIFETIME);

      // Determine which subscription is actually active using priority:
      // 1. Lifetime Membership (lifetime) - highest priority
      // 2. Annual Membership (yearly) - mid priority
      // 3. Monthly Membership (monthly) - lowest priority
      let activeProduct = null;
      let activeProductId = null;

      // Check lifetime first (highest priority)
      if (lifetime?.owned) {
        activeProduct = lifetime;
        activeProductId = PRODUCTS.SOULMATES_LIFETIME;
      }
      // Then check yearly (only if no lifetime)
      else if (yearly?.owned) {
        // For subscriptions in the same group, check which is actually active
        // by looking at expiry dates
        if (monthly?.owned) {
          // Both yearly and monthly owned - determine which is active
          const yearlyExpiry = yearly.expiryDate ? new Date(yearly.expiryDate) : null;
          const monthlyExpiry = monthly.expiryDate ? new Date(monthly.expiryDate) : null;
          const now = new Date();

          // If yearly is not expired, it's active
          if (yearlyExpiry && yearlyExpiry > now) {
            activeProduct = yearly;
            activeProductId = PRODUCTS.BEST_FRIENDS_YEARLY;
          }
          // If monthly is not expired and yearly is expired, monthly is active
          else if (monthlyExpiry && monthlyExpiry > now) {
            activeProduct = monthly;
            activeProductId = PRODUCTS.BUDDY_MONTHLY;
          }
          // If both expired or no expiry data, prefer higher tier (yearly)
          else {
            activeProduct = yearly;
            activeProductId = PRODUCTS.BEST_FRIENDS_YEARLY;
          }
        } else {
          activeProduct = yearly;
          activeProductId = PRODUCTS.BEST_FRIENDS_YEARLY;
        }
      }
      // Finally check monthly (only if no lifetime or yearly)
      else if (monthly?.owned) {
        activeProduct = monthly;
        activeProductId = PRODUCTS.BUDDY_MONTHLY;
      }

      if (activeProductId) {
        this.subscriptionStatus = {
          isActive: true,
          productId: activeProductId,
          expiryDate: activeProduct?.expiryDate,
          lastRenewalDate: activeProduct?.lastRenewalDate,
        };

        // Also persist this status to storage for offline access
        const storage = Capacitor.isNativePlatform()
          ? Preferences
          : {
              set: async ({ key, value }) => localStorage.setItem(key, value),
            };

        await storage.set({ key: STORAGE_KEYS.SUBSCRIPTION_STATUS, value: 'active' });
        await storage.set({ key: STORAGE_KEYS.PRODUCT_ID, value: activeProductId });
        if (activeProduct?.expiryDate) {
          await storage.set({ key: STORAGE_KEYS.EXPIRY_DATE, value: activeProduct.expiryDate });
        }

        return;
      }
    }

    // If store doesn't have ownership info, check persistent storage as fallback
    // This handles cases where the store isn't initialized yet or offline scenarios
    const storage = Capacitor.isNativePlatform()
      ? Preferences
      : {
          get: async ({ key }) => ({ value: localStorage.getItem(key) }),
          remove: async ({ key }) => localStorage.removeItem(key),
        };

    const statusResult = await storage.get({ key: STORAGE_KEYS.SUBSCRIPTION_STATUS });
    const expiryResult = await storage.get({ key: STORAGE_KEYS.EXPIRY_DATE });
    const productResult = await storage.get({ key: STORAGE_KEYS.PRODUCT_ID });

    if (statusResult.value === 'active' && expiryResult.value) {
      const expiryDate = new Date(expiryResult.value);
      const now = new Date();

      if (expiryDate > now) {
        this.subscriptionStatus = {
          isActive: true,
          expiryDate,
          productId: productResult.value,
        };
      } else {
        // Subscription expired
        this.subscriptionStatus = { isActive: false };
        await this.clearSubscriptionData();
      }
    } else {
      this.subscriptionStatus = { isActive: false };
    }
  }

  async clearSubscriptionData() {
    const storage = Capacitor.isNativePlatform()
      ? Preferences
      : {
          remove: async ({ key }) => localStorage.removeItem(key),
        };

    await storage.remove({ key: STORAGE_KEYS.SUBSCRIPTION_STATUS });
    await storage.remove({ key: STORAGE_KEYS.PURCHASE_DATE });
    await storage.remove({ key: STORAGE_KEYS.PRODUCT_ID });
    await storage.remove({ key: STORAGE_KEYS.EXPIRY_DATE });
    await storage.remove({ key: STORAGE_KEYS.TRANSACTION_ID });
    await storage.remove({ key: STORAGE_KEYS.ORIGINAL_TRANSACTION_ID });
  }

  getProducts() {
    // Format products for display with v11 API
    const formatted = {};
    for (const [id, product] of Object.entries(this.products)) {
      formatted[id] = {
        id: product.id,
        title: product.title || product.id,
        description: product.description || '',
        price: product.price,
        pricing: { price: product.price },
        valid: product.valid,
        canPurchase: product.canPurchase,
        owned: product.owned,
      };
    }
    return formatted;
  }

  async purchase(productId) {
    if (!this.store) {
      throw new Error('Store not initialized');
    }

    if (!this.isReady()) {
      throw new Error('Subscription service not ready. Please try again.');
    }

    const product = this.store.get(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // For owned products, trigger restore flow instead
    if (product.owned) {
      try {
        await this.restorePurchases();
        // If successful, the purchase is already active
        return product;
      } catch (error) {
        throw new Error('You already own this product. Try using "Restore Purchase" instead.');
      }
    }

    if (!product.canPurchase) {
      throw new Error('Product cannot be purchased at this time');
    }

    // The global .approved() handler in setupEventHandlers will resolve this
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        delete this.pendingPurchases[productId];
        reject(new Error('Purchase timeout'));
      }, 60000);

      // Register this purchase as pending
      // The global .approved() handler will call resolve when the purchase completes
      this.pendingPurchases[productId] = { resolve, reject, timeout };

      // Initiate purchase using v13 API
      try {
        // Create an offer for the product
        const offer = product.getOffer();
        if (!offer) {
          throw new Error('No offer available for this product');
        }

        // Order the offer - v13 returns a promise with error handling
        const orderResult = this.store.order(offer);

        if (orderResult && orderResult.then) {
          orderResult
            .then((error) => {
              if (error && this.pendingPurchases[productId]) {
                const { timeout: pendingTimeout } = this.pendingPurchases[productId];
                clearTimeout(pendingTimeout);
                delete this.pendingPurchases[productId];

                // Check for specific error codes
                if (error.code === window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) {
                  reject(new Error('Purchase cancelled'));
                } else {
                  reject(new Error(error.message || 'Purchase failed'));
                }
              }
            })
            .catch((error) => {
              if (this.pendingPurchases[productId]) {
                const { timeout: pendingTimeout } = this.pendingPurchases[productId];
                clearTimeout(pendingTimeout);
                delete this.pendingPurchases[productId];
                reject(new Error(error.message || 'Purchase failed'));
              }
            });
        }
      } catch (orderError) {
        clearTimeout(timeout);
        delete this.pendingPurchases[productId];
        reject(new Error(`Failed to initiate purchase: ${orderError.message || orderError}`));
      }
    });
  }

  async restorePurchases() {
    if (!this.store) {
      throw new Error('Store not initialized');
    }

    this.restoringPurchases = true;

    try {
      // v13 restore method
      await this.store.restorePurchases();

      // Wait for restore to complete and ownership to update
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Load subscription status from the updated store
      await this.loadSubscriptionStatus();

      return this.subscriptionStatus;
    } finally {
      this.restoringPurchases = false;
    }
  }

  async refreshSubscriptionStatus() {
    // First try to refresh from the store if available
    if (this.store && this.store.ready) {
      await this.store.update();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await this.loadSubscriptionStatus();
    return this.subscriptionStatus;
  }

  isSubscriptionActive() {
    return this.subscriptionStatus?.isActive || false;
  }

  getSubscriptionStatus() {
    return this.subscriptionStatus;
  }

  canAccessPuzzle(puzzleNumber) {
    // Only today's puzzle is free - all archive puzzles require Tandem Puzzle Club membership
    const currentPuzzleNumber = getCurrentPuzzleNumber();

    // Free access to today's puzzle only
    if (puzzleNumber === currentPuzzleNumber) {
      return true;
    }

    // All archive puzzles require subscription
    return this.isSubscriptionActive();
  }

  canAccessPuzzleByDate(dateString) {
    const puzzleNumber = getPuzzleNumberForDate(dateString);
    return this.canAccessPuzzle(puzzleNumber);
  }

  isReady() {
    return this.initState === INIT_STATE.READY;
  }
}

// Export singleton instance
const subscriptionService = new SubscriptionService();
export default subscriptionService;

// Export INIT_STATE for components that need it
export { INIT_STATE };
