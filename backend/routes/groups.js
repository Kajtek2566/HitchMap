"use strict";

const express = require("express");

const createGroupRouter = ({ groupStore, logger }) => {
  const router = express.Router();

  router.post("/groups/create", async (req, res) => {
    const { userId, displayName, avatarUri } = req.body ?? {};

    if (!userId) {
      return res.status(400).json({ error: "Brak userId." });
    }

    try {
      const group = await groupStore.createGroup({ userId, displayName, avatarUri });
      return res.status(201).json(group);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.post("/groups/join", async (req, res) => {
    const { code, userId, displayName, avatarUri } = req.body ?? {};

    if (!code || !userId) {
      return res.status(400).json({ error: "Brak code lub userId." });
    }

    try {
      const group = await groupStore.joinGroup({ code, userId, displayName, avatarUri });
      if (!group) {
        return res.status(404).json({ error: "Nie znaleziono grupy o takim kodzie." });
      }

      return res.json(group);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.post("/groups/location", async (req, res) => {
    const { code, userId, lat, lon } = req.body ?? {};
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!normalizedCode || !userId) {
      return res.status(400).json({ error: "Brak code lub userId." });
    }

    const parsedLat = Number(lat);
    const parsedLon = Number(lon);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
      return res.status(400).json({ error: "Nieprawidlowe wspolrzedne." });
    }

    try {
      const group = await groupStore.updateLocation({
        code: normalizedCode,
        userId,
        lat: parsedLat,
        lon: parsedLon,
      });

      if (group === "not-member") {
        return res.status(404).json({ error: "Uzytkownik nie nalezy do grupy." });
      }

      if (!group) {
        return res.status(404).json({ error: "Nie znaleziono grupy." });
      }

      return res.json(group);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.post("/groups/leave", async (req, res) => {
    const { code, userId } = req.body ?? {};
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!normalizedCode || !userId) {
      return res.status(400).json({ error: "Brak code lub userId." });
    }

    try {
      const group = await groupStore.leaveGroup({ code: normalizedCode, userId });
      if (!group) {
        return res.status(404).json({ error: "Nie znaleziono grupy." });
      }

      return res.json(group);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.post("/groups/rename", async (req, res) => {
    const { code, userId, name } = req.body ?? {};
    const normalizedCode = String(code || "").trim().toUpperCase();
    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (!normalizedCode || !userId) {
      return res.status(400).json({ error: "Brak code lub userId." });
    }

    if (normalizedName.length < 3) {
      return res.status(400).json({ error: "Nazwa grupy musi miec co najmniej 3 znaki." });
    }

    if (normalizedName.length > 40) {
      return res.status(400).json({ error: "Nazwa grupy moze miec maksymalnie 40 znakow." });
    }

    try {
      const group = await groupStore.renameGroup({
        code: normalizedCode,
        userId,
        name: normalizedName,
      });

      if (group === "forbidden") {
        return res.status(403).json({ error: "Tylko zalozyciel grupy moze zmienic jej nazwe." });
      }

      if (!group) {
        return res.status(404).json({ error: "Nie znaleziono grupy." });
      }

      return res.json(group);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.post("/groups/remove-member", async (req, res) => {
    const { code, userId, memberUserId } = req.body ?? {};
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!normalizedCode || !userId || !memberUserId) {
      return res.status(400).json({ error: "Brak code, userId lub memberUserId." });
    }

    try {
      const group = await groupStore.removeMember({
        code: normalizedCode,
        ownerUserId: userId,
        memberUserId,
      });

      if (group === "forbidden") {
        return res.status(403).json({ error: "Tylko zalozyciel grupy moze usuwac czlonkow." });
      }

      if (group === "owner") {
        return res.status(400).json({ error: "Zalozyciel nie moze usunac samego siebie." });
      }

      if (group === "not-member") {
        return res.status(404).json({ error: "Nie znaleziono takiego czlonka w grupie." });
      }

      if (!group) {
        return res.status(404).json({ error: "Nie znaleziono grupy." });
      }

      return res.json(group);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/groups", async (req, res) => {
    const currentUserId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";

    if (!currentUserId) {
      return res.status(400).json({ error: "Brak userId." });
    }

    try {
      const groups = await groupStore.listUserGroups(currentUserId);
      return res.json(groups);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/groups/:code", async (req, res) => {
    const normalizedCode = String(req.params.code || "").trim().toUpperCase();
    const currentUserId = typeof req.query.userId === "string" ? req.query.userId : null;

    try {
      const group = await groupStore.getGroup(normalizedCode, currentUserId);
      if (!group) {
        return res.status(404).json({ error: "Nie znaleziono grupy." });
      }

      return res.json(group);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: "Database error" });
    }
  });

  return router;
};

module.exports = {
  createGroupRouter,
};
