import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminProductEditor } from "@/components/admin-product-editor";

export const metadata: Metadata = { title: "Editare produs — Admin PC Forge" };

export default async function AdminProductEditPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <AdminProductEditor
      product={{
        id: product.id,
        name: product.name,
        brand: product.brand,
        categoryId: product.categoryId,
        price: Number(product.price),
        stock: product.stock,
        shortDescription: product.shortDescription,
        description: product.description,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        specifications: JSON.stringify(product.specifications ?? {}, null, 2),
      }}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
    />
  );
}
