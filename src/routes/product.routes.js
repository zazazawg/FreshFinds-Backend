import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import {
  addProduct,
  approveOrRejectProduct,
  getPendingProducts,
} from "../controllers/product.controller.js";

const router = Router();

//product routes
router.post("/add", upload.single("productImage"), addProduct);
// get pending products
router.get("/pending", getPendingProducts);

// Approve or Reject a product by ID
router.put("/:action/:productId", approveOrRejectProduct);
export default router;
