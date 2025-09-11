import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

app.use(cookieParser());


// routes import
import userRoutes from "./routes/user.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";

// routes declaration
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/vendor", vendorRoutes);

export default app;
