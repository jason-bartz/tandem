/**
 * Web Subscription Service
 * Everything is free on web — all methods return active/accessible.
 * Maintains interface compatibility with iOS subscription service.
 */

const INIT_STATE = {
  NOT_STARTED: 'NOT_STARTED',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  FAILED: 'FAILED',
};

class WebSubscriptionService {
  constructor() {
    this.initState = INIT_STATE.READY;
  }

  getInitState() {
    return this.initState;
  }

  onStateChange(_callback) {
    return () => {};
  }

  async initialize() {
    this.initState = INIT_STATE.READY;
  }

  async forceReinitialize() {
    this.initState = INIT_STATE.READY;
  }

  async loadSubscriptionStatus() {}

  async refreshSubscriptionStatus() {
    return { isActive: true };
  }

  isSubscriptionActive() {
    return true;
  }

  getSubscriptionStatus() {
    return {
      isActive: true,
      productId: 'free',
      expiryDate: null,
      cancelAtPeriodEnd: false,
    };
  }

  canAccessPuzzle() {
    return true;
  }

  canAccessPuzzleByDate() {
    return true;
  }

  isReady() {
    return true;
  }

  getProducts() {
    return {};
  }
}

const webSubscriptionService = new WebSubscriptionService();
export default webSubscriptionService;

export { INIT_STATE };
