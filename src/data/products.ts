import type { Product } from "@/types/product";

export const featuredProducts: Product[] = [
  {
    id: "cpu-ryzen-5-7600",
    name: "AMD Ryzen 5 7600",
    brand: "AMD",
    category: "Procesor",
    price: 899,
    shortDescription:
      "Procesor potrivit pentru sisteme de gaming și utilizare generală, bazat pe platforma AM5.",
    score: 8.7,
    inStock: true,
  },
  {
    id: "gpu-rtx-4060",
    name: "NVIDIA GeForce RTX 4060",
    brand: "NVIDIA",
    category: "Placă video",
    price: 1599,
    shortDescription:
      "Placă video orientată spre gaming Full HD, cu eficiență energetică bună.",
    score: 8.2,
    inStock: true,
  },
  {
    id: "mb-b650",
    name: "Placă de bază B650 AM5",
    brand: "Gigabyte",
    category: "Placă de bază",
    price: 749,
    shortDescription:
      "Placă de bază compatibilă cu procesoare AMD Ryzen pe socket AM5 și memorie DDR5.",
    score: 8.4,
    inStock: true,
  },
  {
    id: "ram-ddr5-32gb",
    name: "Memorie RAM 32GB DDR5",
    brand: "Kingston",
    category: "Memorie RAM",
    price: 549,
    shortDescription:
      "Kit de memorie DDR5 recomandat pentru configurații moderne de gaming și productivitate.",
    score: 8.9,
    inStock: false,
  },
];
