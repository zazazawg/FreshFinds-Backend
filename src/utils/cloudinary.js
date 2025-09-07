import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file to Cloudinary
 * @param {string} localFilePath
 * @param {string|null} customPublicId
 * @returns {Promise<{url: string, optimizedUrl: string}|null>}
 */
const uploadOnCloudinary = async (localFilePath, customPublicId = null) => {
  try {
    if (!localFilePath) {
      throw new Error("No file provided for upload");
    }

    // Generate unique public_id if not provided
    const fileName = path.basename(localFilePath, path.extname(localFilePath));
    const publicId = customPublicId || `uploads/${Date.now()}-${fileName}`;

    // Upload file to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
      public_id: publicId,
    });
    // Generate optimized Cloudinary URL
    const optimizedUrl = cloudinary.url(publicId, {
      fetch_format: "auto",
      quality: "auto",
    });
    // Delete the local file after upload
    fs.unlink(localFilePath, (err) => {
      if (err) console.error(" Error deleting temp file:", err);
      // else console.log("Temp file deleted:", localFilePath);
    });
    return {
      url: uploadResult.secure_url,
      optimizedUrl,
    };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error.message);

    // Cleanup: Delete the local file in case of error
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (unlinkError) {
        console.error("Error cleaning up temp file:", unlinkError);
      }
    }

    return null;
  }
};

export default uploadOnCloudinary;
