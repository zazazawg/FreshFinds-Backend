import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import {
  addProduct,
  approveOrRejectProduct,
  deleteProduct,
  getApprovedProducts,
  getPendingProducts,
  getVendorProducts,
  markProductOutOfStock,
  updateProductDetails,
  updateProductPrice,
} from "../controllers/product.controller.js";

const router = Router();

//product routes
router.post("/add", upload.single("productImage"), addProduct);
// get pending products
router.get("/pending", getPendingProducts);

// Approve or Reject a product by ID
router.put("/:action/:productId", approveOrRejectProduct);
// Get all products for the vendor
router.get("/my-products",  getVendorProducts);
// get only approved products
router.get("/approved", getApprovedProducts);

// update product price
router.put("/:productId/price", updateProductPrice);

// Mark product as out of stock
router.put("/:productId/out-of-stock", markProductOutOfStock);

// Delete product
router.delete("/:productId/delete", deleteProduct);




//  update product details
router.put("/:productId", updateProductDetails);

export default router;
