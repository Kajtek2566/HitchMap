"use strict";

require("dotenv").config();

const { Pool } = require("pg");

const { createApp } = require("./app");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;

const requiredEnv = ["DB_USER", "DB_HOST", "DB_NAME", "DB_PASSWORD", "DB_PORT"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Brakuje zmiennych srodowiskowych backendu: ${missingEnv.join(", ")}`);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const app = createApp({ pool });

app.listen(PORT, HOST, () => {
  console.log(`Server dziala na adresie ${HOST}:${PORT}`);
});
