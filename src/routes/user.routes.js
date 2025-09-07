import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.js"


const router = Router();

router.route("/signup").post(upload.single("photoURL"),registerUser);

export default router;