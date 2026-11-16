const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { db, hashPassword, verifyPassword } = require("./database");

const root = __dirname;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const json = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};

const read = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    // Allow up to 10MB to accommodate photo canvas uploads
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body too large (max 10MB)"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
  });

const cookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map((x) => x.trim().split("="))
  );

const userOf = (req) => {
  const token = cookies(req).tripmate_session;
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return db
    .prepare(
      "SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > datetime('now')"
    )
    .get(hash);
};

const access = (req, tripId) => {
  const user = userOf(req);
  if (!user) return null;
  const tripMembership = db
    .prepare(
      "SELECT tm.*, t.name, t.destination, t.starts_on, t.ends_on FROM trip_members tm JOIN trips t ON t.id = tm.trip_id WHERE tm.trip_id = ? AND tm.user_id = ?"
    )
    .get(tripId, user.id);
  return tripMembership ? { u: user, a: tripMembership } : null;
};

const amount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  return Math.round(n * 100);
};

const placeCategory = (tags = {}) => {
  if (tags.amenity === "restaurant" || tags.amenity === "cafe" || tags.amenity === "fast_food" || tags.amenity === "bar") return "food";
  if (tags.tourism || tags.historic || tags.natural || tags.leisure) return "sight";
  return "experience";
};

const placeTitle = (element) =>
  element.tags?.name ||
  element.tags?.amenity ||
  element.tags?.tourism ||
  element.tags?.historic ||
  "Local place";

async function findPlaces(query, category = "all") {
  const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
  geocodeUrl.searchParams.set("q", query);
  geocodeUrl.searchParams.set("format", "jsonv2");
  geocodeUrl.searchParams.set("limit", "1");
  const geocodeResponse = await fetch(geocodeUrl, {
    headers: { "User-Agent": "TripMate/1.0 (local travel planner)" }
  });
  if (!geocodeResponse.ok) throw new Error("Location search is temporarily unavailable");
  const locations = await geocodeResponse.json();
  if (!locations.length) throw new Error("Location not found. Try a city, neighbourhood, or landmark.");

  const lat = Number(locations[0].lat);
  const lon = Number(locations[0].lon);
  const overpassQuery = `[out:json][timeout:20];(nwr(around:5000,${lat},${lon})[name][amenity~"restaurant|cafe|fast_food|bar"];nwr(around:5000,${lat},${lon})[name][tourism];nwr(around:5000,${lat},${lon})[name][historic];nwr(around:5000,${lat},${lon})[name][leisure];);out center tags;`;
  const overpassResponse = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain", "User-Agent": "TripMate/1.0 (local travel planner)" },
    body: overpassQuery
  });
  if (!overpassResponse.ok) throw new Error("Nearby place search is temporarily unavailable");
  const result = await overpassResponse.json();
  const places = result.elements
    .map((element) => {
      const tags = element.tags || {};
      const elementLat = element.lat ?? element.center?.lat;
      const elementLon = element.lon ?? element.center?.lon;
      const type = placeCategory(tags);
      return {
        id: `${element.type}/${element.id}`,
        latitude: elementLat ? Number(elementLat) : null,
        longitude: elementLon ? Number(elementLon) : null,
        category: type,
        label: type === "food" ? "Local food" : type === "sight" ? "Places to see" : "Things to do",
        title: placeTitle(element),
        description: tags.cuisine ? `${tags.cuisine.replaceAll(";", ", ")} · ${tags.amenity || "Local spot"}` : tags.description || "A nearby place worth exploring.",
        address: tags["addr:street"] ? `${tags["addr:housenumber"] || ""} ${tags["addr:street"]}`.trim() : "",
        image: tags.image || "",
        mapUrl: elementLat && elementLon ? `https://www.openstreetmap.org/?mlat=${elementLat}&mlon=${elementLon}#map=18/${elementLat}/${elementLon}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(placeTitle(element))}`
      };
    })
    .filter((place, index, all) => (category === "all" || place.category === category) && all.findIndex((item) => item.title === place.title) === index)
    .slice(0, 18);

  return { location: locations[0].display_name, latitude: lat, longitude: lon, places };
}

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: { "User-Agent": "TripMate/1.0 (local travel planner)" } });
  if (!response.ok) throw new Error("Location search is temporarily unavailable");
  const locations = await response.json();
  if (!locations.length) throw new Error("Location not found. Try a city or neighbourhood.");
  return { name: locations[0].display_name, latitude: Number(locations[0].lat), longitude: Number(locations[0].lon) };
}

