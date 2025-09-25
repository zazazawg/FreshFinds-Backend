import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import ApiErr from "../utils/ApiErr.js";
import ApiRes from "../utils/ApiRes.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const addProduct = asyncHandler(async (req, res) => {
  const { name, description, price, stock, category, vendorId } = req.body;

  // Basic required field validation
  if (!name || !description || !price || !stock || !category || !vendorId) {
    throw new ApiErr("All fields are required", 400);
  }

  // Parse numeric fields
  const priceNum = parseFloat(price);
  const stockNum = parseInt(stock, 10);

  if (Number.isNaN(priceNum) || priceNum < 0) {
    throw new ApiErr("Price must be a non-negative number", 400);
  }
  if (Number.isNaN(stockNum) || stockNum < 0) {
    throw new ApiErr("Stock must be a non-negative integer", 400);
  }

  // Find vendor by firebase userId stored in user.userId
  const vendor = await User.findOne({ userId: vendorId });
  if (!vendor) {
    throw new ApiErr("Vendor not found", 404);
  }

  // Only vendors (and optionally admins) may add products
  if (vendor.role !== "vendor" && vendor.role !== "admin") {
    throw new ApiErr("Only vendors can add products", 403);
  }

  // Handle file upload (optional)
  let uploadedImageURL = null;
  let uploadedImagePublicId = null;

  if (req.file) {
    try {
      const result = await uploadOnCloudinary(req.file.path);
      if (!result) {
        // uploadOnCloudinary returns null on failure
        throw new ApiErr("Image upload failed", 500);
      }
      // prefer optimizedUrl if available
      uploadedImageURL = result.optimizedUrl || result.url || result.secure_url || null;
      uploadedImagePublicId = result.publicId || result.public_id || null;
    } catch (uploadErr) {
      console.error("Error uploading image:", uploadErr);
      throw new ApiErr("Error uploading image", 500);
    }
  }

  try {
    const newProduct = await Product.create({
      vendorId: vendor._id,
      vendorName: vendor.displayName,
      vendorEmail: vendor.email,
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      stock: stockNum,
      category,
      productImage: uploadedImageURL,
      productImagePublicId: uploadedImagePublicId,
      applicationStatus: "pending",
      // add other defaults if needed (availabilityStatus, tags, etc.)
    });

    return res.status(201).json(new ApiRes(201, newProduct, "Product created successfully"));
  } catch (err) {
    console.error("Error adding product:", err);
    throw new ApiErr("Error adding product", 500);
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
// Update Product Price
const updateProductPrice = asyncHandler(async (req, res) => {
  const firebaseUid = req.headers.authorization?.split(" ")[1];
  const { productId } = req.params;
  const { price } = req.body;

  if (!firebaseUid) {
    return res
      .status(400)
      .json({ message: "Firebase userId required in headers" });
  }

  if (!price || price < 0) {
    return res.status(400).json({ message: "Invalid price value" });
  }

  // Find the vendor
  const vendor = await User.findOne({ userId: firebaseUid });
  if (!vendor) {
    return res.status(404).json({ message: "Vendor not found" });
  }

  // Find the product and verify ownership
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Verify if the logged-in vendor owns the product
  if (product.vendorId.toString() !== vendor._id.toString()) {
    return res
      .status(403)
      .json({ message: "You do not have permission to update this product" });
  }

  // Store the current price in the priceHistory array before updating
  const currentPrice = product.price;
  const priceEntry = {
    price: currentPrice,
    date: new Date(),
  };

  if (!product.priceHistory) {
    product.priceHistory = [];
  }

  // Push the current price to the price history
  product.priceHistory.push(priceEntry);

  // Update the product's price
  product.price = price;

  // Save the updated product
  await product.save();

  return res.status(200).json({
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
// mark product as in stock
const markProductActive = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  product.availabilityStatus = "active";
  await product.save();

  return res.status(200).json({
    message: "Product marked as active",
    data: product,
  });
});
// Delete a product
const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // Find and delete product
  const product = await Product.findByIdAndDelete(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  res.status(200).json({
    success: true,
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
const getAllProducts = asyncHandler(async (req, res) => {
  const { category, page = 1, limit } = req.query; // <-- added defaults for page

  const filter = { applicationStatus: "approved" };

  if (category) {
    filter.category = category;
  }

  const numericLimit = limit ? Number(limit) : null;

  const skip = numericLimit ? (Number(page) - 1) * numericLimit : 0;

  let query = Product.find(filter).sort({ createdAt: -1 }); 

  if (numericLimit) {
    query = query.skip(skip).limit(numericLimit);
  }

  const products = await query;
  const total = await Product.countDocuments(filter);

  res.status(200).json({
    message: "Approved products fetched successfully",
    data: products,
    total,
    currentPage: Number(page),
    totalPages: numericLimit ? Math.ceil(total / numericLimit) : 1, 
  });
});
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.status(200).json({
    message: "Product fetched successfully",
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
  deleteProduct,
  markProductActive,
  getAllProducts,
  getProductById
};
