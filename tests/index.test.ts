import DottedMap from "../src";

describe("dotted-map", () => {
  it("should be defined", () => {
    const map = new DottedMap({ height: 60, grid: "diagonal" });

    map.addPin({
      lat: 40.73061,
      lng: -73.935242,
      svgOptions: { color: "#d6ff79", radius: 0.4 },
    });

    map.getPin({ lat: 40.73061, lng: -73.935242 });

    const svg = map.getSVG({
      radius: 0.22,
      color: "#423B38",
      shape: "circle",
      backgroundColor: "#020300",
    });

    expect(svg).toBeDefined();
    expect(svg).toMatchSnapshot();
  });
});
