import { Capacitor } from '@capacitor/core';
import { getCurrentPuzzleNumber, getPuzzleNumberForDate } from '@/lib/puzzleNumber';

// Product IDs - must match App Store Connect configuration
const PRODUCTS = {
  BUDDY_MONTHLY: 'com.tandemdaily.app.buddypass',
  BEST_FRIENDS_YEARLY: 'com.tandemdaily.app.bestfriends',
  SOULMATES_LIFETIME: 'com.tandemdaily.app.soulmates',
};

// Storage keys
const STORAGE_KEYS = {
  SUBSCRIPTION_STATUS: 'tandem_subscription_status',
  PURCHASE_DATE: 'tandem_purchase_date',
  PRODUCT_ID: 'tandem_product_id',
  EXPIRY_DATE: 'tandem_expiry_date',
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
      return;
    }

    // Only reset if not ready
    this.initPromise = null;
    this.initState = INIT_STATE.NOT_STARTED;
    this.products = {};
    this.subscriptionStatus = null;

    return this.initialize();
  }

  async _doInitialize() {
    // Only initialize on native iOS
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

      // Initialize the store with v13 API
      this.store = window.CdvPurchase.store;

      // Configure store for v13
      this.store.verbosity = window.CdvPurchase.LogLevel.ERROR;

      // Set validator URL if you have one (optional)
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

      // Set up event handlers for v13
      this.setupEventHandlers();

      // Initialize the store
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

      await this.loadSubscriptionStatus();
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
    this.store.when().approved((transaction) => {
      // Finish the transaction
      transaction.finish();

      // Handle success for each product in the transaction
      if (transaction.products && transaction.products.length > 0) {
        const productId = transaction.products[0].id;

        // Check if we have a pending purchase for this product
        if (this.pendingPurchases && this.pendingPurchases[productId]) {
          const { resolve, timeout } = this.pendingPurchases[productId];
          clearTimeout(timeout);
          delete this.pendingPurchases[productId];
          resolve(transaction.products[0]);
        }

        // Also handle the purchase success for storage
        this.handlePurchaseSuccess(transaction.products[0]);
      }
    });

    // When a transaction is verified
    this.store.when().verified(() => {
      // Receipt verified
    });

    // When a transaction is finished
    this.store.when().finished(() => {
      // Transaction finished
    });

    // Handle receipts updated
    this.store.when().receiptUpdated(() => {
      // Receipt updated
    });

    // Handle unverified receipts
    this.store.when().unverified(() => {
      // Unverified receipt
    });
  }

  async handlePurchaseSuccess(product) {
    // Update local storage
    const purchaseDate = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_STATUS, 'active');
    localStorage.setItem(STORAGE_KEYS.PURCHASE_DATE, purchaseDate);
    localStorage.setItem(STORAGE_KEYS.PRODUCT_ID, product.id);

    // Set expiry date based on product type
    if (product.id === PRODUCTS.SOULMATES_LIFETIME) {
      // Lifetime purchase - set expiry far in future
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 100);
      localStorage.setItem(STORAGE_KEYS.EXPIRY_DATE, expiryDate.toISOString());
    } else {
      const expiryDate = new Date();
      if (product.id === PRODUCTS.BUDDY_MONTHLY) {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (product.id === PRODUCTS.BEST_FRIENDS_YEARLY) {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }
      localStorage.setItem(STORAGE_KEYS.EXPIRY_DATE, expiryDate.toISOString());
    }

    // Force refresh the store to update product ownership
    if (this.store) {
      await this.store.update();

      // Wait a bit for the update to propagate
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Update subscription status
    await this.loadSubscriptionStatus();
  }

  async loadSubscriptionStatus() {
    // Check store for owned products
    if (this.store && this.store.ready) {
      const monthly = this.store.get(PRODUCTS.BUDDY_MONTHLY);
      const yearly = this.store.get(PRODUCTS.BEST_FRIENDS_YEARLY);
      const lifetime = this.store.get(PRODUCTS.SOULMATES_LIFETIME);

      // Determine which subscription is actually active using priority:
      // 1. Soulmates (lifetime) - highest priority
      // 2. Best Friends (yearly) - mid priority
      // 3. Buddy Pass (monthly) - lowest priority
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
          // Only yearly owned
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
        return;
      }
    }

    // Check local storage as fallback
    const status = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_STATUS);
    const expiryDateStr = localStorage.getItem(STORAGE_KEYS.EXPIRY_DATE);
    const productId = localStorage.getItem(STORAGE_KEYS.PRODUCT_ID);

    if (status === 'active' && expiryDateStr) {
      const expiryDate = new Date(expiryDateStr);
      const now = new Date();

      if (expiryDate > now) {
        this.subscriptionStatus = {
          isActive: true,
          expiryDate,
          productId,
        };
      } else {
        // Subscription expired
        this.subscriptionStatus = { isActive: false };
        this.clearSubscriptionData();
      }
    } else {
      this.subscriptionStatus = { isActive: false };
    }
  }

  clearSubscriptionData() {
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_STATUS);
    localStorage.removeItem(STORAGE_KEYS.PURCHASE_DATE);
    localStorage.removeItem(STORAGE_KEYS.PRODUCT_ID);
    localStorage.removeItem(STORAGE_KEYS.EXPIRY_DATE);
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

    // Set up promise for purchase completion using v13 API
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

        // Handle the order promise (v13 API)
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

    // v13 restore method
    await this.store.restorePurchases();

    // Wait a moment for restore to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await this.loadSubscriptionStatus();
    return this.subscriptionStatus;
  }

  async refreshSubscriptionStatus() {
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
    // Always allow access to the current puzzle and last 3 days (4 days total)
    const currentPuzzleNumber = getCurrentPuzzleNumber();
    const oldestFreePuzzle = currentPuzzleNumber - 3; // current day + 3 days back = 4 days total

    if (puzzleNumber >= oldestFreePuzzle && puzzleNumber <= currentPuzzleNumber) {
      return true;
    }

    // Check subscription status for older puzzles
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
