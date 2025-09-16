
import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import { acceptVendorApplication, applyVendor, getVendorApplications, rejectVendorApplication } from "../controllers/vendor.controller.js";


 const router = Router();


//vendor routes
router.post("/apply", verifyFirebaseToken, upload.single("coverPhoto"),applyVendor );


// get vendor applications
router.get("/applications", verifyFirebaseToken, getVendorApplications);



// Accept vendor application
router.put("/vendor/:vendorId/accept", acceptVendorApplication);

// Reject vendor application
router.put("/vendor/:vendorId/reject", rejectVendorApplication);

export default router;