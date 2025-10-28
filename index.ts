import env from "@/env";
import { auth } from "@/lib/auth";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import morgan from "morgan";

const app = express();
const port = env.PORT;

app.use(
  morgan(':method :url :status')
);

app.use(
  cors({
    origin: true,
    methods: ["GET", "OPTIONS", "POST"],
    credentials: true,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

app.listen(port, () => {
  console.log(`Auth app listening on port ${port}`);
});
