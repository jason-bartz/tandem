// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_LOG_LEVEL = 'ERROR'

// Mock Capacitor for testing
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
  },
  CapacitorHttp: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    keys: jest.fn(),
  },
}))

jest.mock('@capacitor/share', () => ({
  Share: {
    share: jest.fn(),
  },
}))

jest.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: jest.fn(),
    notification: jest.fn(),
    selectionChanged: jest.fn(),
    selectionStart: jest.fn(),
    selectionEnd: jest.fn(),
    vibrate: jest.fn(),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0))
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id))