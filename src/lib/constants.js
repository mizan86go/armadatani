export const APP_NAME = 'ArmadaTani';
export const APP_TAGLINE = 'Sewa alsintan & armada angkut hasil kebun';

export const ROLES = {
  farmer: {
    label: 'Petani',
    short: 'Petani',
    description: 'Ajukan sewa alat, pantau jadwal, dan kelola pemesanan lahan.',
  },
  admin: {
    label: 'Admin KUD',
    short: 'Admin',
    description: 'Verifikasi pemesanan, kelola armada, operator, dan laporan.',
  },
  operator: {
    label: 'Operator',
    short: 'Operator',
    description: 'Terima penugasan lapangan, perbarui progres, dan catat BBM.',
  },
};

export const HOME_PATH = {
  farmer: '/petani',
  admin: '/admin',
  operator: '/operator',
};

export const REGIONS = [
  { name: 'Aceh Besar', lat: 5.4567, lng: 95.4785, terrain: 'Datar / sawah irigasi', commodities: 'Padi, jagung, kedelai' },
  { name: 'Pidie', lat: 5.3822, lng: 95.9571, terrain: 'Datar / sawah luas', commodities: 'Padi, kakao, kelapa' },
  { name: 'Bireuen', lat: 5.203, lng: 96.7009, terrain: 'Datar hingga bergelombang', commodities: 'Padi, sawit rakyat, pinang' },
  { name: 'Aceh Tengah', lat: 4.6285, lng: 96.8427, terrain: 'Dataran tinggi / berbukit', commodities: 'Kopi arabika, hortikultura' },
  { name: 'Bener Meriah', lat: 4.7495, lng: 96.8614, terrain: 'Berbukit / lereng gunung', commodities: 'Kopi gayo, cabai, kubis' },
];

export const REGION_NAMES = REGIONS.map((r) => r.name);

export function findRegion(name) {
  return REGIONS.find((r) => r.name === name) || null;
}

export const CATEGORIES = [
  'Pengolahan Lahan',
  'Perawatan & Pemupukan',
  'Panen & Pasca-Panen',
  'Armada Angkut Hasil Kebun',
];

export const TERRAIN_FACTORS = {
  Datar: 1,
  Bergelombang: 1.12,
  Berbukit: 1.25,
  Berlumpur: 1.3,
};

export const TERRAIN_OPTIONS = Object.keys(TERRAIN_FACTORS);

export const UNIT_SCHEMES = {
  per_ha: { label: 'per hektare', unit: 'ha' },
  per_hour: { label: 'per jam', unit: 'jam' },
  per_trip: { label: 'per ritase', unit: 'ritase' },
};

export const UNIT_STATUS = {
  available: { label: 'Tersedia', tone: 'success' },
  operating: { label: 'Beroperasi', tone: 'warning' },
  maintenance: { label: 'Servis', tone: 'danger' },
};

export const UNIT_STATUS_OPTIONS = Object.keys(UNIT_STATUS);

export const BOOKING_STATUS = {
  pending: { label: 'Menunggu konfirmasi', tone: 'warning' },
  approved: { label: 'Disetujui', tone: 'info' },
  in_progress: { label: 'Sedang berjalan', tone: 'primary' },
  completed: { label: 'Selesai', tone: 'success' },
  rejected: { label: 'Ditolak', tone: 'danger' },
  cancelled: { label: 'Dibatalkan', tone: 'neutral' },
};

export const BOOKING_STATUS_OPTIONS = Object.keys(BOOKING_STATUS);

/** Statuses that still hold a slot on the unit / operator calendar. */
export const ACTIVE_BOOKING_STATUSES = ['pending', 'approved', 'in_progress'];

/** Allowed status transitions — enforced in the UI and the repository layer. */
export const STATUS_TRANSITIONS = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
};

export const FUEL_PRICES = { Solar: 6800, Pertalite: 10000 };

export const MAX_BOOKING_DAYS = 7;
export const SERVICE_WARN_RATIO = 0.85;
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const UNIT_ICONS = [
  'tractor',
  'handtractor',
  'excavator',
  'drone',
  'brushcutter',
  'sprayer',
  'combine',
  'thresher',
  'truck',
  'pickup',
];
