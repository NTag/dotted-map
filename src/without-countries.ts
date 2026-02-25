import proj4 from 'proj4';
import type {
  DottedMapWithoutCountriesSettings,
  PinInput,
  Point,
  SvgSettings,
  ImageInfo,
  MapData,
  Region,
} from './types';

export type {
  DottedMapWithoutCountriesSettings,
  PinInput,
  Point,
  SvgSettings,
  ImageInfo,
  MapData,
  Region,
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
    const [googleX, googleY] = proj4('GOOGLE', [lng, lat]);
    if (this.avoidOuterPins) {
      // avoidOuterPins requires polygon data which is only available
      // via the with-countries entry point. In the original code, this
      // path referenced an undefined `poly` variable.
      return undefined;
    }

    let rawX = (this.width * (googleX - this.X_MIN)) / this.X_RANGE;
    const rawY = (this.height * (this.Y_MAX - googleY)) / this.Y_RANGE;
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

    const [localLng, localLat] = proj4('GOOGLE', 'WGS84', [
      (localx * this.X_RANGE) / this.width + this.X_MIN,
      this.Y_MAX - (localy * this.Y_RANGE) / this.height,
    ]);

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
