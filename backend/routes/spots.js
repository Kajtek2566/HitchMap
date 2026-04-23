"use strict";

const express = require("express");

const createSpotRouter = ({ pool, logger, formatCurrentTimestamp, getSpotDateColumn, getSpotSelectClause }) => {
  const router = express.Router();

  router.get("/spots", async (req, res) => {
    try {
      const { lat, lon, limit } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({ error: "Brak parametrow lat i lon" });
      }

      const parsedLimit = Number(limit);
      const safeLimit =
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(Math.floor(parsedLimit), 100)
          : 100;

      const spotSelect = await getSpotSelectClause("hp");

      const query = `
        WITH nearest_locations AS (
          SELECT DISTINCT ON (lat, lon)
            lat,
            lon,
            location
          FROM hitchhiking_points
          WHERE location IS NOT NULL
          ORDER BY
            lat,
            lon,
            location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ),
        limited_locations AS (
          SELECT
            lat,
            lon,
            location
          FROM nearest_locations
          ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          LIMIT $3
        )
        SELECT
          ${spotSelect}
        FROM hitchhiking_points hp
        INNER JOIN limited_locations ll
          ON hp.lat = ll.lat
         AND hp.lon = ll.lon
        WHERE hp.location IS NOT NULL
        ORDER BY
          ll.location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          hp.lat,
          hp.lon
      `;

      const result = await pool.query(query, [Number(lon), Number(lat), safeLimit]);
      return res.json(result.rows);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/spots/offline", async (req, res) => {
    try {
      const rawCountries = typeof req.query.countries === "string" ? req.query.countries : "";
      const countries = rawCountries
        .split(",")
        .map((country) => country.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 20);

      if (countries.length === 0) {
        return res.status(400).json({ error: "Podaj przynajmniej jeden kraj." });
      }

      const spotSelect = await getSpotSelectClause();
      const result = await pool.query(
        `
          SELECT
            ${spotSelect}
          FROM hitchhiking_points
          WHERE location IS NOT NULL
            AND country = ANY($1::text[])
          ORDER BY country, lat, lon
        `,
        [countries],
      );

      return res.json(result.rows);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/spots/visible", async (req, res) => {
    try {
      const minLat = Number(req.query.minLat);
      const maxLat = Number(req.query.maxLat);
      const minLon = Number(req.query.minLon);
      const maxLon = Number(req.query.maxLon);
      const parsedLimit = Number(req.query.limit);
      const safeLimit =
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(Math.floor(parsedLimit), 10000)
          : 5000;

      if (
        !Number.isFinite(minLat) ||
        !Number.isFinite(maxLat) ||
        !Number.isFinite(minLon) ||
        !Number.isFinite(maxLon)
      ) {
        return res.status(400).json({ error: "Brak poprawnych granic obszaru." });
      }

      const spotSelect = await getSpotSelectClause();
      const dateColumn = await getSpotDateColumn();
      const orderByDate = dateColumn
        ? `
            CASE WHEN ${dateColumn} IS NULL THEN 1 ELSE 0 END,
            ${dateColumn} DESC,
          `
        : "";
      const result = await pool.query(
        `
          SELECT
            ${spotSelect}
          FROM hitchhiking_points
          WHERE lat BETWEEN $1 AND $2
            AND lon BETWEEN $3 AND $4
          ORDER BY
            ${orderByDate}
            rating DESC,
            id DESC
          LIMIT $5
        `,
        [minLat, maxLat, minLon, maxLon, safeLimit],
      );

      return res.json({
        spots: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/sync/full", async (req, res) => {
    try {
      const afterId = typeof req.query.afterId === "string" ? req.query.afterId.trim() : "";
      const parsedLimit = Number(req.query.limit);
      const safeLimit =
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(Math.floor(parsedLimit), 5000)
          : 2000;

      const spotSelect = await getSpotSelectClause();
      const values = [];
      let whereClause = `
        WHERE lat IS NOT NULL
          AND lon IS NOT NULL
      `;

      if (afterId) {
        values.push(afterId);
        whereClause += `
          AND id > $1::bigint
        `;
      }

      values.push(safeLimit);
      const limitPlaceholder = `$${values.length}`;

      const result = await pool.query(
        `
          SELECT
          ${spotSelect}
          FROM hitchhiking_points
          ${whereClause}
          ORDER BY id
          LIMIT ${limitPlaceholder}
        `,
        values,
      );

      const total =
        afterId.length === 0
          ? (
              await pool.query(
                `
                  SELECT COUNT(*)::int AS total
                  FROM hitchhiking_points
                  WHERE lat IS NOT NULL
                    AND lon IS NOT NULL
                `,
              )
            ).rows[0]?.total ?? result.rows.length
          : null;

      return res.json({
        spots: result.rows,
        lastSyncId: result.rows[result.rows.length - 1]?.id ?? null,
        total,
        pageCount: result.rows.length,
        hasMore: result.rows.length === safeLimit,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/sync/changes", async (req, res) => {
    try {
      const sinceId = typeof req.query.sinceId === "string" ? req.query.sinceId.trim() : "";

      if (!sinceId) {
        return res.status(400).json({ error: "Brak sinceId." });
      }

      const spotSelect = await getSpotSelectClause();
      const result = await pool.query(
        `
          SELECT
            ${spotSelect}
          FROM hitchhiking_points
          WHERE lat IS NOT NULL
            AND lon IS NOT NULL
            AND id > $1::bigint
          ORDER BY id
        `,
        [sinceId],
      );

      return res.json({
        spots: result.rows,
        lastSyncId: result.rows[result.rows.length - 1]?.id ?? sinceId,
        total: result.rows.length,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.post("/spots/reviews", async (req, res) => {
    try {
      const { lat, lon, rating, comment, country } = req.body ?? {};
      const parsedLat = Number(lat);
      const parsedLon = Number(lon);
      const parsedRating = Number(rating);
      const normalizedComment =
        typeof comment === "string" && comment.trim().length > 0
          ? comment.trim()
          : null;
      const normalizedCountry =
        typeof country === "string" && country.trim().length > 0
          ? country.trim()
          : null;

      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
        return res.status(400).json({ error: "Nieprawidlowe wspolrzedne." });
      }

      if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ error: "Ocena musi byc liczba od 1 do 5." });
      }

      const nextIdResult = await pool.query(
        "SELECT COALESCE(MAX(id), -1)::bigint + 1 AS next_id FROM hitchhiking_points",
      );

      const nextId = nextIdResult.rows[0]?.next_id;
      const dateColumn = await getSpotDateColumn();
      const timestampValue = formatCurrentTimestamp();

      const insertColumns = [
        "id",
        "lat",
        "lon",
        "rating",
        "country",
        "comment",
        "reviewed",
        "banned",
        "location",
      ];
      const values = [
        nextId,
        parsedLat,
        parsedLon,
        parsedRating,
        normalizedCountry,
        normalizedComment,
        "1",
        "0",
      ];

      if (dateColumn) {
        insertColumns.splice(6, 0, dateColumn);
        values.splice(6, 0, timestampValue);
      }

      const valuePlaceholders = values.map((_, index) => `$${index + 1}`);
      valuePlaceholders.push("ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography");

      const query = `
        INSERT INTO hitchhiking_points (${insertColumns.join(", ")})
        VALUES (${valuePlaceholders.join(", ")})
        RETURNING
          id,
          lat,
          lon,
          rating,
          country,
          comment,
          ${dateColumn ? `${dateColumn} AS created_at` : "NULL::text AS created_at"}
      `;

      const result = await pool.query(query, values);
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  return router;
};

module.exports = {
  createSpotRouter,
};
