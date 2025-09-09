import User from "../models/user.model.js";
import ApiRes from "../utils/ApiRes.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiErr from "../utils/ApiErr.js";
import {
  accessCookieOptions,
  refreshCookieOptions,
} from "../config/cookies.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiErr("Error generating tokens", 500);
  }
};
// Register User (Sign-Up)
const registerUser = asyncHandler(async (req, res) => {
  const firebaseUser = req.firebaseUser; // ✅ comes from middleware
  const userId = firebaseUser.uid;       // Trusted value
  const email = firebaseUser.email;      // Trusted value

  const { displayName } = req.body;      // Safe additional field
  console.log("Secure Firebase data:", firebaseUser);

  if (!displayName) {
    throw new ApiErr("Display name is required", 400);
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiErr("User already exists", 409);
  }

  let uploadedImageURL = null;
  if (req.file) {
    const result = await uploadOnCloudinary(req.file.path);
    uploadedImageURL = result.url;
  }

  const newUser = await User.create({
    userId,
    email,
    displayName,
    photoURL: uploadedImageURL,
    role: "user",
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(newUser._id);

  res.cookie("accessToken", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  const createdUser = await User.findById(newUser._id).select("-refreshToken");

  return res.status(201).json(
    new ApiRes(201, { user: createdUser, accessToken }, "User registered successfully")
  );
});



// Login User (Sign-In)
const loginUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  console.log("Request body:", req.body);

  // Step 1: Validate if userId exists
  if (!userId) {
    throw new ApiErr("Firebase userId is required", 400);
  }

  // Step 2: Check if the user exists in DB
  const user = await User.findOne({ userId });
  if (!user) {
    throw new ApiErr("User not found", 404); // If user doesn't exist, throw error
  }

  // Step 3: Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  // Step 4: Set tokens in cookies
  res.cookie("accessToken", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  // Step 5: Return logged-in user data without refreshToken
  const loggedInUser = await User.findById(user._id).select("-refreshToken");

  return res.status(200).json(
    new ApiRes(
      200,
      {
        user: loggedInUser,
        accessToken, // Return access token if needed
      },
      "User logged in successfully"
    )
  );
});

const logoutUser = asyncHandler (async (req, res) => {
  res.clearCookie("accessToken", accessCookieOptions);
  res.clearCookie("refreshToken", refreshCookieOptions);
  return res.status(200).json(new ApiRes(200, {}, "User logged out successfully"));
});


export { registerUser, loginUser, logoutUser };
