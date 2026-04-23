"use strict";

const express = require("express");

const createHealthRouter = ({ pool, logger }) => {
  const router = express.Router();

  router.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ ok: false, error: "Database error" });
    }
  });

  return router;
};

module.exports = {
  createHealthRouter,
};
