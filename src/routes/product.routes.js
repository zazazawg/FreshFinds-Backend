import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import { addProduct } from "../controllers/product.controller.js";

const router = Router();

//product routes
router.post(
  "/add",
  upload.single("productImage"),
  addProduct
);

export default router;
