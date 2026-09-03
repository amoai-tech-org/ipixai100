import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Server-only Cloudinary Node SDK. Reads CLOUDINARY_* from the environment
 * (Next.js loads `.env` automatically). Never import this file from Client
 * Components — CLOUDINARY_API_SECRET must stay on the server and must never
 * appear as NEXT_PUBLIC_*.
 *
 * Cloud name: ipix-cloudinary (public, not a secret).
 *
 * ai_powerstart is the unsigned Cloudinary Power Start validation preset only.
 * It is never for production operator uploads. Production uploads use the
 * signed iPix flow (IPI-1110 · CLD-SIGN-001 + preset `ipix-signed-upload`
 * from IPI-1112 · CLD-DELIVERY-001 + IPI-1116 · CLD-UPLOAD-001).
 *
 * Approval must never make authenticated DAM assets public.
 */
cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };
