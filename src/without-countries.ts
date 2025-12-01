import inside from "@turf/boolean-point-in-polygon";
import proj4 from "proj4";
import type { Map, Pin, Point, SvgSettings } from "./types";

export interface DottedMapWithoutCountriesSettings {
  map: Map;
  avoidOuterPins?: boolean;
}

class DottedMapWithoutCountries {
  constructor(private readonly settings: DottedMapWithoutCountriesSettings) {}

  addPin(options: Pin) {
    const pin = this.getPin(options);
    const point = { ...options, ...pin };

    this.settings.map.points[[point.x, point.y].join(";")] = point as Point;

    return point;
  }

  getPin({ lat, lng }: { lat: number; lng: number }) {
    const [googleX, googleY] = proj4(
      proj4.defs("GOOGLE") as unknown as string,
      [lng, lat],
    );
    if (this.settings.avoidOuterPins) {
      const wgs84Point = proj4(
        proj4.defs("GOOGLE") as unknown as string,
        proj4.defs("WGS84") as unknown as string,
        [googleX, googleY],
      );
      if (
        !inside(
          wgs84Point,
          this.settings.map.poly as GeoJSON.Feature<GeoJSON.MultiPolygon>,
        )
      )
        return;
    }
    let [rawX, rawY] = [
      (this.settings.map.width * (googleX - this.settings.map.X_MIN)) /
        this.settings.map.X_RANGE,
      (this.settings.map.height * (this.settings.map.Y_MAX - googleY)) /
        this.settings.map.Y_RANGE,
    ];
    const y = Math.round(rawY / this.settings.map.ystep);
    if (y % 2 === 0 && this.settings.map.grid === "diagonal") {
      rawX -= 0.5;
    }
    const x = Math.round(rawX);
    let [localx, localy] = [x, Math.round(y) * this.settings.map.ystep];
    if (y % 2 === 0 && this.settings.map.grid === "diagonal") {
      localx += 0.5;
    }

    const [localLng, localLat] = proj4(
      proj4.defs("GOOGLE") as unknown as string,
      proj4.defs("WGS84") as unknown as string,
      [
        (localx * this.settings.map.X_RANGE) / this.settings.map.width +
          this.settings.map.X_MIN,
        this.settings.map.Y_MAX -
          (localy * this.settings.map.Y_RANGE) / this.settings.map.height,
      ],
    );

    const pin = { x: localx, y: localy, lat: localLat, lng: localLng };

    return pin;
  }

  getPoints() {
    return Object.values(this.settings.map.points);
  }

  getSVG({
    shape = "circle",
    color = "current",
    backgroundColor = "transparent",
    radius = 0.5,
  }: SvgSettings) {
    const getPoint = (point: Point): string => {
      const { x, y, svgOptions = {} } = point;
      const pointRadius = svgOptions.radius || radius;

      const attrs: Record<string, string | number | undefined> = {
        fill: svgOptions.color || color,
        ...point.attrs,
      };

      function render(
        element: "circle" | "polyline",
        attributes: Record<string, string | number>,
      ) {
        const attrs = Object.entries(attributes)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ");

        return `<${element} ${attrs} />`;
      }

      if (shape === "circle") {
        return render("circle", {
          ...attrs,
          cx: x,
          cy: y,
          r: pointRadius,
        });
      } else if (shape === "hexagon") {
        const sqrt3radius = Math.sqrt(3) * pointRadius;

        const polyPoints = [
          [x + sqrt3radius, y - pointRadius],
          [x + sqrt3radius, y + pointRadius],
          [x, y + 2 * pointRadius],
          [x - sqrt3radius, y + pointRadius],
          [x - sqrt3radius, y - pointRadius],
          [x, y - 2 * pointRadius],
        ];

        return render("polyline", {
          ...attrs,
          points: polyPoints.map((point) => point.join(",")).join(" "),
          fill: svgOptions.color || color,
        });
      }

      return "";
    };

    return `<svg viewBox="0 0 ${this.settings.map.width} ${this.settings.map.height}" xmlns="http://www.w3.org/2000/svg" style="background-color: ${backgroundColor}">
      ${Object.values(this.settings.map.points).map(getPoint).join("\n")}
    </svg>`;
  }

  get image() {
    return {
      region: this.settings.map.region,
      width: this.settings.map.width,
      height: this.settings.map.height,
    };
  }
}

export default DottedMapWithoutCountries;
