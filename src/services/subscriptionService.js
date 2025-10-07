import { Capacitor } from '@capacitor/core';
import { getCurrentPuzzleNumber, getPuzzleNumberForDate } from '@/lib/puzzleNumber';

// Product IDs - must match App Store Connect configuration
const PRODUCTS = {
  BUDDY_MONTHLY: 'com.tandemdaily.app.buddypass',
  BEST_FRIENDS_YEARLY: 'com.tandemdaily.app.bestfriends',
  SOULMATE_LIFETIME: 'com.tandemdaily.app.soulmates',
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
  }

  /**
   * Get current initialization state
   * @returns {string} One of INIT_STATE values
   */
  getInitState() {
    return this.initState;
  }

  /**
   * Check if service is ready for synchronous operations
   * @returns {boolean}
   */
  isReady() {
    return this.initState === INIT_STATE.READY;
  }

  /**
   * Subscribe to initialization state changes
   * @param {Function} callback - Called with new state
   * @returns {Function} Unsubscribe function
   */
  onStateChange(callback) {
    this.stateListeners.push(callback);
    // Immediately call with current state
    callback(this.initState);
    return () => {
      this.stateListeners = this.stateListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all listeners of state change
   * @private
   */
  _notifyStateChange(newState) {
    this.initState = newState;
    this.stateListeners.forEach((callback) => {
      try {
        callback(newState);
      } catch (error) {
        console.error('Error in subscription state listener:', error);
      }
    });
  }

  /**
   * Initialize subscription service
   * Should be called once at app bootstrap
   * @returns {Promise<void>}
   */
  async initialize() {
    // Only initialize once
    if (this.initPromise) {
      return this.initPromise;
    }

    this._notifyStateChange(INIT_STATE.INITIALIZING);
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  /**
   * Force re-initialization of the service
   * Use this when initialization fails and you want to retry
   * @returns {Promise<void>}
   */
  async forceReinitialize() {
    console.log('IAP: Force re-initializing subscription service...');
    this.initPromise = null;
    this.initState = INIT_STATE.NOT_STARTED;
    this.store = null;
    this.products = {};
    this.subscriptionStatus = null;
    return this.initialize();
  }

  async _doInitialize() {
    // Only initialize on native iOS
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      console.log('IAP: Skipping initialization - not on iOS');
      await this.loadSubscriptionStatus();
      this._notifyStateChange(INIT_STATE.READY);
      return;
    }

    try {
      // Check if cordova.js is loaded first
      console.log('IAP: Checking for required files...');
      console.log('IAP: window.cordova exists?', typeof window?.cordova !== 'undefined');
      console.log('IAP: window.CdvPurchase exists?', typeof window?.CdvPurchase !== 'undefined');

      if (!window.cordova) {
        console.error('IAP: CRITICAL - cordova.js not loaded. This is required for IAP to work.');
        console.error('IAP: Make sure cordova.js is included in your HTML');
      }

      // Wait for window to be ready and CdvPurchase to load (max 10 seconds)
      let attempts = 0;
      while (attempts < 20 && (!window.CdvPurchase || !window.CdvPurchase.store)) {
        console.log(`IAP: Waiting for CdvPurchase to be available (attempt ${attempts + 1}/20)`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;
      }

      // Access the global CdvPurchase object that cordova-plugin-purchase v13 provides
      if (typeof window !== 'undefined' && window.CdvPurchase) {
        this.store = window.CdvPurchase.store;

        // Configure verbosity for debugging
        this.store.verbosity = window.CdvPurchase.LogLevel.DEBUG;

        // Log store information
        console.log('IAP: Store object available:', !!this.store);
        console.log('IAP: Platform constants:', {
          APPLE_APPSTORE: window.CdvPurchase.Platform.APPLE_APPSTORE,
          TEST: window.CdvPurchase.Platform.TEST,
        });

        // Register products with platform specification
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
            id: PRODUCTS.SOULMATE_LIFETIME,
            type: window.CdvPurchase.ProductType.NON_CONSUMABLE,
            platform: window.CdvPurchase.Platform.APPLE_APPSTORE,
          },
        ]);

        // Set up event handlers
        this.setupEventHandlers();

        // Initialize the store with Apple App Store platform
        console.log('IAP: Initializing store with Apple App Store platform');
        await this.store.initialize([
          {
            platform: window.CdvPurchase.Platform.APPLE_APPSTORE,
            options: {
              needAppReceipt: true, // Enable receipt collection for validation
              autoRefreshReceipt: true, // Important for TestFlight/Sandbox
            },
          },
        ]);

        console.log('IAP: Store initialized successfully');

        // Wait for products to load with reduced timeout (max 1.6 seconds)
        console.log('IAP: Waiting for products to load...');
        let productLoadAttempts = 0;
        while (productLoadAttempts < 4) {
          await new Promise((resolve) => setTimeout(resolve, 400));

          // Store products for easy access
          const allProducts = this.store.products;
          if (allProducts && allProducts.length > 0) {
            allProducts.forEach((product) => {
              this.products[product.id] = product;
              console.log('IAP: Product loaded:', {
                id: product.id,
                title: product.title,
                description: product.description,
                valid: product.valid,
                canPurchase: product.canPurchase,
                owned: product.owned,
                offers: product.offers?.length || 0,
              });
            });
            break;
          }

          productLoadAttempts++;
          console.log(`IAP: No products loaded yet, attempt ${productLoadAttempts}/4`);
        }

        if (Object.keys(this.products).length === 0) {
          console.warn('IAP: No products loaded after initialization. This may indicate:');
          console.warn('1. Products are still in "Waiting for Review" status in App Store Connect');
          console.warn('2. Bundle ID mismatch between app and App Store Connect');
          console.warn('3. Not signed in with a Sandbox tester account');
          console.warn('4. Need to wait longer for App Store Connect to propagate changes');
        }

        await this.loadSubscriptionStatus();
        this._notifyStateChange(INIT_STATE.READY);

        console.log(
          'IAP: Initialization complete. Products loaded:',
          Object.keys(this.products).length
        );
      } else {
        throw new Error(
          'CdvPurchase not available after waiting - plugin may not be installed correctly'
        );
      }
    } catch (error) {
      console.error('IAP: Failed to initialize store:', error);
      await this.loadSubscriptionStatus();
      this._notifyStateChange(INIT_STATE.FAILED);
    }
  }

  setupEventHandlers() {
    if (!this.store) {
      return;
    }

    // When products are updated
    this.store
      .when()
      .productUpdated((product) => {
        this.products[product.id] = product;
        console.log('IAP: Product updated:', product.id, product);
      })
      .approved((transaction) => {
        console.log('IAP: Purchase approved:', transaction);
        // Verify the transaction
        transaction.verify();
      })
      .verified(async (receipt) => {
        console.log('IAP: Purchase verified locally:', receipt);

        // Validate receipt with our server
        const isValid = await this.validateReceiptWithServer(receipt);

        if (isValid) {
          // Finish the transaction
          receipt.finish();
          // Handle successful purchase
          this.handleSuccessfulPurchase(receipt);
        } else {
          console.error('IAP: Server receipt validation failed');
          // Still finish the transaction to avoid getting stuck
          receipt.finish();
        }
      })
      .finished((transaction) => {
        console.log('IAP: Transaction finished:', transaction);
      })
      .cancelled((transaction) => {
        console.log('IAP: Purchase cancelled:', transaction);
      })
      .failed((transaction) => {
        console.error('IAP: Purchase failed:', transaction);
      });
  }

  async validateReceiptWithServer(receipt) {
    try {
      // Get the app receipt data
      let receiptData = null;

      if (receipt.appStoreReceipt) {
        // For iOS, use the base64 encoded receipt
        receiptData = receipt.appStoreReceipt;
      } else if (receipt.transactionReceipt) {
        // Fallback to transaction receipt
        receiptData = receipt.transactionReceipt;
      }

      if (!receiptData) {
        console.error('IAP: No receipt data available for validation');
        return false;
      }

      // Call our validation API
      const response = await fetch('/api/iap/validate-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptData }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('IAP: Server validation successful:', result);
        // Store the validation result for reference
        if (result.subscriptionInfo && typeof window !== 'undefined') {
          localStorage.setItem(
            'tandem_last_receipt_validation',
            JSON.stringify({
              timestamp: new Date().toISOString(),
              environment: result.environment,
              subscriptionInfo: result.subscriptionInfo,
            })
          );
        }
        return true;
      } else {
        console.error('IAP: Server validation failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('IAP: Error validating receipt with server:', error);
      // In case of network error, allow the purchase to proceed
      // Apple has already validated it locally
      return true;
    }
  }

  async handleSuccessfulPurchase(receipt) {
    const now = new Date().toISOString();
    let expiryDate = null;
    let productId = null;

    // Find the product ID from the receipt
    if (receipt.transactions && receipt.transactions.length > 0) {
      const transaction = receipt.transactions[0];
      productId = transaction.products[0]?.id;
    }

    if (!productId) {
      console.error('IAP: Could not determine product ID from receipt');
      return;
    }

    // Calculate expiry date based on product type
    if (productId === PRODUCTS.BUDDY_MONTHLY) {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 1);
      expiryDate = expiry.toISOString();
    } else if (productId === PRODUCTS.BEST_FRIENDS_YEARLY) {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      expiryDate = expiry.toISOString();
    }
    // Lifetime has no expiry

    // Save subscription status
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_STATUS, 'active');
      localStorage.setItem(STORAGE_KEYS.PURCHASE_DATE, now);
      localStorage.setItem(STORAGE_KEYS.PRODUCT_ID, productId);
      if (expiryDate) {
        localStorage.setItem(STORAGE_KEYS.EXPIRY_DATE, expiryDate);
      }
    }

    this.subscriptionStatus = {
      isActive: true,
      productId: productId,
      purchaseDate: now,
      expiryDate,
    };

    // Notify listeners (if we add any)
    this.notifySubscriptionChange();
  }

  async loadSubscriptionStatus() {
    let status = null;
    let productId = null;
    let purchaseDate = null;
    let expiryDate = null;

    if (typeof window !== 'undefined') {
      status = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_STATUS);
      productId = localStorage.getItem(STORAGE_KEYS.PRODUCT_ID);
      purchaseDate = localStorage.getItem(STORAGE_KEYS.PURCHASE_DATE);
      expiryDate = localStorage.getItem(STORAGE_KEYS.EXPIRY_DATE);
    }

    // Check if subscription is expired
    let isActive = status === 'active';
    if (isActive && expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      isActive = expiry > now;

      // Update status if expired
      if (!isActive && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_STATUS, 'expired');
      }
    }

    this.subscriptionStatus = {
      isActive,
      productId,
      purchaseDate,
      expiryDate,
    };

    return this.subscriptionStatus;
  }

  /**
   * Synchronously check if user is subscribed using cached status
   * NEVER blocks UI - returns immediately
   * @returns {boolean}
   */
  isSubscribed() {
    // If not initialized yet, assume not subscribed
    if (!this.isReady()) {
      return false;
    }

    return this.subscriptionStatus?.isActive || false;
  }

  /**
   * Asynchronously refresh subscription status
   * Use this to update the cache in the background
   * @returns {Promise<boolean>}
   */
  async refreshSubscriptionStatus() {
    await this.loadSubscriptionStatus();
    return this.subscriptionStatus?.isActive || false;
  }

  async purchase(productId) {
    if (!this.isReady()) {
      throw new Error('Subscription service is not ready. Please try again in a moment.');
    }

    if (!this.store) {
      throw new Error(
        'In-app purchases are not available. Please check your network connection and try again.'
      );
    }

    const product = this.products[productId];
    if (!product) {
      console.error('IAP: Product not found:', productId);
      console.error('IAP: Available products:', Object.keys(this.products));

      // Try to re-initialize if no products are loaded
      if (Object.keys(this.products).length === 0) {
        console.log('IAP: No products loaded, attempting to re-initialize...');
        this.initPromise = null;
        this._notifyStateChange(INIT_STATE.NOT_STARTED);
        await this.initialize();

        // Check again after re-initialization
        const productAfterReInit = this.products[productId];
        if (!productAfterReInit) {
          throw new Error(
            'Product not found. This may be due to App Store Connect configuration. Please try again later.'
          );
        }
        return this.purchase(productId);
      }

      throw new Error('Product not found: ' + productId);
    }

    console.log('IAP: Attempting to purchase product:', {
      id: product.id,
      valid: product.valid,
      canPurchase: product.canPurchase,
    });

    // Get the first offer from the product
    const offer = product.offers && product.offers.length > 0 ? product.offers[0] : null;

    if (!offer) {
      throw new Error('No offers available for product: ' + productId);
    }

    return new Promise((resolve, reject) => {
      try {
        // Initiate purchase with the offer
        this.store
          .order(offer)
          .then(() => {
            console.log('IAP: Order initiated for:', productId);
            resolve(true);
          })
          .catch((error) => {
            console.error('IAP: Order failed:', error);
            reject(error);
          });
      } catch (error) {
        console.error('IAP: Failed to initiate purchase:', error);
        reject(error);
      }
    });
  }

  async restorePurchases() {
    if (!this.isReady()) {
      throw new Error('Subscription service is not ready. Please try again in a moment.');
    }

    if (!this.store) {
      throw new Error(
        'In-app purchases are not available. Please check your network connection and try again.'
      );
    }

    console.log('IAP: Starting restore purchases...');

    return new Promise((resolve, reject) => {
      try {
        // Use v13's restorePurchases method
        this.store
          .restorePurchases()
          .then(async () => {
            console.log('IAP: Restore completed');

            // Check if any products are now owned
            let restored = false;

            // Get the latest receipt for validation
            const receipt = this.store.applicationReceipt;
            if (receipt) {
              console.log('IAP: Validating restored purchases with server');
              const isValid = await this.validateReceiptWithServer({ appStoreReceipt: receipt });

              if (isValid) {
                // Check owned products
                Object.values(this.products).forEach((product) => {
                  if (product.owned) {
                    console.log('IAP: Product owned after restore:', product.id);
                    restored = true;
                    // Update local storage with the restored purchase
                    this.handleSuccessfulPurchase({
                      transactions: [
                        {
                          products: [{ id: product.id }],
                        },
                      ],
                    });
                  }
                });
              }
            } else {
              // Fallback to checking product ownership without server validation
              Object.values(this.products).forEach((product) => {
                if (product.owned) {
                  console.log('IAP: Product owned after restore:', product.id);
                  restored = true;
                  // Update local storage with the restored purchase
                  this.handleSuccessfulPurchase({
                    transactions: [
                      {
                        products: [{ id: product.id }],
                      },
                    ],
                  });
                }
              });
            }

            resolve(restored);
          })
          .catch((error) => {
            console.error('IAP: Restore failed:', error);
            reject(error);
          });
      } catch (error) {
        console.error('IAP: Failed to restore purchases:', error);
        reject(error);
      }
    });
  }

  getProducts() {
    return this.products;
  }

  getProductInfo(productId) {
    const product = this.products[productId];
    if (!product) {
      return null;
    }

    // Get pricing from the first offer
    const offer = product.offers && product.offers.length > 0 ? product.offers[0] : null;
    const pricing =
      offer?.pricingPhases && offer.pricingPhases.length > 0 ? offer.pricingPhases[0] : null;

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: pricing?.price || 'N/A',
      currency: pricing?.currency || 'USD',
      canPurchase: product.canPurchase,
    };
  }

  // For UI updates
  subscriptionChangeListeners = [];

  onSubscriptionChange(callback) {
    this.subscriptionChangeListeners.push(callback);
    return () => {
      this.subscriptionChangeListeners = this.subscriptionChangeListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  notifySubscriptionChange() {
    this.subscriptionChangeListeners.forEach((callback) => {
      try {
        callback(this.subscriptionStatus);
      } catch (error) {
        console.error('Error in subscription change listener:', error);
      }
    });
  }

  /**
   * Synchronously check if user can access a puzzle using cached subscription status
   * NEVER blocks UI - returns immediately
   * @param {number|string} identifier - Puzzle number or date string (YYYY-MM-DD)
   * @returns {boolean} True if puzzle is accessible
   */
  canAccessPuzzle(identifier) {
    const isSubscribed = this.isSubscribed();

    // Subscribers can access everything
    if (isSubscribed) {
      return true;
    }

    // Convert identifier to puzzle number if needed
    let puzzleNumber;
    if (typeof identifier === 'number') {
      puzzleNumber = identifier;
    } else if (/^\d+$/.test(identifier)) {
      puzzleNumber = parseInt(identifier);
    } else {
      // If date string provided, convert to number
      puzzleNumber = getPuzzleNumberForDate(identifier);
    }

    const currentNumber = getCurrentPuzzleNumber();

    // Free users get today + last 3 puzzles
    return puzzleNumber >= currentNumber - 3 && puzzleNumber <= currentNumber;
  }

  // Get user's subscription tier name
  getSubscriptionTierName() {
    if (!this.subscriptionStatus?.isActive) {
      return null;
    }

    switch (this.subscriptionStatus.productId) {
      case PRODUCTS.BUDDY_MONTHLY:
        return 'Buddy Pass';
      case PRODUCTS.BEST_FRIENDS_YEARLY:
        return 'Best Friends';
      case PRODUCTS.SOULMATE_LIFETIME:
        return 'Soulmates';
      default:
        return null;
    }
  }
}

// Create singleton instance
const subscriptionService = new SubscriptionService();

// Export init states for component use
export { INIT_STATE };
export default subscriptionService;
