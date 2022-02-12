import proj4 from 'proj4';
import inside from '@turf/boolean-point-in-polygon';

function DottedMapWithoutCountries({ map, avoidOuterPins = false }) {
  const {
    points,
    X_MIN,
    Y_MAX,
    X_RANGE,
    Y_RANGE,
    region,
    grid,
    width,
    height,
    ystep,
  } = map;

  return {
    addPin({ lat, lng, data, svgOptions }) {
      const pin = this.getPin({ lat, lng });
      const point = { ...pin, data, svgOptions };

      points[[point.x, point.y].join(';')] = point;

      return point;
    },
    getPin({ lat, lng }) {
      const [googleX, googleY] = proj4(proj4.defs('GOOGLE'), [lng, lat]);
      if (avoidOuterPins) {
        const wgs84Point = proj4(proj4.defs('GOOGLE'), proj4.defs('WGS84'), [
          googleX,
          googleY,
        ]);
        if (!inside(wgs84Point, poly)) return;
      }
      let [rawX, rawY] = [
        (width * (googleX - X_MIN)) / X_RANGE,
        (height * (Y_MAX - googleY)) / Y_RANGE,
      ];
      const y = Math.round(rawY / ystep);
      if (y % 2 === 0 && grid === 'diagonal') {
        rawX -= 0.5;
      }
      const x = Math.round(rawX);
      let [localx, localy] = [x, Math.round(y) * ystep];
      if (y % 2 === 0 && grid === 'diagonal') {
        localx += 0.5;
      }

      const [localLng, localLat] = proj4(
        proj4.defs('GOOGLE'),
        proj4.defs('WGS84'),
        [
          (localx * X_RANGE) / width + X_MIN,
          Y_MAX - (localy * Y_RANGE) / height,
        ],
      );

      const pin = { x: localx, y: localy, lat: localLat, lng: localLng };

      return pin;
    },
    getPoints() {
      return Object.values(points);
    },
    getSVG({
      shape = 'circle',
      color = 'current',
      backgroundColor = 'transparent',
      radius = 0.5,
    }) {
      const getPoint = ({ x, y, svgOptions = {} }) => {
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
      };

      return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: ${backgroundColor}">
        ${Object.values(points).map(getPoint).join('\n')}
      </svg>`;
    },
    image: {
      region,
      width,
      height,
    },
  };
}

export default DottedMapWithoutCountries;
