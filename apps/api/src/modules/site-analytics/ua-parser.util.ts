export interface ParsedUserAgent {
  device: 'desktop' | 'mobile' | 'tablet' | 'other';
  browser: string;
  os: string;
}

/**
 * Small, dependency-free User-Agent parser — good enough for analytics buckets
 * (not meant to be exhaustive like `ua-parser-js`).
 */
export function parseUserAgent(ua: string | undefined | null): ParsedUserAgent {
  const value = (ua ?? '').trim();
  if (!value) return { device: 'other', browser: 'Unknown', os: 'Unknown' };

  return { device: parseDevice(value), browser: parseBrowser(value), os: parseOs(value) };
}

function parseDevice(ua: string): ParsedUserAgent['device'] {
  // iPadOS 13+ Safari sends a desktop-style UA that still contains "Mobile/15E148",
  // so tablet keywords must win before the generic mobile check runs.
  if (/ipad|tablet|kindle|playbook|silk/i.test(ua)) return 'tablet';
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|windows phone|blackberry/i.test(ua)) return 'mobile';
  if (/mozilla|chrome|safari|firefox|edge|opera|msie|trident/i.test(ua)) return 'desktop';
  return 'other';
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) return 'Safari';
  if (/msie|trident/i.test(ua)) return 'Internet Explorer';
  return 'Other';
}

function parseOs(ua: string): string {
  if (/windows phone/i.test(ua)) return 'Windows Phone';
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}
