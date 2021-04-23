[![npm version](https://badge.fury.io/js/dotted-map.svg)](https://www.npmjs.com/package/dotted-map)

# dotted-map

<div align="center">
  <img src="https://raw.githubusercontent.com/NTag/dotted-map/master/images/world-vertical-circle-light.svg" width="100%" />

  <img src="https://raw.githubusercontent.com/NTag/dotted-map/master/images/world-diagonal-circle-dark.svg" width="100%" />

  <img src="https://raw.githubusercontent.com/NTag/dotted-map/master/images/france-diagonal-hexagon-light.svg" height="150px" />
  <img src="https://raw.githubusercontent.com/NTag/dotted-map/master/images/italy-diagonal-hexagon-light.svg" height="150px" />
  <img src="https://raw.githubusercontent.com/NTag/dotted-map/master/images/uk-diagonal-hexagon-light.svg" height="150px" />
  <br />
  <em>You can limit to one (or several) countries (France, Italy, UK)</em>
</div>

## Installation

Requires NodeJS ≥ 13.

```bash
npm i dotted-map
```

## Usage

```js
const fs = require('fs');
const DottedMap = require('dotted-map').default;
// Or in the browser: import DottedMap from 'dotted-map';

const map = new DottedMap({ height: 60, grid: 'diagonal' });

map.addPin({
  lat: 40.73061,
  lng: -73.935242,
  svgOptions: { color: '#d6ff79', radius: 0.4 },
});
map.addPin({
  lat: 48.8534,
  lng: 2.3488,
  svgOptions: { color: '#fffcf2', radius: 0.4 },
});

const svgMap = map.getSVG({
  radius: 0.22,
  color: '#423B38',
  shape: 'circle',
  backgroundColor: '#020300',
});

fs.writeFileSync('./map.svg', svgMap);
```

If you use a large number of points (height or width ≥ 100), it may take a bit of time to compute the map (from 1 to 30 seconds depending on your device and number of points). This is why the result grid is cached. If you don’t change the parameters of `new DottedMap`, the next maps will be a lot faster to generate. You can however change the pins and the SVG options.

### Precomputing the map

Because the previous operation can be expansive (especially if you want to use DottedMap in a browser or React Native app), it’s possible to precompute the grid. You will still be able to add pins on-the-fly, in real time. This also allows you to import a lighter version of the library. This is especially useful if you always use the same map parameters, but only change the pins.

```js
// So you do this first step only once, when developing your app
const getMapJSON = require('dotted-map').getMapJSON;

// This function accepts the same arguments as DottedMap in the example above.
const mapJsonString = getMapJSON({ height: 60, grid: 'diagonal' });
console.log(mapJsonString);

// This string will contain everything about the grid. You will need to copy
// and include it in your front.
```

```js
// Now we are in your app, let’s imagine it’s a React app

// This import doesn’t include coordinates of countries: it’s lighter
// that 'dotted-map', so especially useful in fronts.
// However, you must give it a map you have pre-computed before.
import DottedMap from 'dotted-map/without-countries';

// Basically myMap.js contains something like:
//
// const MyMapString = 'the string mapJsonString that you got on the first step';
// export default MyMapString;
import MyMapString from './myMap';

const MyComponent = () => {
  // It’s safe to re-create the map at each render, because of the
  // pre-computation it’s super fast ⚡️
  const map = new DottedMap({ map: JSON.parse(MyMapString) });

  map.addPin({
    lat: 40.73061,
    lng: -73.935242,
    svgOptions: { color: '#d6ff79', radius: 0.4 },
  });

  const svgMap = map.getSVG({
    radius: 0.22,
    color: '#423B38',
    shape: 'circle',
    backgroundColor: '#020300',
  });

  return (
    <div>
      <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`} />
    </div>
  );
};

export default MyComponent;
```

That’s how you can display a super stylish map in your React webapp, without impacting the size of your bundle nor the performance of your app (browsers are very fast at rendering SVGs).

## Specs

```js
import DottedMap from 'dotted-map';

// Create the map
const map = new DottedMap({
  height,
  width, // just specify either height or width, so the ratio of the map is correct
  countries: ['FRA'] // look into `countries.geo.json` to see which keys to use. You can also omit this parameter and the whole world will be used
  region: { lat: { min, max }, lng: { min, max } }, // if not present, it will fit the countries (and if no country is specified, the whole world)
  grid: 'vertical' | 'diagonal', // how points should be aligned
  avoidOuterPins: false | true, // if it’s true, prevent adding pins when they are outside of region/countries
});

// Add some points/change the color of existing points
map.addPin({
  lat,
  lng,
  svgOptions: { color, radius },
  data, // whatever you want, useful if you use the method `getPoints` to get the raw points
});

// If you want to get the raw array of points
map.getPoints();
// [{ x, y, data, svgOptions }]

// Or use this method to get a string which is a SVG
map.getSVG({
  shape: 'circle' | 'hexagon', // if you use hexagon, prefer the grid `diagonal`
  backgroundColor, // background color of the map
  color, // default color of the points
  radius: 0.5, // default radius of the points
});
// <svg><circle … /><circle …></svg>
```

## Acknowledgments

Countries are from https://github.com/johan/world.geo.json.
