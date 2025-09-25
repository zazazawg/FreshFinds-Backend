// src/utils/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generate a Cloudinary URL for a public id with transformations applied
 * @param {string} publicId
 * @param {object} opts - { width, height, crop, gravity, fetch_format, quality, format }
 * @returns {string}
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
 * Upload a file to Cloudinary and return useful URLs (original + variants + srcset)
 * @param {string} localFilePath - path to local temporary file
 * @param {object} options
 *   - customPublicId (string) optional
 *   - eagerTransforms (array) optional: list of transformation objects to generate eagerly
 *   - removeLocal (boolean) default true
 * @returns {Promise<{
 *   publicId: string,
 *   originalUrl: string,
 *   secureUrl: string,
 *   optimizedUrl: string,
 *   variants: { thumb:string, medium:string, large:string },
 *   srcset: string
 * }|null>}
 */
const uploadOnCloudinary = async (
  localFilePath,
  { customPublicId = null, eagerTransforms = null, removeLocal = true } = {}
) => {
  if (!localFilePath) {
    throw new Error("No file provided for upload");
  }

  const fileName = path.basename(localFilePath, path.extname(localFilePath));
  const publicId = customPublicId || `uploads/${Date.now()}-${fileName}`;

  try {
    const uploadOptions = {
      resource_type: "image",
      public_id: publicId,
      // you can force conversion to jpg/webp with format: "jpg" or use eager
      // eager transformations will be created at upload time (useful if you want derived images immediately)
      ...(Array.isArray(eagerTransforms) && eagerTransforms.length > 0
        ? { eager: eagerTransforms }
        : {}),
    };

    const result = await cloudinary.uploader.upload(localFilePath, uploadOptions);

    // canonical / original secure url
    const secureUrl = result.secure_url || result.url;

    // a general optimized URL (auto format + quality) — useful as a single responsive source
    const optimizedUrl = generateCloudinaryUrl(publicId, {
      fetch_format: "auto",
      quality: "auto",
    });

    // produce a few commonly-used variants (thumb / medium / large)
    const variants = {
      thumb: generateCloudinaryUrl(publicId, {
        width: 300,
        height: 300,
        crop: "fill",
        gravity: "auto",
        fetch_format: "auto",
        quality: "auto",
      }),
      medium: generateCloudinaryUrl(publicId, {
        width: 600,
        height: 800, // tall portrait example (2:3)
        crop: "fill",
        gravity: "auto",
        fetch_format: "auto",
        quality: "auto",
      }),
      large: generateCloudinaryUrl(publicId, {
        width: 1200,
        height: 1800, // large portrait
        crop: "fill",
        gravity: "auto",
        fetch_format: "auto",
        quality: "auto",
      }),
    };

    // srcset string for responsive images (desktop -> mobile)
    const srcset = [
      `${variants.thumb} 300w`,
      `${variants.medium} 600w`,
      `${variants.large} 1200w`,
    ].join(", ");

    // cleanup local file (best-effort)
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
      rawResult: result, // keep raw result if you need more metadata
    };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);

    // try cleanup
    try {
      await fs.unlink(localFilePath);
    } catch (err) {
      // ignore
    }

    return null;
  }
};

export default uploadOnCloudinary;
