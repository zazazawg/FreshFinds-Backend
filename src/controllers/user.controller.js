import User from "../models/user.model.js";
import ApiRes from "../utils/ApiRes.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiErr from "../utils/ApiErr.js";

const registerUser = asyncHandler(async (req, res) => {
  const { userId, displayName, email, photoURL } = req.body;
  console.log("Received data:", email, displayName, photoURL);
  // Step 1: Validate required fields
  if (!userId || !displayName || !email) {
    throw new ApiErr("Missing required fields", 400);
  }
  // Step 2: Check if the user already exists by email
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiErr("User already exists", 409);
  }
  // Step 3: Handle the image upload if photoURL is provided
  let uploadedImageURL = null;
  const imageLocalPath = req.file ? req.file.path : null;
  if (imageLocalPath) {
    try {
      const result = await uploadOnCloudinary(imageLocalPath);
      if (result) {
        uploadedImageURL = result.url;
      } else {
        throw new ApiErr("Error uploading image to Cloudinary", 500);
      }
    } catch (error) {
      // Clean up local file in case of failure
      throw new ApiErr("Error uploading image", 500);
    }
  }
  // Step 4: Create the new user in the database
  const newUser = await User.create({
    userId,
    displayName,
    email,
    photoURL: uploadedImageURL || null,
    role: "user",
  });
  const createdUser = await User.findById(newUser._id).select("-refreshToken");
  if (createdUser) {
    return res
      .status(201)
      .json(new ApiRes(201, createdUser, "User created successfully"));
  } else {
    throw new ApiErr("Error creating user", 500);
  }
});

export { registerUser };
