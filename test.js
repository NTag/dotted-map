const DottedMap = require('./index.js');

const map = new DottedMap({ height: 100, grid: 'diagonal' });

const pinColor = '#D6FF79';

map.addPin({ lat: 48.85, lng: 2.35, svgOptions: { color: pinColor, radius: 0.22 } });

console.log(map.getSVG({ radius: 0.22, color: '#423B38', shape: 'circle', backgroundColor: '020300' }));
