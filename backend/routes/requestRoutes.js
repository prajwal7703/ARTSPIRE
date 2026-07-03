// routes/requestRoutes.js

const express = require("express");
const router = express.Router();
const Request = require("../models/Request");
const Notification = require("../models/Notification");
const upload = require("../middleware/upload");
let Artist = null;
try { Artist = require("../models/Artist"); } catch {}

const getIo = (req) => req.app.get("io");

const DEFAULT_RADIUS_METERS = 25000; // 25km
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── CREATE A REQUEST — "Post what I want" ───────────────────────────────────
// POST /api/requests
// multipart/form-data: requesterId, requesterName, requesterAvatar, title,
// description, categories (comma-separated, optional), city (optional),
// lat, lng (optional but strongly recommended — powers real nearby matching),
// media (optional reference image file)
router.post("/", upload.single("media"), async (req, res) => {
  try {
    const {
      requesterId, requesterName, requesterAvatar,
      title, description, categories, city, lat, lng,
    } = req.body;

    if (!requesterId) return res.status(400).json({ message: "requesterId is required" });
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "title and description are required" });
    }

    const latNum = lat !== undefined ? Number(lat) : undefined;
    const lngNum = lng !== undefined ? Number(lng) : undefined;
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

    const request = await Request.create({
      requesterId,
      requesterName: requesterName || "Someone",
      requesterAvatar: requesterAvatar || "",
      title: title.trim(),
      description: description.trim(),
      referenceImage: req.file ? req.file.path : "",
      categories: categories ? categories.split(",").map((c) => c.trim()).filter(Boolean) : [],
      city: city || "",
      ...(hasCoords && { location: { type: "Point", coordinates: [lngNum, latNum] } }),
    });

    // ── Find nearby artists and notify them, live ──────────────────────────
    let nearbyArtists = [];
    if (Artist) {
      if (hasCoords) {
        nearbyArtists = await Artist.find({
          location: {
            $near: {
              $geometry: { type: "Point", coordinates: [lngNum, latNum] },
              $maxDistance: DEFAULT_RADIUS_METERS,
            },
          },
        }).select("name email");
      }
      // Fallback for artists who haven't shared live location yet:
      // match on city so the system still works before geolocation adoption.
      if (nearbyArtists.length === 0 && city) {
        nearbyArtists = await Artist.find({
          city: new RegExp(`^${escapeRegex(city)}$`, "i"),
        }).select("name email");
      }
    }

    const io = getIo(req);
    if (nearbyArtists.length > 0) {
      const notifDocs = nearbyArtists.map((artist) => ({
        toArtist: String(artist._id),
        fromName: request.requesterName,
        type: "request",
        message: `New request near you: "${request.title}"`,
      }));
      await Notification.insertMany(notifDocs);

      if (io) {
        nearbyArtists.forEach((artist) => {
          io.to(String(artist._id)).emit("new_request", request);
        });
      }
    }

    res.status(201).json({ request, notifiedArtists: nearbyArtists.length });
  } catch (err) {
    console.error("Create request error:", err);
    res.status(500).json({ message: "Failed to create request" });
  }
});

// ── NEARBY OPEN REQUESTS — an artist's live "requests near me" feed ────────
// GET /api/requests/nearby?lat=&lng=&radius=&city=
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, city } = req.query;
    const radius = Math.min(Number(req.query.radius) || DEFAULT_RADIUS_METERS, 100000);
    const latNum = lat !== undefined ? Number(lat) : undefined;
    const lngNum = lng !== undefined ? Number(lng) : undefined;
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

    let requests = [];
    if (hasCoords) {
      requests = await Request.find({
        status: "open",
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [lngNum, latNum] },
            $maxDistance: radius,
          },
        },
      }).limit(50);
    }

    if (requests.length === 0 && city) {
      requests = await Request.find({
        status: "open",
        city: new RegExp(`^${escapeRegex(city)}$`, "i"),
      }).sort({ createdAt: -1 }).limit(50);
    }

    // Last resort: no location and no city given — just show recent open
    // requests rather than an empty screen.
    if (requests.length === 0 && !hasCoords && !city) {
      requests = await Request.find({ status: "open" }).sort({ createdAt: -1 }).limit(50);
    }

    res.json({ requests });
  } catch (err) {
    console.error("Nearby requests error:", err);
    res.status(500).json({ message: "Failed to load nearby requests" });
  }
});

// ── A SINGLE REQUEST (with full response thread) ────────────────────────────
// GET /api/requests/:id
router.get("/:id", async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Failed to load request" });
  }
});

// ── REQUESTER'S OWN REQUESTS ──────────────────────────────────────────────
// GET /api/requests/mine/:requesterId
router.get("/mine/:requesterId", async (req, res) => {
  try {
    const requests = await Request.find({ requesterId: req.params.requesterId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to load your requests" });
  }
});

// ── ARTIST RESPONDS TO A REQUEST ────────────────────────────────────────────
// POST /api/requests/:id/respond
// body: { artistId, artistName, artistAvatar, message }
router.post("/:id/respond", async (req, res) => {
  try {
    const { artistId, artistName, artistAvatar, message } = req.body;
    if (!artistId || !message?.trim()) {
      return res.status(400).json({ message: "artistId and message are required" });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const response = { artistId, artistName: artistName || "An artist", artistAvatar: artistAvatar || "", message: message.trim() };
    request.responses.push(response);
    await request.save();

    // Notify the requester immediately — persisted + live, same pattern as
    // the nearby-artist notifications above (reusing the same Notification
    // model; the field is just an id string, it works for a requester's id
    // just as well as an artist's).
    await Notification.create({
      toArtist: request.requesterId,
      fromName: response.artistName,
      type: "request_response",
      message: `${response.artistName} responded to "${request.title}"`,
    });

    const io = getIo(req);
    if (io) {
      io.to(String(request.requesterId)).emit("new_request_response", {
        requestId: request._id,
        response: request.responses[request.responses.length - 1],
      });
    }

    res.status(201).json(request.responses[request.responses.length - 1]);
  } catch (err) {
    console.error("Respond to request error:", err);
    res.status(500).json({ message: "Failed to respond to request" });
  }
});

// ── CLOSE / MARK FULFILLED (requester only) ─────────────────────────────────
// PUT /api/requests/:id/close
// body: { requesterId, status: "fulfilled" | "closed" }
router.put("/:id/close", async (req, res) => {
  try {
    const { requesterId, status } = req.body;
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (String(request.requesterId) !== String(requesterId)) {
      return res.status(403).json({ message: "Not authorized to close this request" });
    }

    request.status = status === "fulfilled" ? "fulfilled" : "closed";
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Failed to update request" });
  }
});

module.exports = router;