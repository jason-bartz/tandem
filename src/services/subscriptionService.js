import { Capacitor } from '@capacitor/core';

// Product IDs - must match App Store Connect configuration
const PRODUCTS = {
  BUDDY_MONTHLY: 'com.tandemdaily.app.buddy',
  BEST_FRIENDS_YEARLY: 'com.tandemdaily.app.bestfriends',
  SOULMATE_LIFETIME: 'com.tandemdaily.app.soulmate'
};

// Storage keys
const STORAGE_KEYS = {
  SUBSCRIPTION_STATUS: 'tandem_subscription_status',
  PURCHASE_DATE: 'tandem_purchase_date',
  PRODUCT_ID: 'tandem_product_id',
  EXPIRY_DATE: 'tandem_expiry_date'
};

class SubscriptionService {
  constructor() {
    this.store = null;
    this.products = {};
    this.isInitialized = false;
    this.subscriptionStatus = null;
    this.initPromise = null;
  }

  async initialize() {
    // Only initialize once
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    // Only initialize on native iOS
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      console.log('IAP: Skipping initialization - not on iOS');
      this.isInitialized = true;
      await this.loadSubscriptionStatus();
      return;
    }

    try {
      // Dynamic import to avoid errors on web
      const { InAppPurchase2 } = await import('@awesome-cordova-plugins/in-app-purchase-2');
      this.store = InAppPurchase2;

      // Configure store
      this.store.verbosity = this.store.DEBUG;

      // Register products
      this.store.register([
        {
          id: PRODUCTS.BUDDY_MONTHLY,
          type: this.store.PAID_SUBSCRIPTION
        },
        {
          id: PRODUCTS.BEST_FRIENDS_YEARLY,
          type: this.store.PAID_SUBSCRIPTION
        },
        {
          id: PRODUCTS.SOULMATE_LIFETIME,
          type: this.store.NON_CONSUMABLE
        }
      ]);

      // Set up event handlers
      this.setupEventHandlers();

      // Refresh store
      await this.store.refresh();

      this.isInitialized = true;
      await this.loadSubscriptionStatus();

      console.log('IAP: Store initialized successfully');
    } catch (error) {
      console.error('IAP: Failed to initialize store:', error);
      this.isInitialized = true; // Still mark as initialized to prevent blocking
      await this.loadSubscriptionStatus();
    }
  }

  setupEventHandlers() {
    if (!this.store) return;

    // When product is updated
    this.store.when('product').updated((product) => {
      this.products[product.id] = product;
      console.log('IAP: Product updated:', product.id, product.state);
    });

    // When purchase is approved
    this.store.when('product').approved((product) => {
      console.log('IAP: Purchase approved:', product.id);
      product.finish();
      this.handleSuccessfulPurchase(product);
    });

    // When purchase is cancelled
    this.store.when('product').cancelled((product) => {
      console.log('IAP: Purchase cancelled:', product.id);
    });

    // When purchase fails
    this.store.when('product').error((error) => {
      console.error('IAP: Purchase error:', error);
    });
  }

  async handleSuccessfulPurchase(product) {
    const now = new Date().toISOString();
    let expiryDate = null;

    // Calculate expiry date based on product type
    if (product.id === PRODUCTS.BUDDY_MONTHLY) {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 1);
      expiryDate = expiry.toISOString();
    } else if (product.id === PRODUCTS.BEST_FRIENDS_YEARLY) {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      expiryDate = expiry.toISOString();
    }
    // Lifetime has no expiry

    // Save subscription status
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_STATUS, 'active');
      localStorage.setItem(STORAGE_KEYS.PURCHASE_DATE, now);
      localStorage.setItem(STORAGE_KEYS.PRODUCT_ID, product.id);
      if (expiryDate) {
        localStorage.setItem(STORAGE_KEYS.EXPIRY_DATE, expiryDate);
      }
    }

    this.subscriptionStatus = {
      isActive: true,
      productId: product.id,
      purchaseDate: now,
      expiryDate
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
      expiryDate
    };

    return this.subscriptionStatus;
  }

  async isSubscribed() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Reload status to check for expiry
    await this.loadSubscriptionStatus();
    return this.subscriptionStatus?.isActive || false;
  }

  async purchase(productId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.store) {
      throw new Error('In-app purchases are not available');
    }

    const product = this.products[productId];
    if (!product) {
      throw new Error('Product not found: ' + productId);
    }

    if (!product.canPurchase) {
      throw new Error('Product cannot be purchased');
    }

    return new Promise((resolve, reject) => {
      // Set up one-time handlers for this purchase
      const approved = this.store.once(productId).approved(() => {
        resolve(true);
      });

      const cancelled = this.store.once(productId).cancelled(() => {
        reject(new Error('Purchase cancelled'));
      });

      const error = this.store.once(productId).error((err) => {
        reject(err);
      });

      // Initiate purchase
      this.store.order(productId);
    });
  }

  async restorePurchases() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.store) {
      throw new Error('In-app purchases are not available');
    }

    return new Promise((resolve, reject) => {
      let restored = false;

      // Check each product for owned status after refresh
      const checkProducts = () => {
        for (const productId of Object.keys(PRODUCTS)) {
          const product = this.products[PRODUCTS[productId]];
          if (product && product.owned) {
            this.handleSuccessfulPurchase(product);
            restored = true;
          }
        }
        resolve(restored);
      };

      // Refresh to get latest purchase info
      this.store.refresh().then(() => {
        setTimeout(checkProducts, 500); // Give store time to update
      }).catch(reject);
    });
  }

  getProducts() {
    return this.products;
  }

  getProductInfo(productId) {
    const product = this.products[productId];
    if (!product) return null;

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      currency: product.currency,
      canPurchase: product.canPurchase
    };
  }

  // For UI updates
  subscriptionChangeListeners = [];

  onSubscriptionChange(callback) {
    this.subscriptionChangeListeners.push(callback);
    return () => {
      this.subscriptionChangeListeners = this.subscriptionChangeListeners.filter(cb => cb !== callback);
    };
  }

  notifySubscriptionChange() {
    this.subscriptionChangeListeners.forEach(callback => {
      try {
        callback(this.subscriptionStatus);
      } catch (error) {
        console.error('Error in subscription change listener:', error);
      }
    });
  }

  // Check if archive puzzle is accessible
  async canAccessPuzzle(puzzleDate) {
    const isSubscribed = await this.isSubscribed();

    // Subscribers can access everything
    if (isSubscribed) return true;

    // Free users get today + last 5 puzzles
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const puzzle = new Date(puzzleDate);
    puzzle.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - puzzle) / (1000 * 60 * 60 * 24));

    // Today's puzzle or within last 5 days
    return daysDiff <= 5;
  }

  // Get user's subscription tier name
  getSubscriptionTierName() {
    if (!this.subscriptionStatus?.isActive) return null;

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
export default subscriptionService;