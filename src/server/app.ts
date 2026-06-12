import express from "express";
import multer from "multer";
import dbInit from "./db";
import apiRoutes from "./api";

const app = express();

app.use(express.json());

// Initialize Database safely
try {
  dbInit();
} catch (e) {
  console.error("Failed to initialize database:", e);
}

// Ensure media file uploads work safely in Serverless (Vercel uses readonly FS except /tmp)
const uploadDir = process.env.VERCEL ? "/tmp/uploads" : "uploads";
const upload = multer({ dest: uploadDir });

// Attach API rules
app.use("/api", upload.single("receipt"), apiRoutes);

export default app;
