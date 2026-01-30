/**
 * Discord Webhook Utility
 *
 * Sends notifications to Discord channels via webhooks.
 */
import logger from '@/lib/logger';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

/**
 * Send a message to Discord via webhook
 * @param {Object} options - Message options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description
 * @param {string} options.color - Hex color (without #) - defaults based on type
 * @param {Array} options.fields - Array of {name, value, inline} objects
 * @param {string} options.type - 'success' | 'warning' | 'error' | 'info'
 */
export async function sendDiscordNotification({
  title,
  description,
  color,
  fields = [],
  type = 'info',
}) {
  if (!DISCORD_WEBHOOK_URL) {
    logger.warn('DISCORD_WEBHOOK_URL not configured, skipping notification');
    return;
  }

  // Color mapping based on type
  const colorMap = {
    success: 0x22c55e, // green
    warning: 0xf59e0b, // amber
    error: 0xef4444, // red
    info: 0x3b82f6, // blue
  };

  const embedColor = color ? parseInt(color, 16) : colorMap[type] || colorMap.info;

  const payload = {
    embeds: [
      {
        title,
        description,
        color: embedColor,
        fields: fields.map((f) => ({
          name: f.name,
          value: f.value,
          inline: f.inline ?? true,
        })),
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Tandem Daily',
        },
      },
    ],
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error('Discord webhook failed', { status: response.status, body: text });
    }
  } catch (error) {
    logger.error('Failed to send Discord notification', error);
  }
}

/**
 * Send a payment success notification
 */
export async function notifyPaymentSuccess({ amount, currency, customerEmail, tier, type }) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount / 100);

  await sendDiscordNotification({
    title: '💰 New Payment Received!',
    description: `A ${type || 'payment'} was successful`,
    type: 'success',
    fields: [
      { name: 'Amount', value: formattedAmount },
      { name: 'Tier', value: tier || 'Unknown' },
      { name: 'Customer', value: customerEmail || 'Unknown' },
    ],
  });
}

/**
 * Send a new subscription notification
 */
export async function notifyNewSubscription({ customerEmail, tier, type }) {
  await sendDiscordNotification({
    title: '🎉 New Subscription!',
    description: `A new ${type || 'subscription'} was created`,
    type: 'success',
    fields: [
      { name: 'Tier', value: tier || 'Unknown' },
      { name: 'Customer', value: customerEmail || 'Unknown' },
      { name: 'Type', value: type || 'Subscription' },
    ],
  });
}

/**
 * Send a subscription cancelled notification
 */
export async function notifySubscriptionCancelled({ customerEmail, tier }) {
  await sendDiscordNotification({
    title: '😢 Subscription Cancelled',
    description: 'A subscription was cancelled',
    type: 'warning',
    fields: [
      { name: 'Tier', value: tier || 'Unknown' },
      { name: 'Customer', value: customerEmail || 'Unknown' },
    ],
  });
}

/**
 * Send a payment failed notification
 */
export async function notifyPaymentFailed({ amount, currency, customerEmail, reason }) {
  const formattedAmount = amount
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(amount / 100)
    : 'Unknown';

  await sendDiscordNotification({
    title: '❌ Payment Failed',
    description: 'A payment attempt failed',
    type: 'error',
    fields: [
      { name: 'Amount', value: formattedAmount },
      { name: 'Customer', value: customerEmail || 'Unknown' },
      { name: 'Reason', value: reason || 'Unknown' },
    ],
  });
}
