import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
      public_id: "freshfinds",
    });
    console.log("Uploaded File URL:", uploadResult.secure_url);
    const optimizeUrl = cloudinary.url("freshfinds", {
      fetch_format: "auto",
      quality: "auto",
    });
    console.log("Optimized URL:", optimizeUrl);
    fs.unlinkSync(localFilePath);
    return uploadResult;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error.message);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

export default uploadOnCloudinary;
