/**
 * Explicit accept lists.
 *
 * A bare "image/*" makes Android/Chrome (notably Realme/ColorOS) jump straight
 * into Google Photos. Listing concrete MIME types + extensions makes the browser
 * open the system document picker, where Files / internal storage / Downloads
 * are all available, while still filtering to the formats we support.
 */
export const IMAGE_ACCEPT =
  "image/jpeg,image/pjpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif";

export const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";
