import mongoose, { Schema } from "mongoose";

const vendorApplicationSchema = new Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // MongoDB _id
  vendorName: { type: String, required: true },
  vendorEmail: { type: String, required: true },
  vendorPhone: { type: String, required: true },
  businessName: { type: String, required: true },
  businessCoverImage: { type: String, required: true },
  marketLocation: { type: String, required: true },
  marketDescription: { type: String, required: true },
  applicationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  banned: { type: Boolean, default: false },
  banReason: { type: String },
  banDate: { type: Date },
},
{
  timestamps: true
});

const Vendor = mongoose.model("Vendor", vendorApplicationSchema);
export default Vendor;
