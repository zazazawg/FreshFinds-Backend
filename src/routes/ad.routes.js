import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import { approveAd, getActiveAds, getPendingAds, rejectAd, requestAd } from "../controllers/ad.controller.js";

const router = Router();

// ad routes

// request ad
router.post("/request",  requestAd);
// admin: get all ads
router.get("/pending",  getPendingAds);
// Admin: approve ad
router.patch("/:id/approve",  approveAd);
// Admin: reject ad
router.patch("/:id/reject", rejectAd);
// get active ads
router.get("/active",  getActiveAds);
export default router;