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
import Ad from "../models/ad.models.js";
import Product from "../models/product.model.js";
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
// auth.controller.js
const authenticateUser = asyncHandler(async (req, res) => {
  const firebaseUser = req.firebaseUser;
  const userId = firebaseUser.uid;
  const email = firebaseUser.email;
  const firebaseName = firebaseUser.name || firebaseUser.displayName;
  const firebasePhoto = firebaseUser.picture || firebaseUser.photoURL;

  const { displayName } = req.body;

  // Debug logs
  console.log("Request body:", req.body);
  console.log("Request file:", req.file);

  let user = await User.findOne({ userId });

  if (user) {
    console.log("Existing user logging in:", email);
  } else {
    console.log("New user signing up:", email);

    const finalDisplayName = displayName || firebaseName || email.split("@")[0];

    let uploadedImageURL = firebasePhoto || null;

    // Handle file upload
    if (req.file) {
      console.log("Uploading file:", req.file.path);
      try {
        const result = await uploadOnCloudinary(req.file.path);

        // Fix: Use the correct property from your cloudinary response
        uploadedImageURL = result?.secureUrl || result?.optimizedUrl || null;

        console.log("Cloudinary upload success:", uploadedImageURL);
      } catch (error) {
        console.error("Cloudinary upload failed:", error);
      }
    }

    console.log("Creating user with photoURL:", uploadedImageURL);

    user = await User.create({
      userId,
      email,
      displayName: finalDisplayName,
      photoURL: uploadedImageURL,
      role: "user",
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  res.cookie("accessToken", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  const authenticatedUser = await User.findById(user._id).select(
    "-refreshToken"
  );

  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        { user: authenticatedUser, accessToken },
        user.createdAt === user.updatedAt
          ? "User registered successfully"
          : "User logged in successfully"
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
// GET MongoDB ObjectId by Firebase UID
export const getMongoIdByFirebaseUid = asyncHandler(async (req, res) => {
  const { firebaseUid } = req.params;

  if (!firebaseUid) {
    return res.status(400).json({ message: "Firebase UID is required" });
  }

  const user = await User.findOne({ userId: firebaseUid });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    mongoId: user._id,
    user,
  });
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

  try {
    const user = await User.findOne({ userId })
      .populate("orders.orderItems.productId")
      .select("orders")
      .sort({ "orders.createdAt": -1 });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    

    res.status(200).json(user.orders); // Return all orders, sorted by createdAt in descending order
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

    // Return user profile, even if orders array is empty
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

////////////////////
// admin controllers
////////////////////

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

  const user = await User.findOne({ userId: id });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.role = role;
  await user.save();

  res.json({ message: "User role updated", data: user });
});

// Ban / Unban user
const banUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ban, reason } = req.body;

  const user = await User.findOne({ userId: id });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.banned = ban;
  user.banReason = ban ? reason : "";
  user.banDate = ban ? new Date() : null;

  await user.save();

  res.json({ message: `User ${ban ? "banned" : "unbanned"}`, data: user });
});


// Admin dashboard stats
const getAdminStats = asyncHandler(async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalVendors = await User.countDocuments({ role: "vendor" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalProducts = await Product.countDocuments();
    const pendingProducts = await Product.countDocuments({
      applicationStatus: "pending",
    });
    const approvedProducts = await Product.countDocuments({
      applicationStatus: "approved",
    });
    const totalAds = await Ad.countDocuments();
    const pendingAds = await Ad.countDocuments({ status: "pending" });
    const approvedAds = await Ad.countDocuments({ status: "approved" });

    res.json({
      totalUsers,
      totalVendors,
      totalAdmins,
      totalProducts,
      pendingProducts,
      approvedProducts,
      totalAds,
      pendingAds,
      approvedAds,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export {
  authenticateUser,
  logoutUser,
  createOrder,
  createPaymentIntent,
  getUserOrders,
  getUserProfile,
  updateUserProfile,
  getUsers,
  updateUserRole,
  banUser,
  getAdminStats,
};
