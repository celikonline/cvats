// Pozisyon profilleri. Anahtar kelimeler "a|b" biçiminde eş anlamlı gruplardır;
// ilk alternatif raporda etiket olarak gösterilir. `core` ağırlığı 2, `extra` 1.
import { fold } from './text.js';

export const EDU_LEVELS = ['Lise', 'Önlisans', 'Lisans', 'Yüksek Lisans', 'Doktora'];

const RAW = [
  {
    id: 'muhasebe-uzmani',
    name: 'Muhasebe Uzmanı',
    aliases: ['muhasebeci', 'muhasebe elemanı', 'muhasebe sorumlusu', 'accountant'],
    minYears: 3,
    minEdu: 'Lisans',
    related: ['muhasebe-muduru', 'finans-yetkilisi'],
    core: [
      'genel muhasebe|general ledger', 'mizan|trial balance', 'kdv|katma değer vergisi',
      'muhtasar|stopaj', 'beyanname', 'mali tablo|financial statements', 'bilanço|balance sheet',
      'cari hesap|mutabakat|reconciliation', 'fatura', 'e-fatura|e-defter|e-arşiv',
      'vergi|tax', 'yevmiye|journal entr', 'ay sonu kapanış|month-end|kapanış',
    ],
    extra: [
      'logo|netsis|mikro|sap|erp', 'excel', 'tfrs|ufrs|ifrs', 'denetim|audit',
      'maliyet muhasebesi|cost accounting', 'bütçe|budget', 'nakit akışı|cash flow',
      'bordro|payroll', 'amortisman|duran varlık', 'borç|alacak|accounts payable|accounts receivable',
      'ba-bs|ba/bs', 'gelir tablosu|income statement',
    ],
  },
  {
    id: 'muhasebe-muduru',
    name: 'Muhasebe Müdürü',
    aliases: ['muhasebe şefi', 'muhasebe yöneticisi', 'accounting manager', 'chief accountant'],
    minYears: 8,
    minEdu: 'Lisans',
    related: ['finans-yetkilisi', 'muhasebe-uzmani'],
    core: [
      'ekip yönetimi|ekibi yönet|team management|takım lideri|ekip lideri', 'konsolidasyon|consolidation',
      'mali tablo|financial statements', 'ifrs|tfrs|ufrs', 'bütçe|budget', 'denetim|audit',
      'vergi planlama|tax planning', 'ay sonu kapanış|month-end|kapanış', 'raporla|reporting',
      'süreç iyileştirme|process improvement', 'iç kontrol|internal control',
    ],
    extra: [
      'erp|sap', 'yönetim raporları|management report', 'nakit akışı|cash flow',
      'finansal analiz|financial analysis', 'mevzuat|compliance|uyum', 'yönetim kurulu|board',
      'kpi', 'bütçeleme|forecast', 'stratejik|strategic', 'ekip|team',
    ],
  },
  {
    id: 'finans-yetkilisi',
    name: 'Finans Yetkilisi',
    aliases: ['finans uzmanı', 'finans sorumlusu', 'finance officer', 'finance specialist', 'finansal analist'],
    minYears: 2,
    minEdu: 'Lisans',
    related: ['muhasebe-uzmani', 'muhasebe-muduru'],
    core: [
      'nakit akışı|cash flow', 'bütçe|budget', 'finansal analiz|financial analysis', 'tahsilat|collection',
      'ödeme|payment', 'banka|bank', 'kredi|loan|finansman', 'raporla|reporting', 'likidite|liquidity',
      'forecast|tahmin|projeksiyon',
    ],
    extra: [
      'excel', 'erp|sap', 'döviz|kur riski|fx|hedging', 'maliyet analizi|cost analysis',
      'yatırım|investment', 'teminat|akreditif|letter of credit', 'power bi|dashboard', 'kpi',
      'cari hesap', 'sapma analizi|variance',
    ],
  },
  {
    id: 'yazilim-gelistirici',
    name: 'Yazılım Geliştirici',
    aliases: ['yazılım mühendisi', 'software developer', 'software engineer', 'developer', 'backend developer', 'frontend developer'],
    minYears: 2,
    minEdu: 'Lisans',
    related: ['veri-analisti', 'proje-yoneticisi'],
    core: [
      'javascript|typescript|python|java|c#|golang|kotlin|php', 'git', 'rest api|api', 'sql|veritabanı|database',
      'docker', 'ci/cd|jenkins|github actions|gitlab', 'unit test|birim test|test otomasyon|testing',
      'agile|scrum|çevik', 'algoritma|algorithm|veri yapıları', 'oop|nesne yönelimli|object-oriented',
    ],
    extra: [
      'kubernetes', 'aws|azure|gcp|cloud|bulut', 'mikroservis|microservice', 'react|angular|vue',
      'node.js|nodejs|spring|django|.net', 'linux', 'code review|kod inceleme', 'design pattern|tasarım deseni',
      'nosql|mongodb|redis', 'clean code|temiz kod',
    ],
  },
  {
    id: 'veri-analisti',
    name: 'Veri Analisti',
    aliases: ['data analyst', 'iş analisti', 'business analyst', 'bi uzmanı', 'raporlama uzmanı'],
    minYears: 2,
    minEdu: 'Lisans',
    related: ['yazilim-gelistirici', 'proje-yoneticisi'],
    core: [
      'sql', 'excel', 'power bi|tableau|looker|qlik', 'veri analizi|data analysis', 'raporla|reporting',
      'dashboard|gösterge paneli', 'python|r programlama', 'veri görselleştirme|data visualization',
      'istatistik|statistics', 'etl|veri ambarı|data warehouse',
    ],
    extra: [
      'a/b test', 'kpi', 'pandas', 'veri modelleme|data modeling', 'makine öğrenmesi|machine learning',
      'google analytics', 'bigquery|snowflake', 'veri temizleme|data cleaning', 'regresyon|regression',
    ],
  },
  {
    id: 'insan-kaynaklari-uzmani',
    name: 'İnsan Kaynakları Uzmanı',
    aliases: ['ik uzmanı', 'hr specialist', 'human resources specialist', 'işe alım uzmanı', 'insan kaynakları sorumlusu'],
    minYears: 2,
    minEdu: 'Lisans',
    related: ['proje-yoneticisi', 'satis-uzmani'],
    core: [
      'işe alım|recruitment|talent acquisition', 'bordro|payroll', 'özlük|personnel file', 'performans değerlendirme|performance review|performance management',
      'eğitim planlama|training|gelişim', 'sgk', 'iş hukuku|labor law|iş kanunu', 'mülakat|interview',
      'oryantasyon|onboarding', 'çalışan bağlılığı|employee engagement',
    ],
    extra: [
      'işveren markası|employer branding', 'ats', 'successfactors|workday|sap hr', 'linkedin recruiter',
      'ücret|compensation|benefits', 'ik analitiği|hr analytics', 'yetkinlik|competency', 'kariyer planlama|succession',
    ],
  },
  {
    id: 'satis-uzmani',
    name: 'Satış Uzmanı',
    aliases: ['satış temsilcisi', 'sales specialist', 'sales representative', 'satış danışmanı', 'account executive'],
    minYears: 2,
    minEdu: 'Lise',
    related: ['proje-yoneticisi', 'insan-kaynaklari-uzmani'],
    core: [
      'satış hedefi|sales target|kota|quota', 'müşteri ilişkileri|customer relationship|crm', 'portföy|portfolio',
      'teklif|proposal|quotation', 'müzakere|negotiation', 'yeni müşteri|new business|lead', 'ciro|revenue|satış gelir',
      'satış raporlama|pipeline|forecast', 'saha satış|field sales|b2b|b2c',
    ],
    extra: [
      'salesforce|hubspot|crm', 'sözleşme|contract', 'tahsilat', 'pazar analizi|market analysis', 'cross-sell|upsell|çapraz satış',
      'bayi|dealer|distribütör', 'fuar|exhibition',
    ],
  },
  {
    id: 'proje-yoneticisi',
    name: 'Proje Yöneticisi',
    aliases: ['proje müdürü', 'project manager', 'proje sorumlusu', 'program manager'],
    minYears: 5,
    minEdu: 'Lisans',
    related: ['yazilim-gelistirici', 'insan-kaynaklari-uzmani'],
    core: [
      'proje yönetimi|project management', 'bütçe|budget', 'paydaş|stakeholder', 'risk yönetimi|risk management',
      'zaman planlama|timeline|takvim|schedule', 'kapsam|scope', 'agile|scrum|çevik|waterfall', 'ekip yönetimi|team management|ekibi yönet',
      'raporla|reporting', 'kaynak planlama|resource planning',
    ],
    extra: [
      'pmp|prince2|pmi', 'jira|ms project|asana|trello', 'kpi', 'tedarikçi|vendor', 'değişiklik yönetimi|change management',
      'sözleşme|contract', 'kalite|quality',
    ],
  },
];

