export type ProductCategory =
  | "Procesor"
  | "Placă video"
  | "Placă de bază"
  | "Memorie RAM"
  | "Stocare"
  | "Sursă"
  | "Carcasă"
  | "Periferic";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  shortDescription: string;
  score: number;
  inStock: boolean;
};
