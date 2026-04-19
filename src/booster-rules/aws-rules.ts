/** AWS / cloud quick reference rules. */
import { BoosterRule } from './types';

const m = (i: string, p: RegExp) => i.match(p);

const REGIONS: Record<string, string> = {
  'us-east-1': 'N. Virginia', 'us-east-2': 'Ohio', 'us-west-1': 'N. California', 'us-west-2': 'Oregon',
  'eu-west-1': 'Ireland', 'eu-west-2': 'London', 'eu-west-3': 'Paris', 'eu-central-1': 'Frankfurt',
  'eu-north-1': 'Stockholm', 'eu-south-1': 'Milan',
  'ap-northeast-1': 'Tokyo', 'ap-northeast-2': 'Seoul', 'ap-northeast-3': 'Osaka',
  'ap-southeast-1': 'Singapore', 'ap-southeast-2': 'Sydney', 'ap-south-1': 'Mumbai',
  'sa-east-1': 'São Paulo', 'ca-central-1': 'Canada', 'me-south-1': 'Bahrain',
  'af-south-1': 'Cape Town',
};

const awsRegion: BoosterRule = {
  name: 'aws_region',
  test: (i) => /^aws\s+region\s+([a-z0-9-]+)$/i.test(i),
  resolve: (i) => REGIONS[m(i, /([a-z0-9-]+)$/i)![1].toLowerCase()] ?? 'unknown',
};

const cfRegion: BoosterRule = {
  name: 'cloudflare_region',
  test: (i) => /^(?:cf|cloudflare)\s+(?:colo\s+)?([A-Z]{3})$/i.test(i),
  resolve: (i) => {
    const c = m(i, /([A-Za-z]{3})$/)![1].toUpperCase();
    const map: Record<string, string> = {
      LHR: 'London', JFK: 'New York', LAX: 'Los Angeles', NRT: 'Tokyo',
      SIN: 'Singapore', SYD: 'Sydney', FRA: 'Frankfurt', AMS: 'Amsterdam',
      CDG: 'Paris', MAD: 'Madrid', GRU: 'São Paulo', YYZ: 'Toronto',
      DFW: 'Dallas', SEA: 'Seattle', SJC: 'San Jose', ORD: 'Chicago',
      MIA: 'Miami', ATL: 'Atlanta', BOM: 'Mumbai', HKG: 'Hong Kong',
      ICN: 'Seoul', DXB: 'Dubai', JNB: 'Johannesburg',
    };
    return map[c] ?? 'unknown';
  },
};

const portCommon: BoosterRule = {
  name: 'aws_service_port',
  test: (i) => /^aws\s+default\s+port\s+(\w+)/i.test(i),
  resolve: (i) => {
    const map: Record<string, string> = {
      rds: '5432 (Postgres) / 3306 (MySQL)', elasticache: '6379',
      memcached: '11211', dynamodb: '8000', dax: '8111',
      neptune: '8182', documentdb: '27017',
    };
    return map[m(i, /(\w+)$/)![1].toLowerCase()] ?? 'unknown';
  },
};

const httpMethod: BoosterRule = {
  name: 'rest_method',
  test: (i) => /^(?:rest\s+)?method\s+for\s+(create|read|update|delete|list)$/i.test(i),
  resolve: (i) => {
    const map: Record<string, string> = { create: 'POST', read: 'GET', update: 'PUT or PATCH', delete: 'DELETE', list: 'GET' };
    return map[m(i, /(create|read|update|delete|list)$/i)![1].toLowerCase()];
  },
};

const httpVerbExpand: BoosterRule = {
  name: 'http_verb_expand',
  test: (i) => /^(?:expand\s+|what\s+is\s+)?http\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)$/i.test(i),
  resolve: (i) => {
    const map: Record<string, string> = {
      GET: 'safe, idempotent — retrieve resource',
      POST: 'create / submit, NOT idempotent',
      PUT: 'replace resource, idempotent',
      PATCH: 'partial update, NOT necessarily idempotent',
      DELETE: 'remove resource, idempotent',
      HEAD: 'GET headers only',
      OPTIONS: 'list allowed methods (CORS preflight)',
      TRACE: 'echo request for debugging',
      CONNECT: 'establish tunnel (HTTPS via proxy)',
    };
    return map[m(i, /(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)/i)![1].toUpperCase()];
  },
};

const dnsRecord: BoosterRule = {
  name: 'dns_record_type',
  test: (i) => /^dns\s+(?:record\s+)?(A|AAAA|CNAME|MX|TXT|NS|SOA|SRV|PTR|CAA)$/i.test(i),
  resolve: (i) => {
    const map: Record<string, string> = {
      A: 'IPv4 address', AAAA: 'IPv6 address', CNAME: 'alias to another hostname',
      MX: 'mail exchange', TXT: 'arbitrary text (SPF, DKIM, verification)',
      NS: 'authoritative name server', SOA: 'start of authority',
      SRV: 'service location', PTR: 'reverse DNS', CAA: 'cert authority authorization',
    };
    return map[m(i, /\b(AAAA|CNAME|TXT|MX|NS|SOA|SRV|PTR|CAA|A)\b\s*$/i)![1].toUpperCase()];
  },
};

export const awsRules: BoosterRule[] = [
  awsRegion, cfRegion, portCommon, httpMethod, httpVerbExpand, dnsRecord,
];