async function createAiPlan(body) {
  const prompt = `Create a practical day-wise travel itinerary. Destination: ${body.destination}. Days: ${body.days}. Travel style: ${body.style || "balanced"}. Interests: ${body.interests || "local food, culture, relaxed sightseeing"}. Return only valid JSON with keys summary and days; days is an array of objects with day, title, morning, afternoon, evening, and practicalTip. Do not invent exact prices, ratings, opening hours, or transport availability.`;

  if (process.env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
        text: { format: { type: "json_object" } }
      })
    });
    if (!response.ok) throw new Error("AI planner request failed. Check the configured API key.");
    const result = await response.json();
    if (!result.output_text) throw new Error("AI planner returned an empty response");
    return JSON.parse(result.output_text);
  }

  const response = await fetch(`${process.env.OLLAMA_URL || "http://127.0.0.1:11434"}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || "llama3.2",
      prompt,
      format: "json",
      stream: false
    })
  }).catch(() => null);
  if (!response) {
    throw new Error("Start Ollama locally, then run: ollama pull llama3.2");
  }
  if (!response.ok) {
    throw new Error("Ollama could not generate a plan. Check that the selected model is installed.");
  }
  const result = await response.json();
  if (!result.response) throw new Error("Ollama returned an empty response");
  return JSON.parse(result.response);
}

const tripMemberIds = (tripId) =>
  new Set(
    db
      .prepare("SELECT user_id FROM trip_members WHERE trip_id = ?")
      .all(tripId)
      .map((x) => x.user_id)
  );

const expenseInput = (data, memberIds, current = {}) => {
  const description = String(data.description ?? current.description ?? "").trim();
  if (!description) return [null, "Description is required"];

  const rawAmount = data.amount ?? (current.amount_paise ? current.amount_paise / 100 : undefined);
  let amountPaise;
  try {
    amountPaise = amount(rawAmount);
  } catch (err) {
    return [null, err.message];
  }

  const paidBy = Number(data.paidBy ?? current.paid_by);
  if (!memberIds.has(paidBy)) {
    return [null, "The payer must be a trip member"];
  }

  const splits = data.splits || [{ userId: paidBy, share: Number(rawAmount) }];
  if (!Array.isArray(splits) || !splits.length) {
    return [null, "At least one expense split is required"];
  }

  let splitTotal = 0;
  const normalized = [];
  for (const split of splits) {
    const userId = Number(split.userId);
    const share = Number(split.share);
    if (!memberIds.has(userId) || !Number.isFinite(share) || share < 0) {
      return [null, "Expense splits must use trip members and valid amounts"];
    }
    const sharePaise = Math.round(share * 100);
    splitTotal += sharePaise;
    normalized.push({ userId, sharePaise });
  }

  if (splitTotal !== amountPaise) {
    return [null, "Expense splits must add up to the total amount"];
  }

  return [
    {
      description,
      amountPaise,
      paidBy,
      category: String(data.category ?? current.category ?? "Other").trim() || "Other",
      date: String(data.date ?? current.spent_on ?? new Date().toISOString().slice(0, 10)),
      notes: data.notes === undefined ? current.notes ?? null : String(data.notes).trim() || null,
      splits: normalized
    }
  ];
};

async function api(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.split("/").filter(Boolean);

  try {
    // 1. Auth routes
    if (u.pathname === "/api/auth/register" && req.method === "POST") {
      const body = await read(req);
      if (!body.name || !body.email || !body.password || body.password.length < 8) {
        return json(res, 400, {
          error: "Name, email and a password of at least 8 characters are required"
        });
      }
      const user = db
        .prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?) RETURNING id,name,email")
        .get(body.name.trim(), body.email.trim().toLowerCase(), hashPassword(body.password));
      return json(res, 201, { user });
    }

    if (u.pathname === "/api/auth/login" && req.method === "POST") {
      const body = await read(req);
      const user = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(String(body.email || "").toLowerCase());
      if (!user || !verifyPassword(String(body.password || ""), user.password_hash)) {
        return json(res, 401, { error: "Invalid email or password" });
      }
      const token = crypto.randomBytes(32).toString("hex");
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      db.prepare("INSERT INTO sessions VALUES(?,?,datetime('now','+7 days'))").run(hash, user.id);
      res.setHeader(
        "Set-Cookie",
        `tripmate_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`
      );
      return json(res, 200, { user: { id: user.id, name: user.name, email: user.email } });
    }

    if (u.pathname === "/api/auth/logout" && req.method === "POST") {
      const token = cookies(req).tripmate_session;
      if (token) {
        const hash = crypto.createHash("sha256").update(token).digest("hex");
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash);
      }
      res.setHeader("Set-Cookie", "tripmate_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
      return json(res, 200, { ok: true });
    }

    if (u.pathname === "/api/me") {
      return json(res, 200, { user: userOf(req) });
    }

    if (u.pathname === "/api/places" && req.method === "GET") {
      const query = String(u.searchParams.get("query") || "").trim();
      const category = String(u.searchParams.get("category") || "all");
      if (query.length < 2) return json(res, 400, { error: "Enter a location to search" });
      if (!["all", "food", "sight", "experience"].includes(category)) {
        return json(res, 400, { error: "Invalid place category" });
      }
      const places = await findPlaces(query, category);
      return json(res, 200, places);
    }

    if (u.pathname === "/api/weather" && req.method === "GET") {
      const query = String(u.searchParams.get("query") || "").trim();
      if (query.length < 2) return json(res, 400, { error: "Enter a location for weather" });
      const location = await geocode(query);
      const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
      weatherUrl.searchParams.set("latitude", location.latitude);
      weatherUrl.searchParams.set("longitude", location.longitude);
      weatherUrl.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
      weatherUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
      weatherUrl.searchParams.set("timezone", "auto");
      const weatherResponse = await fetch(weatherUrl);
      if (!weatherResponse.ok) throw new Error("Weather service is temporarily unavailable");
      return json(res, 200, { location, weather: await weatherResponse.json() });
    }

    if (u.pathname === "/api/ai/plan" && req.method === "POST") {
      const body = await read(req);
      if (!String(body.destination || "").trim() || !Number.isInteger(Number(body.days)) || Number(body.days) < 1 || Number(body.days) > 30) {
        return json(res, 400, { error: "Destination and a trip length from 1 to 30 days are required" });
      }
      return json(res, 200, { plan: await createAiPlan(body) });
    }

    // 2. User's trips list
    if (u.pathname === "/api/trips" && req.method === "GET") {
      const user = userOf(req);
      if (!user) return json(res, 401, { error: "Authentication required" });
      const trips = db
        .prepare(
          `SELECT t.*, tm.role 
           FROM trips t 
           JOIN trip_members tm ON tm.trip_id = t.id 
           WHERE tm.user_id = ? 
           ORDER BY t.id`
        )
        .all(user.id);
      return json(res, 200, { trips });
    }

    if (u.pathname === "/api/trips" && req.method === "POST") {
      const user = userOf(req);
      if (!user) return json(res, 401, { error: "Authentication required" });
      const body = await read(req);
      const name = String(body.name || "").trim();
      const destination = String(body.destination || "").trim();
      if (!name || !destination) {
        return json(res, 400, { error: "Trip name and destination are required" });
      }
      const trip = db
        .prepare(
          "INSERT INTO trips (name, destination, starts_on, ends_on, owner_id) VALUES (?,?,?,?,?) RETURNING id, name, destination, starts_on, ends_on"
        )
        .get(name, destination, body.starts_on || null, body.ends_on || null, user.id);
      db.prepare("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?,?,?)").run(trip.id, user.id, "treasurer");
      return json(res, 201, { trip });
    }

    // 3. Trip-specific routes
    if (p[0] === "api" && p[1] === "trips" && p[2]) {
      const tripId = Number(p[2]);
      const ctx = access(req, tripId);
      if (!ctx) {
        return json(res, 401, { error: "Authentication and trip membership are required" });
      }

      // Add member to trip
      if (p[3] === "members" && req.method === "POST") {
        const body = await read(req);
        const email = String(body.email || "").trim().toLowerCase();
        const name = String(body.name || "").trim();
        const role = body.role === "treasurer" ? "treasurer" : "member";
        if (!email) {
          return json(res, 400, { error: "Member email is required" });
        }
        let targetUser = db.prepare("SELECT id, name, email FROM users WHERE email = ?").get(email);
        if (!targetUser) {
          if (!name) return json(res, 400, { error: "Name is required for new users" });
          targetUser = db
            .prepare("INSERT INTO users (name, email, password_hash) VALUES (?,?,?) RETURNING id, name, email")
            .get(name, email, hashPassword("tripmate"));
        }
        const existing = db
          .prepare("SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ?")
          .get(tripId, targetUser.id);
        if (existing) {
          return json(res, 400, { error: "User is already a member of this trip" });
        }
        db.prepare("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?,?,?)").run(tripId, targetUser.id, role);
        return json(res, 201, { member: { ...targetUser, role } });
      }

      // Trip details & members
      if (p.length === 3) {
        const members = db
          .prepare(
            `SELECT u.id, u.name, u.email, tm.role 
             FROM trip_members tm 
             JOIN users u ON u.id = tm.user_id 
             WHERE tm.trip_id = ?`
          )
          .all(tripId);
        return json(res, 200, { trip: ctx.a, members, user: ctx.u });
      }

      // Expenses GET
      if (p[3] === "expenses" && req.method === "GET") {
        const expenses = db
          .prepare(
            `SELECT e.*, u.name as paid_by_name 
             FROM expenses e 
             JOIN users u ON u.id = e.paid_by 
             WHERE e.trip_id = ? AND e.voided_at IS NULL 
             ORDER BY e.spent_on DESC, e.id DESC`
          )
          .all(tripId);

        const splits = db
          .prepare(
            `SELECT es.expense_id, es.user_id, es.share_paise, u.name 
             FROM expense_splits es 
             JOIN users u ON u.id = es.user_id 
             WHERE es.expense_id IN (SELECT id FROM expenses WHERE trip_id = ? AND voided_at IS NULL)`
          )
          .all(tripId);

        for (const expense of expenses) {
          expense.splits = splits.filter((s) => s.expense_id === expense.id);
        }
        return json(res, 200, { expenses });
      }

      // Expenses POST & PATCH
      if (p[3] === "expenses" && (req.method === "POST" || req.method === "PATCH")) {
        const body = await read(req);
        const memberIds = tripMemberIds(tripId);
        const existing =
          req.method === "PATCH" &&
          db
            .prepare("SELECT * FROM expenses WHERE id = ? AND trip_id = ? AND voided_at IS NULL")
            .get(Number(p[4]), tripId);

        if (req.method === "PATCH" && !existing) {
          return json(res, 404, { error: "Expense not found" });
        }

        const [val, error] = expenseInput(body, memberIds, existing || {});
        if (error) return json(res, 400, { error });

        if (req.method === "POST") {
          const inserted = db
            .prepare(
              `INSERT INTO expenses(trip_id, description, amount_paise, paid_by, category, spent_on, notes) 
               VALUES(?,?,?,?,?,?,?) RETURNING id`
            )
            .get(tripId, val.description, val.amountPaise, val.paidBy, val.category, val.date, val.notes);

          for (const s of val.splits) {
            db.prepare("INSERT INTO expense_splits VALUES(?,?,?)").run(inserted.id, s.userId, s.sharePaise);
          }
          return json(res, 201, inserted);
        }

        db.prepare(
          `UPDATE expenses 
           SET description = ?, amount_paise = ?, paid_by = ?, category = ?, spent_on = ?, notes = ? 
           WHERE id = ? AND trip_id = ?`
        ).run(val.description, val.amountPaise, val.paidBy, val.category, val.date, val.notes, existing.id, tripId);

        db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(existing.id);
        for (const s of val.splits) {
          db.prepare("INSERT INTO expense_splits VALUES(?,?,?)").run(existing.id, s.userId, s.sharePaise);
        }
        return json(res, 200, { id: existing.id });
      }

      // Expenses DELETE (void)
      if (p[3] === "expenses" && req.method === "DELETE") {
        const expense = db
          .prepare("SELECT id FROM expenses WHERE id = ? AND trip_id = ? AND voided_at IS NULL")
          .get(Number(p[4]), tripId);
        if (!expense) return json(res, 404, { error: "Expense not found" });
        db.prepare("UPDATE expenses SET voided_at = datetime('now') WHERE id = ?").run(expense.id);
        return json(res, 200, { ok: true });
      }

      // Wallet GET & POST
      if (p[3] === "wallet" && req.method === "GET") {
        const entries = db
          .prepare(
            `SELECT w.*, u.name as member_name 
             FROM wallet_entries w 
             JOIN users u ON u.id = w.member_id 
             WHERE w.trip_id = ? 
             ORDER BY w.id DESC`
          )
          .all(tripId);
        return json(res, 200, { entries });
      }

      if (p[3] === "wallet" && req.method === "POST") {
        const body = await read(req);
        const memberId = Number(body.memberId || ctx.u.id);
        const memberIds = tripMemberIds(tripId);
        if (!memberIds.has(memberId)) {
          return json(res, 400, { error: "Target member must belong to this trip" });
        }
        const inserted = db
          .prepare(
            `INSERT INTO wallet_entries(trip_id, type, amount_paise, member_id, note) 
             VALUES(?,?,?,?,?) RETURNING id`
          )
          .get(
            tripId,
            body.type === "transfer" ? "transfer" : "contribution",
            amount(body.amount),
            memberId,
            body.note ? String(body.note).trim() : null
          );
        return json(res, 201, inserted);
      }

      // Summary
      if (p[3] === "summary") {
        const q = (sql) => db.prepare(sql).get(tripId).total;
        const expenses = q(
          "SELECT COALESCE(SUM(amount_paise), 0) as total FROM expenses WHERE trip_id = ? AND voided_at IS NULL"
        );
        const contributions = q(
          "SELECT COALESCE(SUM(amount_paise), 0) as total FROM wallet_entries WHERE trip_id = ? AND type = 'contribution'"
        );
        const transfers = q(
          "SELECT COALESCE(SUM(amount_paise), 0) as total FROM wallet_entries WHERE trip_id = ? AND type = 'transfer'"
        );
        return json(res, 200, {
          expenses,
          contributions,
          transfers,
          walletBalance: contributions - transfers - expenses
        });
      }

      // Photos GET, POST, DELETE
      if (p[3] === "photos" && req.method === "GET") {
        const photos = db
          .prepare(
            `SELECT p.id, p.trip_id, p.uploader_id, p.filename, p.mime_type, p.caption, p.created_at, p.data, u.name as uploader_name 
             FROM photos p 
             JOIN users u ON u.id = p.uploader_id 
             WHERE p.trip_id = ? 
             ORDER BY p.id DESC`
          )
          .all(tripId);
        return json(res, 200, { photos });
      }

      if (p[3] === "photos" && req.method === "POST") {
        const body = await read(req);
        if (!body.data) {
          return json(res, 400, { error: "Photo data is required" });
        }
        const photo = db
          .prepare(
            `INSERT INTO photos(trip_id, uploader_id, filename, mime_type, data, caption) 
             VALUES(?,?,?,?,?,?) RETURNING id, filename, mime_type, caption, created_at`
          )
          .get(
            tripId,
            ctx.u.id,
            String(body.filename || `memory_${Date.now()}.jpg`).trim(),
            String(body.mimeType || "image/jpeg").trim(),
            String(body.data),
            String(body.caption || "Trip memory").trim()
          );
        return json(res, 201, { photo });
      }

      if (p[3] === "photos" && req.method === "DELETE") {
        const photoId = Number(p[4]);
        const existing = db
          .prepare("SELECT * FROM photos WHERE id = ? AND trip_id = ?")
          .get(photoId, tripId);
        if (!existing) return json(res, 404, { error: "Photo not found" });
        if (existing.uploader_id !== ctx.u.id && ctx.a.role !== "treasurer") {
          return json(res, 403, { error: "Only the uploader or treasurer can delete this photo" });
        }
        db.prepare("DELETE FROM photos WHERE id = ?").run(photoId);
        return json(res, 200, { ok: true });
      }
    }

    // 4. Static file delivery
    const safePath = u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname).replace(/^\/+/, "");
    const file = path.resolve(root, safePath);

    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return json(res, 404, { error: "Not found" });
    }

    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    return fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    const isConflict = err.message && err.message.includes("UNIQUE");
    return json(res, isConflict ? 409 : 400, { error: err.message });
  }
}

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
  http.createServer(api).listen(port, "0.0.0.0", () => {
    console.log(
      `TripMate server running at http://localhost:${port} (LAN: http://${process.env.LAN_HOST || "your-computer-ip"}:${port})`
    );
  });
}

module.exports = { api };
