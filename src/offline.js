let registration = null, installPrompt = null;
let status = 'idle', onChange = () => {};
const available = 'serviceWorker' in navigator && window.isSecureContext;
export const offlineState = () => ({ available, status, installable: !!installPrompt, update: !!registration?.waiting });
export async function watchOffline(callback) {
  onChange = callback;
  if (!available) return;
  try {
    registration = await navigator.serviceWorker.getRegistration('./');
    if (registration?.active) { status = 'ready'; observe(registration); registration.update().catch(() => {}); }
  } catch { /* Optional browser feature. */ }
  onChange();
}
function observe(reg) {
  reg.addEventListener('updatefound', () => {
    reg.installing?.addEventListener('statechange', () => onChange());
  });
}
export async function enableOffline() {
  if (!available || status === 'loading') return;
  status = 'loading'; onChange();
  try {
    registration = await navigator.serviceWorker.register('./sw.js', { scope:'./', updateViaCache:'none' });
    observe(registration);
    const worker = registration.installing || registration.waiting;
    if (worker && worker.state !== 'installed' && worker.state !== 'activated') await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout')), 30000);
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' || worker.state === 'activated') { clearTimeout(timeout); resolve(); }
        if (worker.state === 'redundant') { clearTimeout(timeout); reject(new Error('install failed')); }
      });
    });
    status = 'ready';
  } catch { status = 'error'; }
  onChange();
}
export function updateOffline() {
  if (!registration?.waiting) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {once:true});
  registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
}
export async function checkOfflineUpdate() {
  if (!registration) return false;
  await registration.update();
  onChange();
  return !!(registration.waiting || registration.installing);
}
export async function installApp() {
  if (!installPrompt) return 'manual';
  const prompt = installPrompt; installPrompt = null;
  await prompt.prompt(); const choice = await prompt.userChoice; onChange(); return choice.outcome;
}
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; onChange(); });
window.addEventListener('appinstalled', () => { installPrompt = null; onChange(); });
