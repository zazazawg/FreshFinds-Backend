// controllers/vendorController.js
import User from "../models/user.model.js";
import Vendor from "../models/vendor.model.js";

const applyVendor = async (req, res) => {
  const { businessName, marketLocation, marketDescription, vendorPhone,uid } =
    req.body;
  const userId = req.userId; // Firebase User ID (from token)
  try {
    // Find the user in the User model
    const user = await User.findOne({ userId });
    if(userId !== uid){
      return res.status(404).json({ message: "unauthorized" });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Handle the image upload if a photoURL is provided
    let uploadedImageURL = null;
    if (req.file) {
      const result = await uploadOnCloudinary(req.file.path);
      if (result) {
        uploadedImageURL = result.url; // Get URL from Cloudinary response
      }
    }
    // Create a new VendorApplication entry
    const newApplication = new Vendor({
      vendorId: user._id, // MongoDB _id from the User model
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

    res
      .status(201)
      .json({ message: "Vendor application submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error submitting vendor application" });
  }
};

export { applyVendor };
