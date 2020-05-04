const DottedMap = require('./index.js');

const map = new DottedMap({ height: 100, countries: ['FRA'] });

map.addPin({ lat: 48.85, lng: 2.35, svgOptions: { color: 'red', radius: 0.45 } });
// map.addPin({ lat: 47.65, lng: -2.76, svgOptions: { color: 'red', radius: 0.5 } });

console.log(map.getSVG({ radius: 0.3, color: 'grey' }));
