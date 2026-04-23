"use strict";

const express = require("express");
const cors = require("cors");

const { PostgresGroupStore } = require("./groupStore");
const { createGroupRouter } = require("./routes/groups");
const { createHealthRouter } = require("./routes/health");
const { createSpotRouter } = require("./routes/spots");

const DATE_COLUMN_CANDIDATES = [
  "datetime",
  "created_at",
  "added_at",
  "date_added",
  "created_on",
  "added_on",
  "created",
  "ride_datetime",
];

const formatCurrentTimestamp = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000000`;
};

const createApp = ({ pool, groupStore = new PostgresGroupStore(pool), logger = console }) => {
  const app = express();
  let cachedDateColumn;

  app.use(cors());
  app.use(express.json());

  const getSpotDateColumn = async () => {
    if (cachedDateColumn !== undefined) {
      return cachedDateColumn;
    }

    const result = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'hitchhiking_points'
          AND column_name = ANY($1::text[])
        ORDER BY array_position($1::text[], column_name)
        LIMIT 1
      `,
      [DATE_COLUMN_CANDIDATES],
    );

    cachedDateColumn = result.rows[0]?.column_name || null;
    return cachedDateColumn;
  };

  const getSpotSelectClause = async (tableAlias = null) => {
    const dateColumn = await getSpotDateColumn();
    const prefix = tableAlias ? `${tableAlias}.` : "";
    const dateSelect = dateColumn
      ? `${prefix}${dateColumn} AS created_at`
      : "NULL::text AS created_at";

    return `
      ${prefix}id::text AS id,
      ${prefix}lat,
      ${prefix}lon,
      ${prefix}rating,
      ${prefix}country,
      ${prefix}comment,
      ${dateSelect}
    `;
  };

  app.use(createHealthRouter({ pool, logger }));
  app.use(createSpotRouter({ pool, logger, formatCurrentTimestamp, getSpotDateColumn, getSpotSelectClause }));
  app.use(createGroupRouter({ groupStore, logger }));

  return app;
};

module.exports = {
  createApp,
};
