/** Developer-utility rules — JWT decode (no verify), URL parse, MIME, etc. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const jwtDecode: BoosterRule = {
  name: 'jwt_decode',
  test: (i) => /^(?:decode\s+)?jwt\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i.test(i),
  resolve: (i) => {
    const tok = m(i, /([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)![1];
    const [h, p] = tok.split('.').slice(0, 2).map((s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'));
    return JSON.stringify({ header: JSON.parse(h), payload: JSON.parse(p) }, null, 2);
  },
};

const urlParse: BoosterRule = {
  name: 'url_parse',
  test: (i) => /^parse\s+url\s+(https?:\/\/\S+)/i.test(i),
  resolve: (i) => {
    const u = new URL(m(i, /(https?:\/\/\S+)/)![1]);
    return JSON.stringify({ host: u.hostname, port: u.port, path: u.pathname, query: Object.fromEntries(u.searchParams), hash: u.hash }, null, 2);
  },
};

const queryParse: BoosterRule = {
  name: 'query_parse',
  test: (i) => /^parse\s+query\s*string\s+(.+)/i.test(i),
  resolve: (i) => {
    const s = m(i, /^parse\s+query\s*string\s+(.+)/i)![1].replace(/^\?/, '');
    return JSON.stringify(Object.fromEntries(new URLSearchParams(s)), null, 2);
  },
};

const queryBuild: BoosterRule = {
  name: 'query_build',
  test: (i) => /^build\s+query\s*string\s+(\{.+\})/i.test(i),
  resolve: (i) => new URLSearchParams(JSON.parse(m(i, /(\{.+\})/)![1])).toString(),
};

const mimeFromExt: BoosterRule = {
  name: 'mime_from_ext',
  test: (i) => /^mime(?:\s+type)?\s+(?:for|of)\s+\.?([a-z0-9]{1,6})/i.test(i),
  resolve: (i) => {
    const ext = m(i, /\.?([a-z0-9]{1,6})$/i)![1].toLowerCase();
    const map: Record<string, string> = {
      json: 'application/json', html: 'text/html', css: 'text/css', js: 'application/javascript',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml',
      pdf: 'application/pdf', zip: 'application/zip', txt: 'text/plain', csv: 'text/csv',
      xml: 'application/xml', mp4: 'video/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', webm: 'video/webm',
      md: 'text/markdown', yml: 'application/yaml', yaml: 'application/yaml', toml: 'application/toml',
    };
    return map[ext] ?? 'application/octet-stream';
  },
};

const httpStatus: BoosterRule = {
  name: 'http_status',
  test: (i) => /^http\s+(?:status\s+)?(\d{3})/i.test(i),
  resolve: (i) => {
    const code = parseInt(m(i, /(\d{3})/)![1], 10);
    const map: Record<number, string> = {
      200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently',
      302: 'Found', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
      400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
      405: 'Method Not Allowed', 409: 'Conflict', 410: 'Gone', 413: 'Payload Too Large',
      418: "I'm a teapot", 422: 'Unprocessable Entity', 429: 'Too Many Requests',
      500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
    };
    return map[code] ?? 'Unknown';
  },
};

const semverBump: BoosterRule = {
  name: 'semver_bump',
  test: (i) => /^bump\s+(major|minor|patch)\s+(?:of\s+)?(\d+\.\d+\.\d+)/i.test(i),
  resolve: (i) => {
    const mm = m(i, /^bump\s+(major|minor|patch)\s+(?:of\s+)?(\d+)\.(\d+)\.(\d+)/i)!;
    let [maj, min, pat] = [mm[2], mm[3], mm[4]].map(Number);
    if (mm[1] === 'major') { maj++; min = 0; pat = 0; }
    else if (mm[1] === 'minor') { min++; pat = 0; }
    else pat++;
    return `${maj}.${min}.${pat}`;
  },
};

const cidrInfo: BoosterRule = {
  name: 'cidr_info',
  test: (i) => /^cidr\s+(?:info\s+)?(\d+\.\d+\.\d+\.\d+\/\d+)/i.test(i),
  resolve: (i) => {
    const [ip, bitsStr] = m(i, /(\d+\.\d+\.\d+\.\d+)\/(\d+)/)!.slice(1);
    const bits = parseInt(bitsStr, 10);
    const total = 2 ** (32 - bits);
    return `network: ${ip}/${bits}, hosts: ${Math.max(0, total - 2)}, total: ${total}`;
  },
};

const portInfo: BoosterRule = {
  name: 'port_info',
  test: (i) => /^port\s+(\d{1,5})/i.test(i),
  resolve: (i) => {
    const map: Record<number, string> = {
      20: 'FTP-data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
      80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 465: 'SMTPS',
      993: 'IMAPS', 995: 'POP3S', 3306: 'MySQL', 5432: 'PostgreSQL', 6379: 'Redis',
      8080: 'HTTP-alt', 8443: 'HTTPS-alt', 27017: 'MongoDB',
    };
    const port = parseInt(m(i, /(\d{1,5})/)![1], 10);
    return map[port] ?? 'unassigned';
  },
};

const userAgent: BoosterRule = {
  name: 'user_agent_class',
  test: (i) => /^classify\s+user[-\s]?agent\s+(.+)/i.test(i),
  resolve: (i) => {
    const ua = m(i, /^classify\s+user[-\s]?agent\s+(.+)/i)![1];
    if (/bot|crawler|spider/i.test(ua)) return 'bot';
    if (/iPhone|iPad|iOS/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Macintosh/i.test(ua)) return 'mac';
    if (/Windows/i.test(ua)) return 'windows';
    if (/Linux/i.test(ua)) return 'linux';
    return 'unknown';
  },
};

export const devRules: BoosterRule[] = [
  jwtDecode, urlParse, queryParse, queryBuild,
  mimeFromExt, httpStatus, semverBump, cidrInfo,
  portInfo, userAgent,
];
