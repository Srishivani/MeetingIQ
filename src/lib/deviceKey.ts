let cachedDeviceKey: string | null = null;

export function getDeviceKey(): string {
  if (cachedDeviceKey) return cachedDeviceKey;
  
  let key = localStorage.getItem("convoiq_device_key");
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem("convoiq_device_key", key);
  }
  cachedDeviceKey = key;
  return key;
}