const compile = (list, weight) =>
  list.map((s) => ({ label: s.split('|')[0], spec: fold(s), weight }));

export const POSITIONS = RAW.map((p) => ({
  ...p,
  foldedNames: [p.name, ...p.aliases].map(fold),
  keywords: [...compile(p.core, 2), ...compile(p.extra, 1)],
}));

export const byId = (id) => POSITIONS.find((p) => p.id === id);

// Kullanıcının yazdığı pozisyon adını bir profile eşler (tam ad > takma ad > kelime örtüşmesi).
export function matchProfile(target) {
  const t = fold(target || '').trim();
  if (!t) return null;
  const toks = (s) => s.split(/[^a-z0-9]+/).filter((x) => x.length > 2).map((x) => x.slice(0, 5));
  const tt = new Set(toks(t));
  let best = null;
  let bestScore = 0;
  for (const p of POSITIONS) {
    let s = 0;
    for (const n of p.foldedNames) {
      if (n === t) s = Math.max(s, 1);
      else if (n.includes(t) || t.includes(n)) s = Math.max(s, 0.9);
      else {
        const nt = new Set(toks(n));
        const inter = [...tt].filter((x) => nt.has(x)).length;
        const union = new Set([...tt, ...nt]).size;
        if (union) s = Math.max(s, inter / union);
      }
    }
    if (s > bestScore) { best = p; bestScore = s; }
  }
  return bestScore >= 0.5 ? best : null;
}
