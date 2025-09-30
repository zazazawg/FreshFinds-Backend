// controllers/vendorController.js
import Ad from "../models/ad.models.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Vendor from "../models/vendor.model.js";
import ApiErr from "../utils/ApiErr.js";
import ApiRes from "../utils/ApiRes.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

// Apply for vendor
const applyVendor = async (req, res) => {
  const { businessName, marketLocation, marketDescription, vendorPhone, uid } =
    req.body;
  const userId = req.firebaseUser.uid; // Firebase User ID (from token)

  try {
    // Find the user in the User model
    const user = await User.findOne({ userId });
    if (userId !== uid) {
      return res.status(404).json({ message: "Unauthorized" });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user already has a pending or approved vendor application
    const existingApplication = await Vendor.findOne({
      vendorId: user._id,
      applicationStatus: { $in: ["pending", "approved"] },
    });

    if (existingApplication) {
      return res
        .status(400)
        .json({ message: "You have already submitted an application" });
    }

    // Handle the image upload only if everything is valid
    let uploadedImageURL = null;
    let result = null;

    if (req.file) {
      try {
        result = await uploadOnCloudinary(req.file?.path); // Upload image to Cloudinary
        if (result) {
          uploadedImageURL = result.url; // Get the image URL from Cloudinary
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        return res.status(500).json({ message: "Error uploading image" });
      }
    }

    // Create a new VendorApplication entry if image upload succeeds
    const newApplication = new Vendor({
      vendorId: user._id,
      vendorName: user.displayName,
      vendorEmail: user.email,
      vendorPhone,
      businessName,
      businessCoverImage: uploadedImageURL,
      marketLocation,
      marketDescription,
      applicationStatus: "pending",
    });

    // Save the application to the database
    await newApplication.save();

    // Respond with success message
    res
      .status(201)
      .json({ message: "Vendor application submitted successfully" });
  } catch (error) {
    // Handle any other errors and clean up if needed
    console.error("Error submitting vendor application:", error);

    // If an error happens after the file has been uploaded, clean up the uploaded file
    if (req.file && result) {
      // If you want to delete the file from Cloudinary in case of failure
      await cloudinary.uploader.destroy(result.public_id);
    }

    res.status(500).json({ message: "Error submitting vendor application" });
  }
};
// get all vendor applications
const getAllVendorApplications = asyncHandler(async (req, res) => {
  try {
    // Fetch all vendor applications and populate all relevant vendor details
    const vendorApplications = await Vendor.find()
      .populate(
        "vendorId",
        "vendorName vendorEmail vendorPhone businessName marketLocation marketDescription businessCoverImage"
      ) // Populate full vendor details
      .sort({ applicationDate: -1 }); // Sort applications by date (newest first)

    res.status(200).json({
      message: "Vendor applications fetched successfully",
      data: vendorApplications,
    });
  } catch (error) {
    console.error("Error fetching vendor applications:", error);
    res.status(500).json({
      message: "Error fetching vendor applications",
    });
  }
});
// get vendor applications(pending)
const getVendorApplications = asyncHandler(async (req, res) => {
  try {
    // Fetch all vendor applications with 'pending' applicationStatus and populate relevant vendor details
    const vendorApplications = await Vendor.find({ applicationStatus: "pending" }) // Filter by 'pending' application status
      .populate(
        "vendorId",
        "vendorName vendorEmail vendorPhone businessName marketLocation marketDescription businessCoverImage"
      ) // Populate full vendor details
      .sort({ applicationDate: -1 }); // Sort applications by date (newest first)

    res.status(200).json({
      message: "Vendor applications fetched successfully",
      data: vendorApplications,
    });
  } catch (error) {
    console.error("Error fetching vendor applications:", error);
    res.status(500).json({
      message: "Error fetching vendor applications",
    });
  }
});
// handle vendor application
 const handleVendorApplication = async (req, res) => {
  const { applicationId, action } = req.body;

  // Find the vendor application by ID
  const vendorApplication = await Vendor.findById(applicationId);
  if (!vendorApplication) {
    return res.status(404).json({ message: "Vendor application not found" });
  }

  // Update the application status based on the action (approve/reject)
  if (action === "approve") {
    vendorApplication.applicationStatus = "approved";
    // Update the user role to 'vendor' after approval
    const user = await User.findById(vendorApplication.vendorId);
    user.role = "vendor";
    await user.save();
  } else if (action === "reject") {
    vendorApplication.applicationStatus = "rejected";

  }
  // Save the updated application
  await vendorApplication.save();

  return res
    .status(200)
    .json({ message: "Vendor application updated successfully" });
};
// vendor recent orders(dashboard stats)
const getVendorRecentOrders = asyncHandler(async (req, res) => {
  try {
    const vendorId = req.user._id;

    const orders = await User.aggregate([
      { $unwind: "$orders" },
      { $unwind: "$orders.orderItems" },
      { $match: { "orders.orderItems.vendorId": vendorId } },
      { $sort: { "orders.orderDate": -1 } },
      { $limit: 5 },
      {
        $project: {
          orderId: "$orders.orderId",
          productId: "$orders.orderItems.productId",
          quantity: "$orders.orderItems.quantity",
          totalAmount: "$orders.totalAmount",
          orderDate: "$orders.orderDate",
          status: "$orders.status",
        },
      },
    ]);

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
})
const getVendorStats =asyncHandler(async (req, res) => {
  try {
    const {vendorId} = req.params;

    const totalProducts = await Product.countDocuments({ vendorId });
    const pendingProducts = await Product.countDocuments({ vendorId, applicationStatus: "pending" });
    const approvedProducts = await Product.countDocuments({ vendorId, applicationStatus: "approved" });
    const totalAds = await Ad.countDocuments({ vendor: vendorId });
    const pendingAds = await Ad.countDocuments({ vendor: vendorId, status: "pending" });
    const approvedAds = await Ad.countDocuments({ vendor: vendorId, status: "approved" });

    res.json({
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
})



export {
  applyVendor,
  getAllVendorApplications,
  getVendorApplications,
  handleVendorApplication,
  getVendorRecentOrders,
  getVendorStats

};
