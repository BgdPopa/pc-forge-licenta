import type { ProductCategory } from "@prisma/client";

// Forma de date de care are nevoie interfața pentru a afișa un produs.
// Decuplează componentele UI de modelul Prisma: datele din baza de date
// (Decimal pentru preț, enum categoryType, stock numeric) sunt mapate la
// acest view-model înainte de randare.
export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryLabel: string;
  price: number;
  shortDescription: string;
  inStock: boolean;
  score?: number;
};

// Etichete în română pentru valorile enum-ului ProductCategory.
// Tipul Record garantează că orice categorie nouă adăugată în enum
// trebuie să primească o etichetă, altfel TypeScript semnalează eroare.
export const categoryLabels: Record<ProductCategory, string> = {
  CPU: "Procesor",
  GPU: "Placă video",
  MOTHERBOARD: "Placă de bază",
  RAM: "Memorie RAM",
  STORAGE: "Stocare",
  PSU: "Sursă",
  CASE: "Carcasă",
  COOLER: "Răcire",
  PERIPHERAL: "Periferic",
  ACCESSORY: "Accesoriu",
};
