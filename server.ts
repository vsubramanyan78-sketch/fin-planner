import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import dbInit from "./src/server/db";
import apiRoutes from "./src/server/api";

const upload = multer({ dest: "uploads/" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize DB locally
  dbInit();

  // API Routes
  app.use("/api", upload.single("receipt"), apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // In express 5, asterisks have to be named parameters, 
    // but the vite middleware uses older patterns. Vite's connect middleware directly handles it.
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
