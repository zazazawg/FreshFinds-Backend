import User from "../models/user.model.js";
import ApiRes from "../utils/ApiRes.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiErr from "../utils/ApiErr.js";
import {
  accessCookieOptions,
  refreshCookieOptions,
} from "../config/cookies.js";
import Stripe from "stripe";
const stripe = new Stripe(process.env.PAYMENT_GATEWAY_KEY);

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
  const userId = firebaseUser.uid; // Trusted value
  const email = firebaseUser.email; // Trusted value

  const { displayName } = req.body; // Safe additional field
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

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    newUser._id
  );

  res.cookie("accessToken", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  const createdUser = await User.findById(newUser._id).select("-refreshToken");

  return res
    .status(201)
    .json(
      new ApiRes(
        201,
        { user: createdUser, accessToken },
        "User registered successfully"
      )
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
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

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

const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("accessToken", accessCookieOptions);
  res.clearCookie("refreshToken", refreshCookieOptions);
  return res
    .status(200)
    .json(new ApiRes(200, {}, "User logged out successfully"));
});

const createPaymentIntent = asyncHandler(async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({ clientSecret: intent.client_secret });
  } catch (error) {
    console.error("Stripe PaymentIntent Error:", error.message);
    res.status(500).json({ error: error.message || "Payment creation failed" });
  }
});

const createOrder = asyncHandler(async (req, res) => {
  try {
    const { userId, items, totalAmount, paymentIntentId } = req.body;

    if (!userId) return res.status(400).json({ error: "User ID is required" });
    if (!items || items.length === 0)
      return res.status(400).json({ error: "No items to create order" });
    if (!totalAmount || !paymentIntentId)
      return res
        .status(400)
        .json({ error: "Missing total amount or payment ID" });

    // Find user by Firebase UID
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const newOrder = {
      orderId: paymentIntentId,
      orderItems: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      totalAmount,
      status: "pending",
      orderDate: new Date(),
    };

    user.orders.push(newOrder);
    await user.save();

    res
      .status(201)
      .json({ message: "Order saved successfully", order: newOrder });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});
// Get user orders
const getUserOrders = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  console.log("Request params:", userId);

  try {
    const user = await User.findOne({ userId })
      .populate("orders.orderItems.productId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.orders || user.orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    res.status(200).json(user.orders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
// get user profile 
const getUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ userId })
      .populate("wishlist.productId")
      .populate("orders.orderItems.productId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.orders || user.orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// Update profile
 const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params; 
    const { displayName, photoURL } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: { displayName, photoURL } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// admin controllers

// Get users
 const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const query = {
    $or: [
      { email: { $regex: search, $options: "i" } },
      { displayName: { $regex: search, $options: "i" } },
    ],
  };

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    message: "Users fetched successfully",
    data: users,
    total,
    currentPage: Number(page),
    totalPages: Math.ceil(total / limit),
  });
});

// Change user role
 const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body; // user, vendor, admin

  const user = await User.findOne({userId: id});
  if (!user) return res.status(404).json({ message: "User not found" });

  user.role = role;
  await user.save();

  res.json({ message: "User role updated", data: user });
});

// Ban / Unban user
 const banUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ban, reason } = req.body;

  const user = await User.findOne({userId: id});
  if (!user) return res.status(404).json({ message: "User not found" });

  user.banned = ban;
  user.banReason = ban ? reason : "";
  user.banDate = ban ? new Date() : null;

  await user.save();

  res.json({ message: `User ${ban ? "banned" : "unbanned"}`, data: user });
});



export {
  registerUser,
  loginUser,
  logoutUser,
  createOrder,
  createPaymentIntent,
  getUserOrders,
  getUserProfile,
  updateUserProfile,
  getUsers,
  updateUserRole,
  banUser
};
