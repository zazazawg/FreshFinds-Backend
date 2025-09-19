import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const productSchema = new Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    productImage: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be less than 0"],
    },
    category: {
      type: String,
      required: true,
    },
    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    availabilityStatus: {
      type: String,
      enum: ["active", "out of stock"],
      default: "active",
    },
    reviews: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the User model
        rating: { type: Number, min: 1, max: 5 },
        reviewText: { type: String },
        reviewDate: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Plugin to handle aggregate pagination (good for large data sets)
productSchema.plugin(mongooseAggregatePaginate);

const Product = mongoose.model("Product", productSchema);
export default Product;
