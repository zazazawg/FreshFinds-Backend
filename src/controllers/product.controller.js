import Product from "../models/product.model.js";
import ApiErr from "../utils/ApiErr.js";
import ApiRes from "../utils/ApiRes.js";
import asyncHandler from "../utils/asyncHandler.js";

const addProduct = asyncHandler(async (req, res) => {
  const { name, description, price, stock, category, productImage } = req.body;

  if (!name || !description || !price || !stock || !category || !productImage) {
    throw new ApiErr("All fields are required", 400);
  }

  try {
    // Create the new product with status "pending"
    const newProduct = await Product.create({
      name,
      description,
      price,
      stock,
      category,
      productImage,
      applicationStatus: "pending", 
    });
    await newProduct.save();

    res.status(201).json(new ApiRes(201, newProduct));
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json(new ApiRes(500, null, "Error adding product"));
  }
});
const approveProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json(new ApiRes(404, null, "Product not found"));
    }

    // Set the product application status to "approved"
    product.applicationStatus = "approved";
    await product.save();

    res.status(200).json(new ApiRes(200, product, "Product approved successfully"));
  } catch (error) {
    console.error("Error approving product:", error);
    res.status(500).json(new ApiRes(500, null, "Error approving product"));
  }
});


export { addProduct, approveProduct };
