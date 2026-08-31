const productSlugs = [
  "amd-ryzen-5-7600", "intel-core-i5-13400f", "nvidia-geforce-rtx-4060",
  "amd-radeon-rx-7600", "gigabyte-b650-gaming-x-ax", "msi-pro-b760m-a-wifi",
  "kingston-fury-beast-32gb-ddr5", "corsair-vengeance-lpx-16gb-ddr4",
  "samsung-980-1tb-nvme", "seagate-barracuda-2tb", "corsair-rm750e-750w",
  "seasonic-focus-gx-650", "nzxt-h5-flow", "fractal-design-pop-mini-air",
  "be-quiet-pure-rock-2", "noctua-nh-l9a-am5", "logitech-g502-hero",
  "keychron-k8-wireless", "arctic-mx-4-pasta-termica", "amd-ryzen-5-5600",
  "amd-ryzen-7-7800x3d", "intel-core-i7-13700f", "nvidia-geforce-rtx-3060-12gb",
  "nvidia-geforce-rtx-4070", "amd-radeon-rx-6700-xt", "msi-b450-tomahawk-max-ii",
  "asus-tuf-gaming-b650-plus-wifi", "gigabyte-b760-gaming-x-ddr4",
  "gskill-ripjaws-v-16gb-ddr4-3600", "kingston-fury-beast-32gb-ddr4-3200",
  "samsung-970-evo-plus-1tb", "kingston-nv2-1tb-nvme",
  "be-quiet-pure-power-12m-650w", "corsair-cx650-650w", "fsp-hyper-pro-400w",
  "fractal-design-pop-air", "deepcool-ak400", "logitech-g305-lightspeed",
  "noctua-nt-h1-pasta-termica", "sabrent-hub-usb-4-porturi",
] as const;

const nonJpegExtensions: Partial<Record<(typeof productSlugs)[number], string>> = {
  "amd-ryzen-5-7600": "webp",
  "nvidia-geforce-rtx-4060": "webp",
  "amd-ryzen-5-5600": "png",
  "nvidia-geforce-rtx-3060-12gb": "png",
  "fsp-hyper-pro-400w": "png",
};

/**
 * Căi locale de rezervă pentru produsele inițiale din seed.
 * `Product.imageUrl` rămâne sursa principală, astfel încât administratorul
 * poate schimba ulterior fotografia fără o modificare de cod.
 */
export const productImagesBySlug: Record<string, string> = Object.fromEntries(
  productSlugs.map((slug) => [
    slug,
    `/images/products/${slug}.${nonJpegExtensions[slug] ?? "jpg"}`,
  ]),
);
