import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";

import path from "path";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "fallback-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
    },
  }),
);

app.use("/api", router);

// Serve React Web Portal static assets
const staticPath = path.resolve(__dirname, "../../web-portal/dist/public");
app.use(express.static(staticPath));

// Fallback wildcard routing for React Router SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"), (err) => {
    if (err) {
      res.status(404).send("Not found");
    }
  });
});

export default app;
