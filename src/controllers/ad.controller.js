import mongoose from "mongoose";
import Ad from "../models/ad.models.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";

const requestAd = asyncHandler(async (req, res) => {
  const { productId, bannerImage, startDate,title, endDate, userId, notes } =
    req.body;

  if (!productId || !bannerImage || !startDate || !endDate || !userId) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ message: "Vendor not found" });
  }

  if (user.role !== "vendor") {
    return res.status(403).json({ message: "Only vendors can request ads" });
  }

  // Check if ad already exists for this product
  const existingAd = await Ad.findOne({ product: productId });
  if (existingAd) {
    return res
      .status(400)
      .json({ message: "An ad already exists for this product" });
  }

  const vendorId = user._id;

  // Create a new ad
  const newAd = await Ad.create({
    vendor: vendorId,
    product: productId,
    Image: bannerImage,
    title,
    startDate,
    endDate,
    notes,
    status: "pending",
  });

  res
    .status(201)
    .json({
      message: "Ad request submitted — awaiting admin approval",
      data: newAd,
    });
});
 const getPendingAds = asyncHandler(async (req, res) => {
  const pendingAds = await Ad.find({ status: "pending" })
    .populate("vendor", "name email")
    .populate("product", "name price category");

  res.status(200).json({
    message: "Pending ads fetched successfully",
    data: pendingAds,
  });
});
// Approve ad
 const approveAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  if (!ad) return res.status(404).json({ message: "Ad not found" });

  ad.status = "approved";
  await ad.save();

  res.status(200).json({ message: "Ad approved successfully", ad });
});

// Reject ad
 const rejectAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  if (!ad) return res.status(404).json({ message: "Ad not found" });

  ad.status = "rejected";
  await ad.save();

  res.status(200).json({ message: "Ad rejected successfully", ad });
});
// get active ads
 const getActiveAds = asyncHandler(async (req, res) => {
  const ads = await Ad.find({ status: "approved" }).sort({ createdAt: -1 });
  res.status(200).json(ads);
});


export { requestAd, getPendingAds, approveAd, rejectAd, getActiveAds };
