import assert from "node:assert/strict";

import {
  enrichOfflineMapPack,
  estimateOfflinePackTileCount,
  filterCountryStats,
  filterOfflineMapPacks,
  getCountryDisplayLabel,
  getCountrySelectionKey,
  OFFLINE_MAP_PACKS,
  stripPolishDiacritics,
} from "@/lib/countryUtils";
import {
  buildFarViewSpots,
  buildMarkerGroups,
  getFarViewPointLimit,
  getRegionBounds,
  isNewerId,
} from "@/lib/mapUtils";

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: "stripPolishDiacritics removes Polish diacritics",
    run: () => {
      assert.equal(stripPolishDiacritics("Łódź"), "Lodz");
      assert.equal(stripPolishDiacritics("Śląsk"), "Slask");
    },
  },
  {
    name: "getCountryDisplayLabel resolves ISO country codes to labels",
    run: () => {
      assert.equal(getCountryDisplayLabel("PL"), "Polska");
      assert.equal(getCountryDisplayLabel("DE"), "Niemcy");
      assert.equal(getCountryDisplayLabel("AE"), "Zjednoczone Emiraty Arabskie");
      assert.equal(getCountryDisplayLabel(null), "Brak kraju");
    },
  },
  {
    name: "filterOfflineMapPacks supports queries with and without Polish diacritics",
    run: () => {
      const byDiacritics = filterOfflineMapPacks(OFFLINE_MAP_PACKS, "Węgry");
      const withoutDiacritics = filterOfflineMapPacks(OFFLINE_MAP_PACKS, "Wegry");

      assert.equal(byDiacritics.length, 1);
      assert.equal(byDiacritics[0]?.code, "HU");
      assert.deepEqual(withoutDiacritics, byDiacritics);
    },
  },
  {
    name: "filterOfflineMapPacks returns empty list when query is blank",
    run: () => {
      assert.deepEqual(filterOfflineMapPacks(OFFLINE_MAP_PACKS, ""), []);
      assert.deepEqual(filterOfflineMapPacks(OFFLINE_MAP_PACKS, "   "), []);
    },
  },
  {
    name: "filterOfflineMapPacks finds France by localized country name",
    run: () => {
      const result = filterOfflineMapPacks(OFFLINE_MAP_PACKS, "Francja");

      assert.equal(result.length, 1);
      assert.equal(result[0]?.code, "FR");
    },
  },
  {
    name: "filterOfflineMapPacks finds Belgium by localized country name",
    run: () => {
      const result = filterOfflineMapPacks(OFFLINE_MAP_PACKS, "Belgia");

      assert.equal(result.length, 1);
      assert.equal(result[0]?.code, "BE");
    },
  },
  {
    name: "offline pack estimate adds tile count and readable size",
    run: () => {
      const pack = OFFLINE_MAP_PACKS.find((item) => item.code === "PL");
      assert.ok(pack);

      const tileCount = estimateOfflinePackTileCount(pack);
      const enriched = enrichOfflineMapPack(pack);

      assert.ok(tileCount > 0);
      assert.equal(enriched.estimatedTileCount, tileCount);
      assert.match(enriched.estimatedSizeLabel, /MB$/);
    },
  },
  {
    name: "filterCountryStats searches using full country names",
    run: () => {
      const result = filterCountryStats(
        [
          { country: "PL", count: 10 },
          { country: "DE", count: 5 },
          { country: "AE", count: 2 },
        ],
        "niem",
      );

      assert.deepEqual(result, [{ country: "DE", count: 5 }]);
    },
  },
  {
    name: "getCountrySelectionKey preserves missing-country bucket",
    run: () => {
      assert.equal(getCountrySelectionKey(null), "__NO_COUNTRY__");
      assert.equal(getCountrySelectionKey("PL"), "PL");
    },
  },
  {
    name: "buildMarkerGroups merges points with the same coordinates and keeps newest as primary",
    run: () => {
      const groups = buildMarkerGroups([
        { id: "1", lat: 50, lon: 20, rating: 3, country: "PL", comment: null, created_at: "2024-01-01T10:00:00.000Z" },
        { id: "2", lat: 50, lon: 20, rating: 5, country: "PL", comment: null, created_at: "2024-02-01T10:00:00.000Z" },
        { id: "3", lat: 51, lon: 21, rating: 4, country: "DE", comment: null, created_at: "2024-03-01T10:00:00.000Z" },
      ]);

      assert.equal(groups.length, 2);
      assert.equal(groups[0]?.primarySpot.id, "2");
      assert.equal(groups[0]?.spots.length, 2);
    },
  },
  {
    name: "getRegionBounds expands the visible region by padding",
    run: () => {
      const bounds = getRegionBounds({
        latitude: 50,
        longitude: 20,
        latitudeDelta: 1,
        longitudeDelta: 2,
      });

      assert.deepEqual(bounds, {
        minLat: 49.15,
        maxLat: 50.85,
        minLon: 18.3,
        maxLon: 21.7,
      });
    },
  },
  {
    name: "buildFarViewSpots samples large collections but keeps small ones unchanged",
    run: () => {
      const region = {
        latitude: 50.25,
        longitude: 20.25,
        latitudeDelta: 25,
        longitudeDelta: 25,
      };
      const large = Array.from({ length: 5000 }, (_, index) => ({
        id: String(index),
        lat: 50 + index / 10000,
        lon: 20 + index / 10000,
        rating: null,
        country: "PL",
        comment: null,
        created_at: null,
      }));

      const sampled = buildFarViewSpots(large, region);
      const unchanged = buildFarViewSpots(large.slice(0, 10), region);

      assert.ok(sampled.length > 0);
      assert.ok(sampled.length <= getFarViewPointLimit(25));
      assert.equal(unchanged.length, 10);
    },
  },
  {
    name: "isNewerId supports bigint-like ids and null current values",
    run: () => {
      assert.equal(isNewerId("10", "9"), true);
      assert.equal(isNewerId("9", "10"), false);
      assert.equal(isNewerId("5", null), true);
      assert.equal(isNewerId(null, "10"), false);
    },
  },
];

let failures = 0;

for (const testCase of tests) {
  try {
    testCase.run();
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`\nAll tests passed: ${tests.length}`);
}
