import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/with-countries.ts',
    'without-countries': 'src/without-countries.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  external: ['proj4', '@turf/boolean-point-in-polygon'],
});
