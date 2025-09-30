// api/index.js  <-- main entrypoint for Vercel
import dotenv from "dotenv";
dotenv.config();

import connectDB from "../src/db/index.js";
import app from "../src/app.js";

export default async function handler(req, res) {
  await connectDB();
  return app(req, res); // let Express handle the request
}
