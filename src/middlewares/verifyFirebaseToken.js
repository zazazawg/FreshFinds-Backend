import firebaseAdmin from "../config/firebase.js";
import ApiErr from "../utils/ApiErr.js";
import asyncHandler from "../utils/asyncHandler.js";

const verifyFirebaseToken = asyncHandler(async (req, res, next) => {
  const idToken = req.headers.authorization?.split(" ")[1]; 
  if (!idToken) {
    throw new ApiErr("No Firebase ID token provided", 401);
  }

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    throw new ApiErr("Invalid Firebase token", 403);
  }
});

export default verifyFirebaseToken;
