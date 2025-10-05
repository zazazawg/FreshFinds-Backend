import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});


export const generateCloudinaryUrl = (publicId, opts = {}) => {
  const {
    width,
    height,
    crop = "fill",
    gravity = "auto",
    fetch_format = "auto",
    quality = "auto",
    format,
  } = opts;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    gravity,
    fetch_format,
    quality,
    format,
  });
};


export const uploadBufferToCloudinary = (fileBuffer, filename) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) return reject(new Error("No file buffer provided"));

    const publicId = `uploads/${Date.now()}-${filename}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        public_id: publicId,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

/**
 * Upload a file to Cloudinary and return useful URLs (original + variants + srcset)
 */
const uploadOnCloudinary = async (
  localFilePath,
  { customPublicId = null, eagerTransforms = null, removeLocal = true } = {}
) => {
  if (!localFilePath) throw new Error("No file provided for upload");

  const fileName = path.basename(localFilePath, path.extname(localFilePath));
  const publicId = customPublicId || `uploads/${Date.now()}-${fileName}`;

  try {
    const uploadOptions = {
      resource_type: "image",
      public_id: publicId,
      ...(Array.isArray(eagerTransforms) && eagerTransforms.length > 0
        ? { eager: eagerTransforms }
        : {}),
    };

    const result = await cloudinary.uploader.upload(localFilePath, uploadOptions);

    const secureUrl = result.secure_url || result.url;

    const optimizedUrl = generateCloudinaryUrl(publicId, {
      fetch_format: "auto",
      quality: "auto",
    });

    const variants = {
      thumb: generateCloudinaryUrl(publicId, {
        width: 300,
        height: 300,
      }),
      medium: generateCloudinaryUrl(publicId, {
        width: 600,
        height: 800,
      }),
      large: generateCloudinaryUrl(publicId, {
        width: 1200,
        height: 1800,
      }),
    };

    const srcset = [
      `${variants.thumb} 300w`,
      `${variants.medium} 600w`,
      `${variants.large} 1200w`,
    ].join(", ");

    if (removeLocal) {
      try {
        await fs.unlink(localFilePath);
      } catch (err) {
        console.error("Failed to delete temp file:", localFilePath, err);
      }
    }

    return {
      publicId,
      originalUrl: secureUrl,
      secureUrl,
      optimizedUrl,
      variants,
      srcset,
      rawResult: result,
    };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);

    try {
      await fs.unlink(localFilePath);
    } catch {
      // ignore
    }

    return null;
  }
};

export default uploadOnCloudinary;
