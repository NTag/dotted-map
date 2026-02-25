import proj4 from 'proj4';
import type {
  DottedMapWithoutCountriesSettings,
  PinInput,
  Point,
  SvgSettings,
  ImageInfo,
  MapData,
  Region,
  Projection,
  ProjectionName,
} from './types';

export type {
  DottedMapWithoutCountriesSettings,
  PinInput,
  Point,
  SvgSettings,
  ImageInfo,
  MapData,
  Region,
  Projection,
  ProjectionName,
};

const PROJECTIONS: Record<ProjectionName, string> = {
  mercator: '+proj=merc +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  equirectangular: '+proj=eqc +lon_0={lng} +lat_ts=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  robinson: '+proj=robin +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  equalEarth: '+proj=eqearth +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  mollweide: '+proj=moll +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  miller: '+proj=mill +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  sinusoidal: '+proj=sinu +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  orthographic: '+proj=ortho +lat_0={lat} +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  gallPeters: '+proj=cea +lon_0={lng} +lat_ts=45 +x_0=0 +y_0=0 +datum=WGS84 +units=m',
  vanDerGrinten: '+proj=vandg +lon_0={lng} +x_0=0 +y_0=0 +datum=WGS84 +units=m',
};

const DEFAULT_PROJECTION: Projection = { name: 'mercator' };

const getProj4String = (projection: Projection = DEFAULT_PROJECTION): string => {
  const template = PROJECTIONS[projection.name];
  const lat = projection.center?.lat ?? 0;
  const lng = projection.center?.lng ?? 0;
  return template.replace('{lat}', String(lat)).replace('{lng}', String(lng));
};

export default class DottedMapWithoutCountries {
  private points: Record<string, Point>;
  private X_MIN: number;
  private Y_MAX: number;
  private X_RANGE: number;
  private Y_RANGE: number;
  private grid: 'vertical' | 'diagonal';
  private width: number;
  private height: number;
  private ystep: number;
  private avoidOuterPins: boolean;
  private pins: Point[];
  private proj4String: string;

  public image: ImageInfo;

  constructor({ map, avoidOuterPins = false }: DottedMapWithoutCountriesSettings) {
    this.points = map.points;
    this.pins = [];
    this.X_MIN = map.X_MIN;
    this.Y_MAX = map.Y_MAX;
    this.X_RANGE = map.X_RANGE;
    this.Y_RANGE = map.Y_RANGE;
    this.grid = map.grid;
    this.width = map.width;
    this.height = map.height;
    this.ystep = map.ystep;
    this.avoidOuterPins = avoidOuterPins;
    this.proj4String = getProj4String(map.projection ?? DEFAULT_PROJECTION);

    this.image = {
      region: map.region,
      width: map.width,
      height: map.height,
    };
  }

  addPin({ lat, lng, data, svgOptions }: PinInput): Point {
    const pin = this.getPin({ lat, lng });
    if (!pin) return undefined as unknown as Point;
    const point: Point = { ...pin, data, svgOptions };
    this.pins.push(point);
    return point;
  }

  getPin({ lat, lng }: { lat: number; lng: number }): Point | undefined {
    const projected = proj4(this.proj4String, [lng, lat]);
    if (!projected.every((v: number) => Number.isFinite(v))) {
      return undefined;
    }

    const [projX, projY] = projected;
    if (this.avoidOuterPins) {
      // avoidOuterPins requires polygon data which is only available
      // via the with-countries entry point. In the original code, this
      // path referenced an undefined `poly` variable.
      return undefined;
    }

    let rawX = (this.width * (projX - this.X_MIN)) / this.X_RANGE;
    const rawY = (this.height * (this.Y_MAX - projY)) / this.Y_RANGE;
    const y = Math.round(rawY / this.ystep);
    if (y % 2 === 0 && this.grid === 'diagonal') {
      rawX -= 0.5;
    }
    const x = Math.round(rawX);
    let localx = x;
    const localy = Math.round(y) * this.ystep;
    if (y % 2 === 0 && this.grid === 'diagonal') {
      localx += 0.5;
    }

    const inverse = proj4(this.proj4String, 'WGS84', [
      (localx * this.X_RANGE) / this.width + this.X_MIN,
      this.Y_MAX - (localy * this.Y_RANGE) / this.height,
    ]);
    if (!inverse.every((v: number) => Number.isFinite(v))) {
      return undefined;
    }

    const [localLng, localLat] = inverse;
    return { x: localx, y: localy, lat: localLat, lng: localLng };
  }

  getPoints(): Point[] {
    return [...Object.values(this.points), ...this.pins];
  }

  getSVG({
    shape = 'circle',
    color = 'current',
    backgroundColor = 'transparent',
    radius = 0.5,
  }: SvgSettings = {}): string {
    const getPoint = ({ x, y, svgOptions = {} }: Point): string => {
      const pointRadius = svgOptions.radius || radius;
      if (shape === 'circle') {
        return `<circle cx="${x}" cy="${y}" r="${pointRadius}" fill="${
          svgOptions.color || color
        }" />`;
      } else if (shape === 'hexagon') {
        const sqrt3radius = Math.sqrt(3) * pointRadius;

        const polyPoints = [
          [x + sqrt3radius, y - pointRadius],
          [x + sqrt3radius, y + pointRadius],
          [x, y + 2 * pointRadius],
          [x - sqrt3radius, y + pointRadius],
          [x - sqrt3radius, y - pointRadius],
          [x, y - 2 * pointRadius],
        ];

        return `<polyline points="${polyPoints
          .map((point) => point.join(','))
          .join(' ')}" fill="${svgOptions.color || color}" />`;
      }
      return '';
    };

    return `<svg viewBox="0 0 ${this.width} ${this.height}" xmlns="http://www.w3.org/2000/svg" style="background-color: ${backgroundColor}">
        ${Object.values(this.points).map(getPoint).join('\n')}
        ${this.pins.map(getPoint).join('\n')}
      </svg>`;
  }
}
