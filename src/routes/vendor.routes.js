import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import {
  applyVendor,
  getAllVendorApplications,
  getVendorApplications,
  handleVendorApplication,
} from "../controllers/vendor.controller.js";

const router = Router();

//vendor routes
router.post(
  "/apply",
  verifyFirebaseToken,
  upload.single("coverPhoto"),
  applyVendor
);
    // vendor application routes
// get all vendor applications
router.get("/applications/all", getAllVendorApplications);
// get vendor applications
router.get("/applications", getVendorApplications);
// Handle approve/reject vendor application
router.put("/application", handleVendorApplication);



export default router;
