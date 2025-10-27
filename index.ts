import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@/lib/auth";
import env from "@/env";

const app = express();
const port = env.PORT;

import cors from "cors";

app.use(
  cors({
    origin: env.ALLOWED_ORIGIN,
    methods: ["GET"],
    credentials: true,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

app.listen(port, () => {
	console.log(`Auth app listening on port ${port}`);
});