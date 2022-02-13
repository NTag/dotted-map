const DottedMap = require('./index').default;

// The tests can only be ran after the lib has been built.

const map = new DottedMap({ height: 60, grid: 'diagonal' });

map.addPin({
  lat: 40.73061,
  lng: -73.935242,
  svgOptions: { color: '#d6ff79', radius: 0.4 },
});
map.getPin({ lat: 40.73061, lng: -73.935242 });
map.getSVG({
  radius: 0.22,
  color: '#423B38',
  shape: 'circle',
  backgroundColor: '#020300',
});
