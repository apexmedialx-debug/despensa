const webPush = require('web-push');

let initialized = false;

function init() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[webPush] VAPID keys not set — push notifications disabled');
    return;
  }
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@pantry.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  initialized = true;
}

async function sendPushToUser(subscriptionJson, payload) {
  if (!initialized) return;
  try {
    const subscription = JSON.parse(subscriptionJson);
    await webPush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error('[webPush] Failed to send push:', err.message);
  }
}

module.exports = { init, sendPushToUser };
