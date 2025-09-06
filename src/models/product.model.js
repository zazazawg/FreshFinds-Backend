import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const productSchema = new Schema(
  {
    publisher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor", // Reference to the Vendor model
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
    image: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be less than 0"],
    },
    category: {
      type: String,
      required: true,
    },
    status: {
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
productSchema.plugin(mongooseAggregatePaginate);

const Product = mongoose.model("Product", productSchema);
export default Product;
