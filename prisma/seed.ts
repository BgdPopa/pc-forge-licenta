import {
  PrismaClient,
  Prisma,
  ProductCategory,
  CompatibilityRuleType,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type CategorySeed = {
  type: ProductCategory;
  name: string;
  slug: string;
  description: string;
};

const categories: CategorySeed[] = [
  {
    type: "CPU",
    name: "Procesoare",
    slug: "procesoare",
    description: "Unități centrale de procesare pentru platforme AMD și Intel.",
  },
  {
    type: "GPU",
    name: "Plăci video",
    slug: "placi-video",
    description: "Plăci grafice pentru gaming, randare și accelerare hardware.",
  },
  {
    type: "MOTHERBOARD",
    name: "Plăci de bază",
    slug: "placi-de-baza",
    description: "Platforme compatibile cu socket-ul și memoria alese.",
  },
  {
    type: "RAM",
    name: "Memorii RAM",
    slug: "memorii-ram",
    description: "Module DDR4 și DDR5 pentru configurații moderne.",
  },
  {
    type: "STORAGE",
    name: "Stocare",
    slug: "stocare",
    description: "SSD-uri NVMe/SATA și hard disk-uri pentru sistem și date.",
  },
  {
    type: "PSU",
    name: "Surse de alimentare",
    slug: "surse-alimentare",
    description: "Surse dimensionate după consumul total al configurației.",
  },
  {
    type: "CASE",
    name: "Carcase",
    slug: "carcase",
    description: "Carcase compatibile cu factorul de formă al plăcii de bază.",
  },
  {
    type: "COOLER",
    name: "Răcire",
    slug: "racire",
    description: "Coolere de procesor cu compatibilitate pe înălțime și TDP.",
  },
  {
    type: "PERIPHERAL",
    name: "Periferice",
    slug: "periferice",
    description: "Tastaturi, mouse-uri, monitoare și alte periferice.",
  },
  {
    type: "ACCESSORY",
    name: "Accesorii",
    slug: "accesorii",
    description: "Pastă termică, cabluri și accesorii diverse.",
  },
];

type ComponentSeed = {
  socket?: string;
  ramType?: string;
  formFactor?: string;
  interfaceType?: string;
  tdpWatts?: number;
  powerWatts?: number;
  lengthMm?: number;
  heightMm?: number;
  widthMm?: number;
  metadata?: Prisma.InputJsonValue;
};

type ProductSeed = {
  categoryType: ProductCategory;
  name: string;
  slug: string;
  brand: string;
  description: string;
  shortDescription: string;
  price: number;
  stock: number;
  specifications?: Prisma.InputJsonValue;
  component?: ComponentSeed;
};

const products: ProductSeed[] = [
  // Procesoare
  {
    categoryType: "CPU",
    name: "AMD Ryzen 5 7600",
    slug: "amd-ryzen-5-7600",
    brand: "AMD",
    description:
      "Procesor cu 6 nuclee și 12 fire de execuție pe platforma AM5, potrivit pentru gaming și utilizare generală.",
    shortDescription:
      "6 nuclee / 12 fire, socket AM5, ideal gaming și uz general.",
    price: 899,
    stock: 25,
    specifications: {
      cores: 6,
      threads: 12,
      baseClock: "3.8 GHz",
      boostClock: "5.1 GHz",
    },
    component: { socket: "AM5", tdpWatts: 65 },
  },
  {
    categoryType: "CPU",
    name: "Intel Core i5-13400F",
    slug: "intel-core-i5-13400f",
    brand: "Intel",
    description:
      "Procesor Intel de generația 13 pe socket LGA1700, cu raport preț-performanță echilibrat pentru sisteme mainstream.",
    shortDescription: "10 nuclee, socket LGA1700, fără grafică integrată.",
    price: 849,
    stock: 18,
    specifications: {
      cores: 10,
      threads: 16,
      baseClock: "2.5 GHz",
      boostClock: "4.6 GHz",
    },
    component: { socket: "LGA1700", tdpWatts: 65 },
  },

  // Plăci video
  {
    categoryType: "GPU",
    name: "NVIDIA GeForce RTX 4060",
    slug: "nvidia-geforce-rtx-4060",
    brand: "NVIDIA",
    description:
      "Placă video orientată spre gaming Full HD, cu suport DLSS 3 și eficiență energetică bună.",
    shortDescription: "8GB GDDR6, gaming Full HD, eficientă energetic.",
    price: 1599,
    stock: 12,
    specifications: { vram: "8 GB GDDR6", interface: "PCIe 4.0" },
    component: { tdpWatts: 115, lengthMm: 245 },
  },
  {
    categoryType: "GPU",
    name: "AMD Radeon RX 7600",
    slug: "amd-radeon-rx-7600",
    brand: "AMD",
    description:
      "Placă video pentru gaming 1080p, cu arhitectură RDNA 3 și raport preț-performanță competitiv.",
    shortDescription: "8GB GDDR6, RDNA 3, gaming 1080p.",
    price: 1399,
    stock: 9,
    specifications: { vram: "8 GB GDDR6", interface: "PCIe 4.0" },
    component: { tdpWatts: 165, lengthMm: 270 },
  },

  // Plăci de bază
  {
    categoryType: "MOTHERBOARD",
    name: "Gigabyte B650 Gaming X AX",
    slug: "gigabyte-b650-gaming-x-ax",
    brand: "Gigabyte",
    description:
      "Placă de bază ATX pe socket AM5, cu suport DDR5 și conectivitate Wi-Fi, compatibilă cu procesoarele AMD Ryzen 7000.",
    shortDescription: "Socket AM5, DDR5, ATX, Wi-Fi inclus.",
    price: 949,
    stock: 14,
    specifications: { chipset: "B650", memorySlots: 4, maxMemory: "128 GB" },
    component: { socket: "AM5", ramType: "DDR5", formFactor: "ATX" },
  },
  {
    categoryType: "MOTHERBOARD",
    name: "MSI PRO B760M-A WiFi",
    slug: "msi-pro-b760m-a-wifi",
    brand: "MSI",
    description:
      "Placă de bază microATX pe socket LGA1700, cu suport DDR5, potrivită pentru procesoare Intel de generația 12 și 13.",
    shortDescription: "Socket LGA1700, DDR5, microATX, Wi-Fi.",
    price: 799,
    stock: 11,
    specifications: { chipset: "B760", memorySlots: 4, maxMemory: "128 GB" },
    component: { socket: "LGA1700", ramType: "DDR5", formFactor: "Micro-ATX" },
  },

  // Memorii RAM
  {
    categoryType: "RAM",
    name: "Kingston Fury Beast 32GB DDR5",
    slug: "kingston-fury-beast-32gb-ddr5",
    brand: "Kingston",
    description:
      "Kit de memorie 2x16GB DDR5 la 5600 MHz, recomandat pentru configurații moderne de gaming și productivitate.",
    shortDescription: "2x16GB DDR5, 5600 MHz.",
    price: 549,
    stock: 30,
    specifications: { capacity: "32 GB", speed: "5600 MHz", modules: 2 },
    component: { ramType: "DDR5" },
  },
  {
    categoryType: "RAM",
    name: "Corsair Vengeance LPX 16GB DDR4",
    slug: "corsair-vengeance-lpx-16gb-ddr4",
    brand: "Corsair",
    description:
      "Kit de memorie 2x8GB DDR4 la 3200 MHz, soluție echilibrată pentru platforme AM4 și Intel mai vechi.",
    shortDescription: "2x8GB DDR4, 3200 MHz.",
    price: 279,
    stock: 22,
    specifications: { capacity: "16 GB", speed: "3200 MHz", modules: 2 },
    component: { ramType: "DDR4" },
  },

  // Stocare
  {
    categoryType: "STORAGE",
    name: "Samsung 980 1TB NVMe",
    slug: "samsung-980-1tb-nvme",
    brand: "Samsung",
    description:
      "SSD M.2 NVMe de 1TB cu viteze mari de citire/scriere, potrivit pentru sistemul de operare și aplicații.",
    shortDescription: "1TB, M.2 NVMe PCIe 3.0.",
    price: 419,
    stock: 40,
    specifications: { capacity: "1 TB", readSpeed: "3500 MB/s" },
    component: { interfaceType: "M.2 NVMe" },
  },
  {
    categoryType: "STORAGE",
    name: "Seagate BarraCuda 2TB",
    slug: "seagate-barracuda-2tb",
    brand: "Seagate",
    description:
      "Hard disk de 2TB la 7200 RPM, soluție economică pentru stocarea de date și jocuri.",
    shortDescription: "2TB HDD, 7200 RPM, interfață SATA.",
    price: 329,
    stock: 35,
    specifications: { capacity: "2 TB", rpm: 7200 },
    component: { interfaceType: "SATA" },
  },

  // Surse
  {
    categoryType: "PSU",
    name: "Corsair RM750e 750W",
    slug: "corsair-rm750e-750w",
    brand: "Corsair",
    description:
      "Sursă de alimentare complet modulară de 750W cu certificare 80+ Gold, potrivită pentru configurații de gaming mid-range.",
    shortDescription: "750W, 80+ Gold, complet modulară.",
    price: 549,
    stock: 16,
    specifications: {
      wattage: "750 W",
      certification: "80+ Gold",
      modular: true,
    },
    component: { powerWatts: 750, formFactor: "ATX" },
  },
  {
    categoryType: "PSU",
    name: "Seasonic Focus GX-650",
    slug: "seasonic-focus-gx-650",
    brand: "Seasonic",
    description:
      "Sursă de 650W cu certificare 80+ Gold, fiabilă pentru sisteme de putere medie.",
    shortDescription: "650W, 80+ Gold, modulară.",
    price: 489,
    stock: 13,
    specifications: {
      wattage: "650 W",
      certification: "80+ Gold",
      modular: true,
    },
    component: { powerWatts: 650, formFactor: "ATX" },
  },

  // Carcase
  {
    categoryType: "CASE",
    name: "NZXT H5 Flow",
    slug: "nzxt-h5-flow",
    brand: "NZXT",
    description:
      "Carcasă ATX cu flux de aer optimizat, suport pentru plăci video lungi și coolere înalte.",
    shortDescription: "Mid-tower ATX, flux de aer bun.",
    price: 459,
    stock: 10,
    specifications: { type: "Mid-Tower" },
    component: {
      formFactor: "ATX",
      metadata: { maxGpuLengthMm: 365, maxCoolerHeightMm: 165 },
    },
  },
  {
    categoryType: "CASE",
    name: "Fractal Design Pop Mini Air",
    slug: "fractal-design-pop-mini-air",
    brand: "Fractal Design",
    description:
      "Carcasă microATX compactă cu panou frontal mesh, potrivită pentru build-uri mici și aerisite.",
    shortDescription: "Micro-ATML compactă, panou mesh.",
    price: 369,
    stock: 8,
    specifications: { type: "Mini-Tower" },
    component: {
      formFactor: "Micro-ATX",
      metadata: { maxGpuLengthMm: 275, maxCoolerHeightMm: 160 },
    },
  },

  // Răcire
  {
    categoryType: "COOLER",
    name: "be quiet! Pure Rock 2",
    slug: "be-quiet-pure-rock-2",
    brand: "be quiet!",
    description:
      "Cooler de procesor cu radiator pe heatpipe-uri, silențios, compatibil cu socket AM5 și LGA1700.",
    shortDescription: "Air cooler silențios, AM5/LGA1700.",
    price: 199,
    stock: 20,
    specifications: { type: "Air", fanSize: "120 mm" },
    component: {
      heightMm: 155,
      metadata: { supportedTdpWatts: 150, sockets: ["AM5", "LGA1700"] },
    },
  },
  {
    categoryType: "COOLER",
    name: "Noctua NH-L9a-AM5",
    slug: "noctua-nh-l9a-am5",
    brand: "Noctua",
    description:
      "Cooler low-profile pentru build-uri compacte pe socket AM5, cu înălțime redusă pentru carcase mici.",
    shortDescription: "Low-profile, 37mm, socket AM5.",
    price: 269,
    stock: 7,
    specifications: { type: "Air", profile: "Low-profile" },
    component: {
      heightMm: 37,
      metadata: { supportedTdpWatts: 95, sockets: ["AM5"] },
    },
  },

  // Periferice (fără Component — nu participă la CSP)
  {
    categoryType: "PERIPHERAL",
    name: "Logitech G502 HERO",
    slug: "logitech-g502-hero",
    brand: "Logitech",
    description:
      "Mouse de gaming cu senzor HERO 25K și 11 butoane programabile.",
    shortDescription: "Mouse gaming, senzor HERO 25K.",
    price: 249,
    stock: 50,
    specifications: { dpi: 25600, buttons: 11 },
  },
  {
    categoryType: "PERIPHERAL",
    name: "Keychron K8 Wireless",
    slug: "keychron-k8-wireless",
    brand: "Keychron",
    description:
      "Tastatură mecanică wireless tenkeyless, compatibilă cu Windows și macOS.",
    shortDescription: "Tastatură mecanică TKL, wireless.",
    price: 459,
    stock: 24,
    specifications: { layout: "TKL", connectivity: "Bluetooth / USB-C" },
  },

  // Accesorii (fără Component)
  {
    categoryType: "ACCESSORY",
    name: "Arctic MX-4 Pastă termică",
    slug: "arctic-mx-4-pasta-termica",
    brand: "Arctic",
    description:
      "Pastă termică de înaltă performanță pentru procesoare și plăci video, 4 grame.",
    shortDescription: "Pastă termică performantă, 4g.",
    price: 45,
    stock: 80,
    specifications: { weight: "4 g" },
  },

  // ── Produse noi ────────────────────────────────────────────────────────────

  // CPU suplimentare
  {
    categoryType: "CPU",
    name: "AMD Ryzen 5 5600",
    slug: "amd-ryzen-5-5600",
    brand: "AMD",
    description:
      "Procesor cu 6 nuclee pe platforma AM4, excelent raport preț-performanță pentru gaming la 1080p și 1440p pe sistemele DDR4 existente.",
    shortDescription: "6 nuclee / 12 fire, socket AM4, DDR4.",
    price: 599,
    stock: 20,
    specifications: {
      cores: 6,
      threads: 12,
      baseClock: "3.5 GHz",
      boostClock: "4.4 GHz",
    },
    component: { socket: "AM4", tdpWatts: 65 },
  },
  {
    categoryType: "CPU",
    name: "AMD Ryzen 7 7800X3D",
    slug: "amd-ryzen-7-7800x3d",
    brand: "AMD",
    description:
      "Cel mai rapid procesor gaming pe socket AM5, cu tehnologie 3D V-Cache care aduce câștiguri semnificative în titluri competitive.",
    shortDescription: "8 nuclee, AM5, 3D V-Cache, gaming king.",
    price: 1699,
    stock: 8,
    specifications: {
      cores: 8,
      threads: 16,
      baseClock: "4.5 GHz",
      boostClock: "5.0 GHz",
    },
    component: { socket: "AM5", tdpWatts: 120 },
  },
  {
    categoryType: "CPU",
    name: "Intel Core i7-13700F",
    slug: "intel-core-i7-13700f",
    brand: "Intel",
    description:
      "Procesor de generația 13 cu 16 nuclee (8P+8E) pe socket LGA1700, performanță ridicată atât în gaming, cât și în sarcini de creație.",
    shortDescription: "16 nuclee, socket LGA1700, fără grafică integrată.",
    price: 1199,
    stock: 14,
    specifications: {
      cores: 16,
      threads: 24,
      baseClock: "2.1 GHz",
      boostClock: "5.2 GHz",
    },
    component: { socket: "LGA1700", tdpWatts: 65 },
  },

  // GPU suplimentare
  {
    categoryType: "GPU",
    name: "NVIDIA GeForce RTX 3060 12GB",
    slug: "nvidia-geforce-rtx-3060-12gb",
    brand: "NVIDIA",
    description:
      "Placă video cu 12 GB VRAM, excelentă pentru gaming Full HD și 1440p la setări medii-înalte, cu suport ray tracing.",
    shortDescription: "12GB GDDR6, gaming 1080p/1440p, RTX.",
    price: 1199,
    stock: 15,
    specifications: { vram: "12 GB GDDR6", interface: "PCIe 4.0" },
    component: { tdpWatts: 170, lengthMm: 242 },
  },
  {
    categoryType: "GPU",
    name: "NVIDIA GeForce RTX 4070",
    slug: "nvidia-geforce-rtx-4070",
    brand: "NVIDIA",
    description:
      "Placă video high-end din generația Ada Lovelace, cu 12 GB GDDR6X și suport DLSS 3 pentru gaming 1440p/4K fluid.",
    shortDescription: "12GB GDDR6X, DLSS 3, 1440p/4K.",
    price: 2499,
    stock: 6,
    specifications: { vram: "12 GB GDDR6X", interface: "PCIe 4.0" },
    component: { tdpWatts: 200, lengthMm: 285 },
  },
  {
    categoryType: "GPU",
    name: "AMD Radeon RX 6700 XT",
    slug: "amd-radeon-rx-6700-xt",
    brand: "AMD",
    description:
      "Placă video cu arhitectură RDNA 2 și 12 GB VRAM, optimizată pentru gaming la 1440p cu rate de cadre ridicate.",
    shortDescription: "12GB GDDR6, RDNA 2, gaming 1440p.",
    price: 1299,
    stock: 10,
    specifications: { vram: "12 GB GDDR6", interface: "PCIe 4.0" },
    component: { tdpWatts: 230, lengthMm: 267 },
  },

  // Plăci de bază suplimentare
  {
    categoryType: "MOTHERBOARD",
    name: "MSI B450 TOMAHAWK MAX II",
    slug: "msi-b450-tomahawk-max-ii",
    brand: "MSI",
    description:
      "Placă de bază ATX pentru socket AM4, cu suport DDR4 și compatibilitate cu procesoarele AMD Ryzen din generațiile 3, 5 și 7.",
    shortDescription: "Socket AM4, DDR4, ATX, chipset B450.",
    price: 549,
    stock: 12,
    specifications: { chipset: "B450", memorySlots: 4, maxMemory: "128 GB" },
    component: { socket: "AM4", ramType: "DDR4", formFactor: "ATX" },
  },
  {
    categoryType: "MOTHERBOARD",
    name: "ASUS TUF Gaming B650-PLUS WiFi",
    slug: "asus-tuf-gaming-b650-plus-wifi",
    brand: "ASUS",
    description:
      "Placă de bază ATX pentru socket AM5 cu chipset B650, suport DDR5, Wi-Fi 6 și faze de alimentare robuste pentru procesoarele Ryzen 7000.",
    shortDescription: "Socket AM5, DDR5, ATX, Wi-Fi 6.",
    price: 1099,
    stock: 9,
    specifications: { chipset: "B650", memorySlots: 4, maxMemory: "128 GB" },
    component: { socket: "AM5", ramType: "DDR5", formFactor: "ATX" },
  },
  {
    categoryType: "MOTHERBOARD",
    name: "Gigabyte B760 Gaming X DDR4",
    slug: "gigabyte-b760-gaming-x-ddr4",
    brand: "Gigabyte",
    description:
      "Placă de bază ATX pe socket LGA1700 cu suport DDR4, ideală pentru cei care migrează de pe platformele anterioare păstrând memoria DDR4.",
    shortDescription: "Socket LGA1700, DDR4, ATX, chipset B760.",
    price: 799,
    stock: 11,
    specifications: { chipset: "B760", memorySlots: 4, maxMemory: "128 GB" },
    component: { socket: "LGA1700", ramType: "DDR4", formFactor: "ATX" },
  },

  // RAM suplimentare
  {
    categoryType: "RAM",
    name: "G.Skill Ripjaws V 16GB DDR4 3600",
    slug: "gskill-ripjaws-v-16gb-ddr4-3600",
    brand: "G.Skill",
    description:
      "Kit de memorie 2x8GB DDR4 la 3600 MHz, cu profil XMP 2.0 și latențe mici, recomandat pentru platformele AM4 și LGA1700 DDR4.",
    shortDescription: "2x8GB DDR4, 3600 MHz, XMP 2.0.",
    price: 239,
    stock: 28,
    specifications: { capacity: "16 GB", speed: "3600 MHz", modules: 2 },
    component: { ramType: "DDR4" },
  },
  {
    categoryType: "RAM",
    name: "Kingston Fury Beast 32GB DDR4 3200",
    slug: "kingston-fury-beast-32gb-ddr4-3200",
    brand: "Kingston",
    description:
      "Kit de memorie 2x16GB DDR4 la 3200 MHz, soluție DDR4 de capacitate mare pentru stații de lucru și editing video pe platforme AM4 sau LGA1700.",
    shortDescription: "2x16GB DDR4, 3200 MHz.",
    price: 379,
    stock: 18,
    specifications: { capacity: "32 GB", speed: "3200 MHz", modules: 2 },
    component: { ramType: "DDR4" },
  },

  // Stocare suplimentară
  {
    categoryType: "STORAGE",
    name: "Samsung 970 EVO Plus 1TB",
    slug: "samsung-970-evo-plus-1tb",
    brand: "Samsung",
    description:
      "SSD M.2 NVMe de 1TB din a doua generație V-NAND cu viteze de până la 3500 MB/s la citire, potrivit pentru sistemul de operare și jocuri.",
    shortDescription: "1TB M.2 NVMe PCIe 3.0, 3500 MB/s citire.",
    price: 449,
    stock: 32,
    specifications: {
      capacity: "1 TB",
      readSpeed: "3500 MB/s",
      writeSpeed: "3300 MB/s",
    },
    component: { interfaceType: "M.2 NVMe" },
  },
  {
    categoryType: "STORAGE",
    name: "Kingston NV2 1TB NVMe",
    slug: "kingston-nv2-1tb-nvme",
    brand: "Kingston",
    description:
      "SSD M.2 NVMe PCIe 4.0 de 1TB la un preț accesibil, recomandat ca drive secundar sau soluție de buget pentru sistemul de operare.",
    shortDescription: "1TB M.2 NVMe PCIe 4.0, buget.",
    price: 279,
    stock: 45,
    specifications: {
      capacity: "1 TB",
      readSpeed: "3500 MB/s",
      writeSpeed: "2100 MB/s",
    },
    component: { interfaceType: "M.2 NVMe" },
  },

  // Surse suplimentare
  {
    categoryType: "PSU",
    name: "be quiet! Pure Power 12 M 650W",
    slug: "be-quiet-pure-power-12m-650w",
    brand: "be quiet!",
    description:
      "Sursă de 650W semi-modulară cu certificare 80+ Gold și ventilatoare silențioase, potrivită pentru sisteme mid-range.",
    shortDescription: "650W, 80+ Gold, semi-modulară, silențioasă.",
    price: 399,
    stock: 14,
    specifications: {
      wattage: "650 W",
      certification: "80+ Gold",
      modular: false,
    },
    component: { powerWatts: 650, formFactor: "ATX" },
  },
  {
    categoryType: "PSU",
    name: "Corsair CX650 650W",
    slug: "corsair-cx650-650w",
    brand: "Corsair",
    description:
      "Sursă de 650W non-modulară cu certificare 80+ Bronze, soluție de buget pentru sisteme de putere medie.",
    shortDescription: "650W, 80+ Bronze, non-modulară.",
    price: 319,
    stock: 19,
    specifications: {
      wattage: "650 W",
      certification: "80+ Bronze",
      modular: false,
    },
    component: { powerWatts: 650, formFactor: "ATX" },
  },

  // PSU buget (folosit pentru scenariul de demo putere insuficientă)
  {
    categoryType: "PSU",
    name: "FSP Hyper Pro 400W",
    slug: "fsp-hyper-pro-400w",
    brand: "FSP",
    description:
      "Sursă de alimentare 400W non-modulară, pentru configurații de buget redus. Notă: verifică consumul total înainte de utilizare cu componente de clasă mid-range.",
    shortDescription: "400W, non-modulară, entry-level.",
    price: 149,
    stock: 22,
    specifications: {
      wattage: "400 W",
      certification: "80+",
      modular: false,
    },
    component: { powerWatts: 400, formFactor: "ATX" },
  },

  // Carcasă suplimentară
  {
    categoryType: "CASE",
    name: "Fractal Design Pop Air",
    slug: "fractal-design-pop-air",
    brand: "Fractal Design",
    description:
      "Carcasă ATX mid-tower cu panou frontal mesh și panou lateral din sticlă călită, livrată cu trei ventilatoare de 120 mm.",
    shortDescription: "Mid-tower ATX, mesh front, trei ventilatoare incluse.",
    price: 399,
    stock: 7,
    specifications: { type: "Mid-Tower" },
    component: {
      formFactor: "ATX",
      metadata: { maxGpuLengthMm: 360, maxCoolerHeightMm: 168 },
    },
  },

  // Cooler suplimentar
  {
    categoryType: "COOLER",
    name: "DeepCool AK400",
    slug: "deepcool-ak400",
    brand: "DeepCool",
    description:
      "Cooler air cu patru heatpipe-uri, ventilator de 120 mm și suport pentru socket AM4, AM5 și LGA1700. Raport calitate-preț excelent.",
    shortDescription: "Air cooler, 4 heatpipe, AM4/AM5/LGA1700.",
    price: 169,
    stock: 25,
    specifications: { type: "Air", fanSize: "120 mm" },
    component: {
      heightMm: 155,
      metadata: { supportedTdpWatts: 220, sockets: ["AM4", "AM5", "LGA1700"] },
    },
  },

  // Periferic suplimentar
  {
    categoryType: "PERIPHERAL",
    name: "Logitech G305 Lightspeed",
    slug: "logitech-g305-lightspeed",
    brand: "Logitech",
    description:
      "Mouse de gaming wireless ultraușor cu tehnologie LIGHTSPEED pentru latență sub 1ms și baterie cu autonomie de până la 250 de ore.",
    shortDescription: "Mouse gaming wireless, senzor HERO 12K, ultraușor.",
    price: 199,
    stock: 40,
    specifications: { dpi: 12000, buttons: 6, connectivity: "Wireless LIGHTSPEED" },
  },

  // Accesorii suplimentare
  {
    categoryType: "ACCESSORY",
    name: "Noctua NT-H1 Pastă termică",
    slug: "noctua-nt-h1-pasta-termica",
    brand: "Noctua",
    description:
      "Pastă termică premium pentru procesoare și plăci video, cu conductivitate termică ridicată și durabilitate îndelungată.",
    shortDescription: "Pastă termică premium, conductivitate ridicată.",
    price: 49,
    stock: 60,
    specifications: { weight: "3.5 g" },
  },
  {
    categoryType: "ACCESSORY",
    name: "Sabrent Hub USB 3.0 4 porturi",
    slug: "sabrent-hub-usb-4-porturi",
    brand: "Sabrent",
    description:
      "Hub USB 3.0 cu 4 porturi și alimentare independentă pentru perifericele conexe la carcasa PC-ului.",
    shortDescription: "4x USB 3.0, alimentare independentă.",
    price: 69,
    stock: 35,
    specifications: { connectivity: "USB 3.0", type: "Hub" },
  },
];

type RuleSeed = {
  id: string;
  name: string;
  description: string;
  ruleType: CompatibilityRuleType;
  sourceType: ProductCategory;
  targetType: ProductCategory;
  sourceField?: string;
  targetField?: string;
  operator?: string;
  expectedValue?: string;
};

const compatibilityRules: RuleSeed[] = [
  {
    id: "rule-cpu-socket-match",
    name: "Socket procesor compatibil cu placa de bază",
    description:
      "Socket-ul procesorului trebuie să fie identic cu socket-ul plăcii de bază.",
    ruleType: "CPU_SOCKET_MATCH",
    sourceType: "CPU",
    targetType: "MOTHERBOARD",
    sourceField: "socket",
    targetField: "socket",
    operator: "EQUALS",
  },
  {
    id: "rule-ram-type-match",
    name: "Tip memorie compatibil cu placa de bază",
    description:
      "Tipul memoriei RAM trebuie să corespundă tipului suportat de placa de bază.",
    ruleType: "RAM_TYPE_MATCH",
    sourceType: "RAM",
    targetType: "MOTHERBOARD",
    sourceField: "ramType",
    targetField: "ramType",
    operator: "EQUALS",
  },
  {
    id: "rule-psu-power-sufficient",
    name: "Putere sursă suficientă pentru consum",
    description:
      "Puterea sursei trebuie să acopere consumul total estimat al configurației.",
    ruleType: "PSU_POWER_SUFFICIENT",
    sourceType: "PSU",
    targetType: "GPU",
    sourceField: "powerWatts",
    targetField: "tdpWatts",
    operator: "GREATER_OR_EQUAL",
  },
  {
    id: "rule-cooler-height-supported",
    name: "Înălțime cooler suportată de carcasă",
    description:
      "Înălțimea cooler-ului nu trebuie să depășească înălțimea maximă admisă de carcasă.",
    ruleType: "COOLER_HEIGHT_SUPPORTED",
    sourceType: "COOLER",
    targetType: "CASE",
    sourceField: "heightMm",
    targetField: "maxCoolerHeightMm",
    operator: "LESS_OR_EQUAL",
  },
  {
    id: "rule-gpu-length-supported",
    name: "Lungime placă video compatibilă cu carcasa",
    description:
      "Lungimea plăcii video nu trebuie să depășească lungimea maximă admisă de carcasă.",
    ruleType: "GPU_LENGTH_SUPPORTED",
    sourceType: "GPU",
    targetType: "CASE",
    sourceField: "lengthMm",
    targetField: "maxGpuLengthMm",
    operator: "LESS_OR_EQUAL",
  },
  {
    id: "rule-cooler-socket-compatible",
    name: "Socket cooler compatibil cu procesorul",
    description:
      "Cooler-ul trebuie să suporte socket-ul procesorului ales (verificare pe lista de socket-uri declarată de producător).",
    ruleType: "CUSTOM",
    sourceType: "CPU",
    targetType: "COOLER",
    sourceField: "socket",
    targetField: "sockets",
    operator: "CONTAINS",
  },
];

type UserSeed = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

// Utilizatori de development. Parolele sunt hash-uite cu bcrypt înainte de
// stocare; în baza de date ajunge doar `passwordHash`, niciodată parola în clar.
// Aceste credențiale sunt strict pentru testare locală și demonstrație.
const users: UserSeed[] = [
  {
    name: "Administrator PC Forge",
    email: "admin@pcforge.local",
    password: "admin12345",
    role: "ADMIN",
  },
  {
    name: "Utilizator Demo",
    email: "user@pcforge.local",
    password: "user12345",
    role: "USER",
  },
];

async function main() {
  console.log("Seed pornit...");

  const categoryIdByType = new Map<ProductCategory, string>();

  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        type: category.type,
        description: category.description,
      },
      create: {
        name: category.name,
        slug: category.slug,
        type: category.type,
        description: category.description,
      },
    });
    categoryIdByType.set(category.type, record.id);
  }
  console.log(`Categorii sincronizate: ${categories.length}`);

  for (const product of products) {
    const categoryId = categoryIdByType.get(product.categoryType);
    if (!categoryId) {
      throw new Error(
        `Categorie inexistentă pentru tipul ${product.categoryType} (produs: ${product.slug}).`,
      );
    }

    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        brand: product.brand,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        stock: product.stock,
        categoryId,
        categoryType: product.categoryType,
        specifications: product.specifications ?? undefined,
        isActive: true,
      },
      create: {
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        stock: product.stock,
        categoryId,
        categoryType: product.categoryType,
        specifications: product.specifications ?? undefined,
      },
    });

    if (product.component) {
      // Consistență impusă explicit: Component.type == Product.categoryType.
      await prisma.component.upsert({
        where: { productId: created.id },
        update: {
          type: product.categoryType,
          socket: product.component.socket ?? null,
          ramType: product.component.ramType ?? null,
          formFactor: product.component.formFactor ?? null,
          interfaceType: product.component.interfaceType ?? null,
          tdpWatts: product.component.tdpWatts ?? null,
          powerWatts: product.component.powerWatts ?? null,
          lengthMm: product.component.lengthMm ?? null,
          heightMm: product.component.heightMm ?? null,
          widthMm: product.component.widthMm ?? null,
          metadata: product.component.metadata ?? undefined,
        },
        create: {
          productId: created.id,
          type: product.categoryType,
          socket: product.component.socket,
          ramType: product.component.ramType,
          formFactor: product.component.formFactor,
          interfaceType: product.component.interfaceType,
          tdpWatts: product.component.tdpWatts,
          powerWatts: product.component.powerWatts,
          lengthMm: product.component.lengthMm,
          heightMm: product.component.heightMm,
          widthMm: product.component.widthMm,
          metadata: product.component.metadata ?? undefined,
        },
      });
    }
  }
  console.log(`Produse sincronizate: ${products.length}`);

  for (const rule of compatibilityRules) {
    await prisma.compatibilityRule.upsert({
      where: { id: rule.id },
      update: {
        name: rule.name,
        description: rule.description,
        ruleType: rule.ruleType,
        sourceType: rule.sourceType,
        targetType: rule.targetType,
        sourceField: rule.sourceField,
        targetField: rule.targetField,
        operator: rule.operator,
        isActive: true,
      },
      create: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        ruleType: rule.ruleType,
        sourceType: rule.sourceType,
        targetType: rule.targetType,
        sourceField: rule.sourceField,
        targetField: rule.targetField,
        operator: rule.operator,
      },
    });
  }
  console.log(
    `Reguli de compatibilitate sincronizate: ${compatibilityRules.length}`,
  );

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
      },
    });
  }
  console.log(`Utilizatori sincronizați: ${users.length}`);

  console.log("Seed finalizat cu succes.");
}

main()
  .catch((error) => {
    console.error("Eroare la seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
