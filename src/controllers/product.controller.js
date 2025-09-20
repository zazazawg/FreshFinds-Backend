import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import ApiErr from "../utils/ApiErr.js";
import ApiRes from "../utils/ApiRes.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const addProduct = asyncHandler(async (req, res) => {
  const { name, description, price, stock, category, vendorId } = req.body;

  if (!name || !description || !price || !stock || !category || !vendorId) {
    throw new ApiErr("All fields are required", 400);
  }
  const vendor = await User.findOne({ userId: vendorId });
  console.log(vendor);
  if (!vendor) {
    throw new ApiErr("Vendor not found", 404);
  }

  if (vendor.role !== "vendor") {
    throw new ApiErr("Only vendors can add products", 403);
  }

  // Handle the image upload only if everything is valid
  let uploadedImageURL = null;
  let result = null;

  if (req.file) {
    try {
      result = await uploadOnCloudinary(req.file?.path);
      if (result) {
        uploadedImageURL = result.url;
      }
    } catch (error) {
      console.log("Error uploading image:", error);
      return res.status(500).json({ message: "Error uploading image" });
    }
  }
  try {
    // Create the new product with status "pending"
    const newProduct = await Product.create({
      vendorId: vendor._id,
      vendorName: vendor.displayName,
      vendorEmail: vendor.email,
      name,
      description,
      price,
      stock,
      category,
      productImage: uploadedImageURL,
      applicationStatus: "pending",
    });
    await newProduct.save();

    res.status(201).json(new ApiRes(201, newProduct));
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json(new ApiRes(500, null, "Error adding product"));
  }
});
const getPendingProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find({ applicationStatus: "pending" });
    res.status(200).json({
      message: "Pending products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.log("Error fetching pending products:", error);
    res.status(500).json({ message: "Error fetching pending products" });
  }
});
const approveOrRejectProduct = asyncHandler(async (req, res) => {
  const { productId, action } = req.params; // action will be 'approve' or 'reject'

  // Validate action
  const validActions = ["approve", "reject"];
  if (!validActions.includes(action)) {
    return res
      .status(400)
      .json(
        new ApiRes(400, null, "Invalid action. Must be 'approve' or 'reject'.")
      );
  }
  // Find the product by ID
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json(new ApiRes(404, null, "Product not found"));
  }

  // Action logic to approve or reject
  if (action === "approve") {
    product.applicationStatus = "approved";
  } else if (action === "reject") {
    product.applicationStatus = "rejected";
  } else {
    return res.status(400).json(new ApiRes(400, null, "Invalid action"));
  }

  // Save the product with updated status
  await product.save();

  return res
    .status(200)
    .json(new ApiRes(200, product, "Product updated successfully"));
});

export { addProduct, approveOrRejectProduct, getPendingProducts };
