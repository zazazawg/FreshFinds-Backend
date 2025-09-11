import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import verifyFirebaseToken from "../middlewares/verifyFirebaseToken.js";

const router = Router();

// Sign up
router.post("/signup",verifyFirebaseToken, upload.single("photoURL"), registerUser);
// Sign in
router.post("/signin",verifyFirebaseToken, loginUser);
// sign out
router.post("/signout",logoutUser);
router.get("/profile", verifyFirebaseToken, (req, res) => {
  res.status(200).json({
    message: "Protected route accessed successfully",
    firebaseUser: req.firebaseUser, // comes from middleware
  });
});


export default router;
