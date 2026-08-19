import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata = {
  title: "Printer Calibration & Settings | Barcode Label Generator",
};

export default function SettingsPage() {
  return (
    <div className="py-4">
      <SettingsForm />
    </div>
  );
}
