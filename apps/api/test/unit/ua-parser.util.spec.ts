import { parseUserAgent } from '../../src/modules/site-analytics/ua-parser.util';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36';
const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0';

describe('parseUserAgent', () => {
  it('parses a desktop Chrome/Windows user agent', () => {
    expect(parseUserAgent(CHROME_WINDOWS)).toEqual({ device: 'desktop', browser: 'Chrome', os: 'Windows' });
  });

  it('parses a desktop Safari/macOS user agent', () => {
    expect(parseUserAgent(SAFARI_MAC)).toEqual({ device: 'desktop', browser: 'Safari', os: 'macOS' });
  });

  it('parses a desktop Firefox/Linux user agent', () => {
    expect(parseUserAgent(FIREFOX_LINUX)).toEqual({ device: 'desktop', browser: 'Firefox', os: 'Linux' });
  });

  it('parses a mobile iPhone Safari/iOS user agent', () => {
    expect(parseUserAgent(IPHONE_SAFARI)).toEqual({ device: 'mobile', browser: 'Safari', os: 'iOS' });
  });

  it('parses a mobile Android Chrome user agent', () => {
    expect(parseUserAgent(ANDROID_CHROME)).toEqual({ device: 'mobile', browser: 'Chrome', os: 'Android' });
  });

  it('parses a tablet iPad Safari user agent (despite the "Mobile/15E148" token)', () => {
    expect(parseUserAgent(IPAD_SAFARI)).toEqual({ device: 'tablet', browser: 'Safari', os: 'iOS' });
  });

  it('distinguishes Edge from Chrome despite sharing the Chrome UA token', () => {
    expect(parseUserAgent(EDGE_WINDOWS)).toEqual({ device: 'desktop', browser: 'Edge', os: 'Windows' });
  });

  it('returns "Unknown"/"other" for a missing or empty user agent', () => {
    expect(parseUserAgent(undefined)).toEqual({ device: 'other', browser: 'Unknown', os: 'Unknown' });
    expect(parseUserAgent('')).toEqual({ device: 'other', browser: 'Unknown', os: 'Unknown' });
    expect(parseUserAgent(null)).toEqual({ device: 'other', browser: 'Unknown', os: 'Unknown' });
  });

  it('falls back to "Other" for an unrecognized browser/os', () => {
    const result = parseUserAgent('SomeRandomBot/1.0');
    expect(result.browser).toBe('Other');
    expect(result.os).toBe('Other');
  });
});
