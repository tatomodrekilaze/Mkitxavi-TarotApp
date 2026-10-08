/** Absolute site URL used in Open Graph / Twitter cards. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL?.trim() || "http://localhost:8080").replace(
  /\/$/,
  "",
);

/** Image used when someone shares a link to the app. */
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

export const SITE_TITLE = "Mkitxavi - მკითხაობა ტაროზე მარიასთან";
export const SITE_DESCRIPTION =
  "მიიღე პერსონალური ტაროს პროგნოზი, დასვი შეკითხვები, შეამოწმე ზოდიაქოს თავსებადობა და ისწავლე ტაროს ბარათების მნიშვნელობები Mkitxavi-ზე.";
export const SITE_IMAGE_ALT = "Mkitxavi - შენი სულიერი მეგზური";
