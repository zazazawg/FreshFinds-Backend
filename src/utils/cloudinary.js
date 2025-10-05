import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

/**
 * Generate a Cloudinary transformation URL
 */
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

/**
 * Upload a buffer (from multer.memoryStorage) to Cloudinary
 */
export const uploadBufferToCloudinary = (fileBuffer, filename) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) return reject(new Error("No file buffer provided"));

    const publicId = `uploads/${Date.now()}-${filename}`;

    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", public_id: publicId },
      (error, result) => {
        if (error) return reject(error);

        const secureUrl = result.secure_url || result.url;

        const optimizedUrl = generateCloudinaryUrl(publicId, {
          fetch_format: "auto",
          quality: "auto",
        });

        const variants = {
          thumb: generateCloudinaryUrl(publicId, { width: 300, height: 300 }),
          medium: generateCloudinaryUrl(publicId, { width: 600, height: 800 }),
          large: generateCloudinaryUrl(publicId, { width: 1200, height: 1800 }),
        };

        const srcset = [
          `${variants.thumb} 300w`,
          `${variants.medium} 600w`,
          `${variants.large} 1200w`,
        ].join(", ");

        resolve({
          publicId,
          originalUrl: secureUrl,
          secureUrl,
          optimizedUrl,
          variants,
          srcset,
          rawResult: result,
        });
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};
