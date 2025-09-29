import { Router } from "express";
import {
  banUser,
  createOrder,
  createPaymentIntent,
  getUserOrders,
  getUserProfile,
  getUsers,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
  updateUserRole,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.js";

const router = Router();

// Sign up
router.post(
  "/signup",
  verifyFirebaseToken,
  upload.single("photoURL"),
  registerUser
);
// Sign in
router.post("/signin", verifyFirebaseToken, loginUser);
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
router.get("/admin",  getUsers);
router.patch("/admin/:id/role",  updateUserRole);
router.patch("/admin/:id/ban",  banUser);


export default router;
