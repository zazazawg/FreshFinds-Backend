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
// Get all products for a specific vendor
const getVendorProducts = asyncHandler(async (req, res) => {
  // Authorization header format: "Bearer <firebaseUserId>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(400)
      .json({ message: "Firebase UID is missing or invalid" });
  }

  const firebaseUid = authHeader.split(" ")[1]; // Extract Firebase UID

  // Find user (vendor) by Firebase UID
  const user = await User.findOne({ userId: firebaseUid });

  if (!user) {
    return res.status(404).json({ message: "Vendor not found" });
  }

  // Fetch vendor products associated with the vendorId
  const products = await Product.find({ vendorId: user._id }).sort({
    createdAt: -1,
  });

  if (!products || products.length === 0) {
    return res
      .status(404)
      .json({ message: "No products found for this vendor" });
  }

  res.status(200).json({
    message: "Products fetched successfully",
    data: products,
  });
});

// get only approved product from specific vendor
const getApprovedProducts = asyncHandler(async (req, res) => {
  // Get Firebase UID from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(400)
      .json({ message: "Firebase UID is missing or invalid" });
  }

  const firebaseUid = authHeader.split(" ")[1];

  // Find the vendor by Firebase UID
  const user = await User.findOne({ userId: firebaseUid });

  if (!user) {
    return res.status(404).json({ message: "Vendor not found" });
  }

  // Fetch approved products for this vendor
  const products = await Product.find({
    vendorId: user._id,
    applicationStatus: "approved",
  }).sort({ createdAt: -1 });

  if (!products || products.length === 0) {
    return res.status(200).json({
      message: "No approved products found",
      data: [],
    });
  }
  res.status(200).json({
    message: "Approved products fetched successfully",
    data: products,
  });
});
// update product price
 const updateProductPrice = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { price } = req.body;

  // Find the product
  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Update price
  product.price = price;

  await product.save();

  res.status(200).json({
    message: "Product price updated successfully",
    data: product,
  });
});
// Mark product as out of stock
 const markProductOutOfStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // Find the product
  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Mark the product as out of stock
  product.availabilityStatus = "out of stock";

  await product.save();

  res.status(200).json({
    message: "Product marked as out of stock",
    data: product,
  });
});
// Delete product
 const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // Find and delete the product
  const product = await Product.findByIdAndDelete(productId);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.status(200).json({
    message: "Product deleted successfully",
  });
});



const updateProductDetails = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { name, description, price, stock, category } = req.body;
  if (!name || !description || !price || !stock || !category) {
    throw new ApiErr("All fields are required", 400);
  }
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiErr("Product not found", 404);
  }

  const previousPrice = product.price;
  const priceHistoryEntry = {
    price: previousPrice,
    changedAt: Date.now(),
  };

  // Handle the image upload if a new product image is provided
  let uploadedImageURL = product.productImage; // Keep existing image if none is uploaded
  if (req.file) {
    const result = await uploadOnCloudinary(req.file?.path); // Upload image to Cloudinary
    if (result) {
      uploadedImageURL = result.url;
    }
  }
  // Update product details
  product.name = name;
  product.description = description;
  product.price = price;
  product.stock = stock;
  product.category = category;
  product.productImage = uploadedImageURL;

  // Add the old price to the price history
  product.priceHistory.push(priceHistoryEntry);

  // Save the updated product
  await product.save();
  res.status(200).json({
    message: "Product updated successfully",
    data: product,
  });
});

export {
  addProduct,
  approveOrRejectProduct,
  getPendingProducts,
  updateProductDetails,
  getVendorProducts,
  getApprovedProducts,
  updateProductPrice,
  markProductOutOfStock,
  deleteProduct
};
