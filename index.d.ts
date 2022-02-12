namespace DottedMapLib {
  interface Region {
    lat: { min: number; max: number };
    lng: { min: number; max: number };
  }

  interface MapSettings {
    height?: number;
    width?: number;
    countries?: string[];
    region?: Region;
    grid?: 'vertical' | 'diagonal';
  }

  interface Settings extends MapSettings {
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

export const getMapJSON: (settings: DottedMapLib.MapSettings) => string;

export default class DottedMap {
  constructor(settings: DottedMapLib.Settings);

  addPin(pin: DottedMapLib.Pin): DottedMapLib.Point;
  getPin(pin: DottedMapLib.Pin): DottedMapLib.Point;
  getPoints(): DottedMapLib.Point[];
  getSVG(settings: DottedMapLib.SvgSettings): string;
  image: {
    region: DottedMap.Region;
    width: number;
    height: number;
  };
}
