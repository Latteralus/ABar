import { Navigate, Route, Routes } from "react-router-dom";
import { useGameStore } from "@/stores/gameStore";
import { DashboardLayout } from "./layout/DashboardLayout";
import { SaveSelectScreen } from "@/features/saves/SaveSelectScreen";
import { OverviewScreen } from "@/features/overview/OverviewScreen";
import { LiveOperationsScreen } from "@/features/operations/LiveOperationsScreen";
import { EmployeesScreen } from "@/features/employees/EmployeesScreen";
import { InventoryScreen } from "@/features/inventory/InventoryScreen";
import { MenuPricingScreen } from "@/features/menu/MenuPricingScreen";
import { PurchasingScreen } from "@/features/purchasing/PurchasingScreen";
import { EquipmentScreen } from "@/features/equipment/EquipmentScreen";
import { AttractionsScreen } from "@/features/attractions/AttractionsScreen";
import { FinancialsScreen } from "@/features/financials/FinancialsScreen";
import { ReportsScreen } from "@/features/reports/ReportsScreen";
import { ReputationScreen } from "@/features/reputation/ReputationScreen";
import { AdvertisingScreen } from "@/features/advertising/AdvertisingScreen";
import { SettingsScreen } from "@/features/settings/SettingsScreen";

export function App() {
  const activeGame = useGameStore((s) => s.state);

  if (!activeGame) {
    return <SaveSelectScreen />;
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewScreen />} />
        <Route path="/operations" element={<LiveOperationsScreen />} />
        <Route path="/employees" element={<EmployeesScreen />} />
        <Route path="/inventory" element={<InventoryScreen />} />
        <Route path="/menu" element={<MenuPricingScreen />} />
        <Route path="/purchasing" element={<PurchasingScreen />} />
        <Route path="/equipment" element={<EquipmentScreen />} />
        <Route path="/attractions" element={<AttractionsScreen />} />
        <Route path="/financials" element={<FinancialsScreen />} />
        <Route path="/reports" element={<ReportsScreen />} />
        <Route path="/reputation" element={<ReputationScreen />} />
        <Route path="/advertising" element={<AdvertisingScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  );
}
