import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    userId: { type: String, required: true }, // Firebase auth userId

    displayName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["user", "vendor", "admin"],
      default: "user",
    },
    photoURL: { type: String },
    refreshToken: {
      type: String,
    },
    wishlist: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      },
    ],

    orders: [
      {
        orderId: { type: String, required: true },
        orderItems: [
          {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            quantity: { type: Number, required: true },
          },
        ],
        totalAmount: { type: Number, required: true },
        status: {
          type: String,
          enum: ["pending", "shipped", "delivered"],
          default: "pending",
        },
        orderDate: { type: Date, default: Date.now },
      },
    ],
    banned: { type: Boolean, default: false }, 
    banReason: { type: String }, 
    banDate: { type: Date }, 
  },
  {
    timestamps: true,
  }
);
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      userId: this.userId,
      email: this.email,
      role: this.role,
      displayName: this.displayName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _Id: this.userId,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
const User = mongoose.model("User", userSchema);
export default User;
