import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import {
  addProduct,
  approveOrRejectProduct,
  deleteProduct,
  getAllProducts,
  getApprovedProducts,
  getPendingProducts,
  getProductById,
  getVendorProducts,
  markProductActive,
  markProductOutOfStock,
  updateProductDetails,
  updateProductPrice,
} from "../controllers/product.controller.js";

const router = Router();




// public routes
router.get("/public", getAllProducts);


//product routes
router.post("/add", upload.single("productImage"), addProduct);
// get pending products
router.get("/pending", getPendingProducts);
// Update Product Price
router.put("/price/:productId", updateProductPrice);
// Mark product as out of stock
router.put("/out-of-stock/:productId", markProductOutOfStock);
// Mark product as active
router.put("/activate/:productId", markProductActive);
// Delete product
router.delete("/delete/:productId", deleteProduct);
// Approve or Reject a product by ID
router.put("/:action/:productId", approveOrRejectProduct);
// Get all products for the vendor
router.get("/my-products",  getVendorProducts);
// get only approved products
router.get("/approved", getApprovedProducts);
// get product by id
router.get("/:id", getProductById);


// update product price
router.put("/:productId/price", updateProductPrice);








//  update product details
router.put("/:productId", updateProductDetails);

export default router;
