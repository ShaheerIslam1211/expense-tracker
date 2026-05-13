import type { Expense } from "../types";
import { getCategoryDisplayName } from "./categoryDisplay";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** Reduce formula injection when CSV is opened in spreadsheet apps. */
function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@]/.test(s)) s = `\t${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export const exportToCSV = (expenses: Expense[], categories: Parameters<typeof getCategoryDisplayName>[1]) => {
  const headers = ["Date", "Type", "Category", "Amount", "Currency", "Note", "Payment Method", "Merchant"];

  const rows = expenses.map((e) => [
    new Date(e.date).toLocaleDateString(),
    e.type.toUpperCase(),
    getCategoryDisplayName(e, categories),
    e.amount,
    e.currency,
    e.note || "",
    e.paymentMethodType.toUpperCase(),
    e.merchant || "",
  ]);

  const csvContent = [
    headers.map((h) => csvCell(h)).join(","),
    ...rows.map((r) => r.map((cell) => csvCell(cell)).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `expenses_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (expenses: Expense[], categories: Parameters<typeof getCategoryDisplayName>[1]) => {
  const doc = new jsPDF();
  const headers = [["Date", "Type", "Category", "Amount", "Currency", "Note", "Payment Method"]];

  const data = expenses.map((e) => [
    new Date(e.date).toLocaleDateString(),
    e.type.toUpperCase(),
    getCategoryDisplayName(e, categories),
    e.amount.toString(),
    e.currency,
    e.note || "",
    e.paymentMethodType.toUpperCase(),
  ]);

  doc.text("Transaction Report", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    head: headers,
    body: data,
    startY: 30,
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] }, // Indigo-500
  });

  doc.save(`transactions_${new Date().toISOString().split("T")[0]}.pdf`);
};
