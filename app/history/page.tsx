import { BatchHistoryTable } from "@/components/history/BatchHistoryTable";

export const metadata = {
  title: "Batch History | Barcode Label Generator",
};

export default function HistoryPage() {
  return (
    <div className="py-4">
      <BatchHistoryTable />
    </div>
  );
}
