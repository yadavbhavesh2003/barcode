import { BarcodeSearch } from "@/components/search/BarcodeSearch";

export const metadata = {
  title: "Barcode Search & Reprint | Barcode Label Generator",
};

export default function SearchPage() {
  return (
    <div className="py-4">
      <BarcodeSearch />
    </div>
  );
}
