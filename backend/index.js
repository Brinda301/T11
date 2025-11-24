import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes.js";

dotenv.config();

const DEFAULT_ALLOWED_ORIGINS = [
	"http://localhost:5173",
	"http://127.0.0.1:5173",
	"http://localhost:4173",
	"http://127.0.0.1:4173",
];

const sanitizeOrigin = (origin) => {
	if (typeof origin !== "string") {
		return "";
	}

	return origin.trim().replace(/\/$/, "");
};

const configuredOrigins = (process.env.FRONTEND_URL || "")
	.split(",")
	.map(sanitizeOrigin)
	.filter((origin) => origin.length > 0);

const defaultOrigins = DEFAULT_ALLOWED_ORIGINS.map(sanitizeOrigin);
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);
const allowAllOrigins = configuredOrigins.length === 0;

const app = express();

app.use(
	cors({
		origin: (origin, callback) => {
			const normalizedOrigin = sanitizeOrigin(origin);

			if (!origin || allowAllOrigins || allowedOrigins.has(normalizedOrigin)) {
				callback(null, true);
			} else {
				callback(new Error("Not allowed by CORS"));
			}
		},
		credentials: true,
	}),
);
app.use(express.json());
app.use('', routes);

export default app;