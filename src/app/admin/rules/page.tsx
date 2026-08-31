import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import {
  AdminRulesTable,
  type AdminRuleRow,
} from "@/components/admin-rules-table";

export const metadata: Metadata = { title: "Reguli CSP — Admin PC Forge" };

export default async function AdminRulesPage() {
  const rows = await prisma.compatibilityRule.findMany({
    orderBy: [{ isActive: "desc" }, { sourceType: "asc" }, { name: "asc" }],
  });
  const rules: AdminRuleRow[] = rows.map((rule) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    ruleType: rule.ruleType,
    sourceType: rule.sourceType,
    targetType: rule.targetType,
    sourceField: rule.sourceField,
    targetField: rule.targetField,
    operator: rule.operator,
    isActive: rule.isActive,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Reguli de compatibilitate CSP
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-400">
          Controlează regulile evaluate în timp real de configurator. Dezactivarea este reversibilă și nu șterge definiția regulii.
        </p>
      </div>
      <AdminRulesTable rules={rules} />
    </div>
  );
}
