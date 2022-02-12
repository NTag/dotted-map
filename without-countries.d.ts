namespace DottedMapWithoutCountriesLib {
  interface Region {
    lat: { min: number; max: number };
    lng: { min: number; max: number };
  }

  interface Map {
    points: Point[];
    X_MIN: number;
    Y_MAX: number;
    X_RANGE: number;
    Y_RANGE: number;
    region: Region;
    grid: 'vertical' | 'diagonal';
    width: number;
    height: number;
    ystep: number;
  }

  interface Settings extends MapSettings {
    map: Map;
    avoidOuterPins?: false | true;
  }

  interface SvgOptions {
    color?: string;
    radius?: number;
  }

  interface Pin {
    lat: number;
    lng: number;
    data?: any;
    svgOptions?: SvgOptions;
  }

  interface SvgSettings {
    shape?: 'circle' | 'hexagon';
    color?: string;
    backgroundColor?: string;
    radius?: number;
  }

  type Point = {
    x: number;
    y: number;
    lat: number;
    lng: number;
    data?: any;
    svgOptions?: SvgOptions;
  };
}

export default class DottedMapWithoutCountries {
  constructor(settings: DottedMapWithoutCountriesLib.Settings);

  addPin(
    pin: DottedMapWithoutCountriesLib.Pin,
  ): DottedMapWithoutCountriesLib.Point;
  getPin(
    pin: DottedMapWithoutCountriesLib.Pin,
  ): DottedMapWithoutCountriesLib.Point;
  getPoints(): DottedMapWithoutCountriesLib.Point[];
  getSVG(settings: DottedMapWithoutCountriesLib.SvgSettings): string;
  image: {
    region: DottedMap.Region;
    width: number;
    height: number;
  };
}
