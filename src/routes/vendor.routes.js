
import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import { applyVendor } from "../controllers/vendor.controller.js";


 const router = Router();


//vendor routes
router.post("/apply", verifyFirebaseToken, upload.single("coverPhoto"),applyVendor );


export default router;