import { Router } from "express";
import {
  authenticateUser,
  banUser,
  createOrder,
  createPaymentIntent,
  getAdminStats,
  getUserOrders,
  getUserProfile,
  getUsers,
  logoutUser,
  updateUserProfile,
  updateUserRole,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.js";

const router = Router();
// auth
router.post("/auth", verifyFirebaseToken, upload.single("photoURL"), authenticateUser);
// sign out
router.post("/signout", logoutUser);

router.post("/create-payment-intent", createPaymentIntent);

// order post
router.post("/order", createOrder);
// get user orders
router.get("/orders/:userId", getUserOrders);
// get user profile
router.get("/profile/:userId", getUserProfile);
// update user profile
router.put("/update/:userId", updateUserProfile);


// for admin
router.get("/admin/stats",  getAdminStats );
router.get("/admin", getUsers);
router.patch("/admin/:id/role",updateUserRole);
router.patch("/admin/:id/ban", banUser);


export default router;
