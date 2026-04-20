import { NextResponse } from 'next/server';

// English-native countries — no toggle button needed
export const dynamic = 'force-dynamic';
const ENGLISH_COUNTRIES = new Set([
  'US','GB','AU','CA','NZ','IE','ZA','SG','PH','IN','PK','NG','GH','KE','JM','TT',
  'BB','BS','BZ','FJ','PG','WS','SB','VU','TO','KI','BW','ZW','ZM','MW','SL','LR',
  'GM','GY','SR','AG','DM','GD','KN','LC','VC','BN'
]);

// Country code → [language code, native abbreviation, is RTL]
const COUNTRY_MAP = {
  // Arabic (RTL)
  EG:['ar','عر',true],SA:['ar','عر',true],AE:['ar','عر',true],KW:['ar','عر',true],
  QA:['ar','عر',true],BH:['ar','عر',true],OM:['ar','عر',true],YE:['ar','عر',true],
  IQ:['ar','عر',true],JO:['ar','عر',true],LB:['ar','عر',true],SY:['ar','عر',true],
  LY:['ar','عر',true],TN:['ar','عر',true],DZ:['ar','عر',true],MA:['ar','عر',true],
  SD:['ar','عر',true],MR:['ar','عر',true],DJ:['ar','عر',true],KM:['ar','عر',true],
  // French
  FR:['fr','Fr',false],BE:['fr','Fr',false],CH:['fr','Fr',false],LU:['fr','Fr',false],
  MC:['fr','Fr',false],CD:['fr','Fr',false],CI:['fr','Fr',false],CM:['fr','Fr',false],
  MG:['fr','Fr',false],SN:['fr','Fr',false],ML:['fr','Fr',false],BF:['fr','Fr',false],
  TG:['fr','Fr',false],BJ:['fr','Fr',false],NE:['fr','Fr',false],CF:['fr','Fr',false],
  GA:['fr','Fr',false],CG:['fr','Fr',false],RW:['fr','Fr',false],BI:['fr','Fr',false],
  MU:['fr','Fr',false],SC:['fr','Fr',false],HT:['fr','Fr',false],
  // Spanish
  ES:['es','Es',false],MX:['es','Es',false],CO:['es','Es',false],AR:['es','Es',false],
  PE:['es','Es',false],VE:['es','Es',false],CL:['es','Es',false],EC:['es','Es',false],
  GT:['es','Es',false],CU:['es','Es',false],BO:['es','Es',false],DO:['es','Es',false],
  HN:['es','Es',false],PY:['es','Es',false],SV:['es','Es',false],NI:['es','Es',false],
  CR:['es','Es',false],PA:['es','Es',false],UY:['es','Es',false],
  // German
  DE:['de','De',false],AT:['de','De',false],
  // Portuguese
  PT:['pt','Pt',false],BR:['pt','Pt',false],AO:['pt','Pt',false],MZ:['pt','Pt',false],
  // Russian
  RU:['ru','Ru',false],BY:['ru','Ru',false],KZ:['ru','Ru',false],
  // Chinese
  CN:['zh','中',false],TW:['zh','中',false],HK:['zh','中',false],
  // Japanese
  JP:['ja','日',false],
  // Korean
  KR:['ko','한',false],
  // Turkish
  TR:['tr','Tr',false],
  // Italian
  IT:['it','It',false],
  // Dutch
  NL:['nl','Nl',false],
  // Persian (RTL)
  IR:['fa','فا',true],
  // Hebrew (RTL)
  IL:['he','עב',true],
  // Bengali
  BD:['bn','বাং',false],
  // Indonesian
  ID:['id','Id',false],
  // Thai
  TH:['th','ไท',false],
  // Vietnamese
  VN:['vi','Vi',false],
  // Polish
  PL:['pl','Pl',false],
  // Romanian
  RO:['ro','Ro',false],
  // Greek
  GR:['el','Ελ',false],
  // Swahili
  TZ:['sw','Sw',false],UG:['sw','Sw',false],
};

export async function GET(request) {
  // Vercel sets this header at the CDN edge — always accurate, even through proxies
  const country = request.headers.get('x-vercel-ip-country') || 'EG';

  if (ENGLISH_COUNTRIES.has(country)) {
    return NextResponse.json({
      country,
      language: 'en',
      rtl: false,
      nativeName: null,
      showToggle: false,
    });
  }

  const mapping = COUNTRY_MAP[country];
  if (!mapping) {
    // Unknown country — default to Arabic (Arabic-first app)
    return NextResponse.json({
      country,
      language: 'ar',
      rtl: true,
      nativeName: 'عر',
      showToggle: true,
    });
  }

  const [language, nativeName, rtl] = mapping;
  return NextResponse.json({
    country,
    language,
    rtl,
    nativeName,
    showToggle: true,
  });
}
