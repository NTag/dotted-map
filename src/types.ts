export interface Region {
  lat: { min: number; max: number };
  lng: { min: number; max: number };
}

export interface MapSettings {
  height?: number;
  width?: number;
  countries?: string[];
  region?: Region;
  grid?: 'vertical' | 'diagonal';
}

export interface DottedMapSettings extends MapSettings {
  avoidOuterPins?: boolean;
}

export interface DottedMapWithoutCountriesSettings {
  map: MapData;
  avoidOuterPins?: boolean;
}

export interface SvgOptions {
  color?: string;
  radius?: number;
}

export interface PinInput {
  lat: number;
  lng: number;
  data?: unknown;
  svgOptions?: SvgOptions;
}

export interface SvgSettings {
  shape?: 'circle' | 'hexagon';
  color?: string;
  backgroundColor?: string;
  radius?: number;
}

export interface Point {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  data?: unknown;
  svgOptions?: SvgOptions;
}

export interface MapData {
  points: Record<string, Point>;
  X_MIN: number;
  Y_MIN: number;
  X_MAX: number;
  Y_MAX: number;
  X_RANGE: number;
  Y_RANGE: number;
  region: Region;
  grid: 'vertical' | 'diagonal';
  height: number;
  width: number;
  ystep: number;
}

export interface ImageInfo {
  region: Region;
  width: number;
  height: number;
}
