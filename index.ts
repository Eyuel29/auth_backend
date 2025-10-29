import { auth } from "@/lib/auth";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import morgan from "morgan";

const app = express();
const port = process.env.PORT;

app.use(
  morgan(':method :url :status')
);

const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || trustedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ["GET", "OPTIONS", "POST"],
    credentials: true,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

app.listen(port, () => {
  console.log(`Auth app listening on port ${port}`);
});
