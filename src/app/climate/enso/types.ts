/* ─── Shared ENSO data types ──────────────────────────────────────────────── */

export type EnsoState = 'El Niño' | 'La Niña' | 'Neutral';

export type OniData = {
  state: EnsoState;
  strength: string;
  anomaly: number;
  season: string;
  seasonYear: number;
  history: { season: string; year: number; anom: number }[];
};

export type WeeklyRow = {
  date: string;
  year: number;
  month: number;
  day: number;
  nino12: { sst: number; anom: number };
  nino3: { sst: number; anom: number };
  nino34: { sst: number; anom: number };
  nino4: { sst: number; anom: number };
};

export type WeeklyData = {
  latest: WeeklyRow;
  weekly: WeeklyRow[];
  baseline: string;
  firstWeek: string;
  lastWeek: string;
};

export type MeiData = {
  latest: { year: number; season: string; seasonIndex: number; value: number };
  history: { year: number; season: string; seasonIndex: number; value: number }[];
};

export type SoiData = {
  latest: { year: number; month: number; value: number };
  history: { year: number; month: number; value: number }[];
};

export type ForecastSeason = {
  season: string;
  label: string;
  pLaNina: number;
  pNeutral: number;
  pElNino: number;
};

export type ForecastData = {
  seasons: ForecastSeason[];
  imageUrl: string | null;
};

export type PlumePeriod = {
  period: number;
  label: string;
  seasonAnchorYear: number;
  mean: number | null;
  dynMean: number | null;
  statMean: number | null;
  modelCount: number;
  models: { name: string; type: string; value: number }[];
};

export type PlumeData = {
  issueYear: number;
  issueMonth: number;
  periods: PlumePeriod[];
};

/** SNU ACE Lab CNN monthly Niño 3.4 forecast (Ham et al. 2019) */
export type CnnForecastPoint = {
  yyyymm: number;  // e.g. 202605 = May 2026
  nino34: number;  // Niño 3.4 anomaly prediction (°C)
};

export type CnnForecast = {
  issueYearMonth: number;       // e.g. 202604 = April 2026
  points: CnnForecastPoint[];
};

export type EnsoSnapshot = {
  oni: OniData | null;
  weekly: WeeklyData | null;
  mei: MeiData | null;
  soi: SoiData | null;
  forecast: ForecastData | null;
  plume: PlumeData | null;
  cnnForecast: CnnForecast | null;
  sources: Record<string, string>;
  images: {
    sstAnomalyMap: string;
    tropicalSstAnimation: string;
    subsurfaceAnomaly: string;
    hovmollerSst: string;
    cpcProbabilityForecast: string | null;
    metOfficePlumeNino34?: string;
    metOfficePlumeNino3?: string;
    metOfficePlumeNino4?: string;
    metOfficePlumeNino12?: string;
    metOfficeImpactElNinoTemp?: string;
    metOfficeImpactElNinoPrecip?: string;
    metOfficeImpactLaNinaTemp?: string;
    metOfficeImpactLaNinaPrecip?: string;
  };
  generatedAt: string;
};
