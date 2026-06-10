import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { PurchaseListPage } from "@/features/purchase/PurchaseListPage";
import { NewPurchaseItemPage } from "@/features/purchase/NewPurchaseItemPage";
import { EditPurchaseItemPage } from "@/features/purchase/EditPurchaseItemPage";
import { DestemmingListPage } from "@/features/destemming/DestemmingListPage";
import { NewDestemmingJobPage } from "@/features/destemming/NewDestemmingJobPage";
import { RaasiListPage } from "@/features/raasi/RaasiListPage";
import { NewRaasiBatchPage } from "@/features/raasi/NewRaasiBatchPage";
import { OrderListPage } from "@/features/order/OrderListPage";
import { NewOrderPage } from "@/features/order/NewOrderPage";
import { VarietiesPage } from "@/features/setup/VarietiesPage";
import { UserManagementPage } from "@/features/users/UserManagementPage";
import { NewUserPage } from "@/features/users/NewUserPage";
import { LoginPage } from "@/pages/LoginPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="login" element={<LoginPage />} />

      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/purchase" replace />} />

        {/* Inward · Purchase */}
        <Route path="purchase" element={<PurchaseListPage />} />
        <Route path="purchase/new" element={<NewPurchaseItemPage />} />
        <Route path="purchase/:id/edit" element={<EditPurchaseItemPage />} />

        {/* Inward — stage queues */}
        <Route
          path="machule"
          element={
            <PurchaseListPage
              initialStage={2}
              title="Machule queue"
              subtitle="Pending quality check at the shop"
              crumbs={[
                { label: "Operations", to: "/purchase" },
                { label: "Inward" },
                { label: "Machule" },
              ]}
              mobileBack={{ to: "/purchase", label: "Machule" }}
              rolePill={{ label: "Machule team", tone: "info" }}
              showNewCta={false}
            />
          }
        />
        <Route
          path="weighing"
          element={
            <PurchaseListPage
              initialStage={3}
              title="Weighing queue"
              subtitle="Confirm weight + finalise price"
              crumbs={[
                { label: "Operations", to: "/purchase" },
                { label: "Inward" },
                { label: "Weighing" },
              ]}
              mobileBack={{ to: "/purchase", label: "Weighing" }}
              rolePill={{ label: "Weighing team", tone: "info" }}
              showNewCta={false}
            />
          }
        />
        <Route
          path="loading"
          element={
            <PurchaseListPage
              initialStage={4}
              title="Loading queue"
              subtitle="Hand over to vehicle"
              crumbs={[
                { label: "Operations", to: "/purchase" },
                { label: "Inward" },
                { label: "Loading" },
              ]}
              mobileBack={{ to: "/purchase", label: "Loading" }}
              rolePill={{ label: "Loading team", tone: "info" }}
              showNewCta={false}
            />
          }
        />
        <Route
          path="receipt"
          element={
            <PurchaseListPage
              initialStage={5}
              title="Receipt queue"
              subtitle="Destination team confirms goods received"
              crumbs={[
                { label: "Operations", to: "/purchase" },
                { label: "Inward" },
                { label: "Receipt" },
              ]}
              mobileBack={{ to: "/purchase", label: "Receipt" }}
              rolePill={{ label: "Operations", tone: "info" }}
              showNewCta={false}
            />
          }
        />
        <Route
          path="accounts"
          element={
            <PurchaseListPage
              initialStage={6}
              title="Accounts queue"
              subtitle="Settle payment with the seller and close the purchase"
              crumbs={[
                { label: "Operations", to: "/purchase" },
                { label: "Inward" },
                { label: "Accounts" },
              ]}
              mobileBack={{ to: "/purchase", label: "Accounts" }}
              rolePill={{ label: "Accounts team", tone: "info" }}
              showNewCta={false}
            />
          }
        />

        {/* Grading */}
        <Route path="destemming" element={<DestemmingListPage />} />
        <Route path="destemming/new" element={<NewDestemmingJobPage />} />
        <Route path="raasi" element={<RaasiListPage />} />
        <Route path="raasi/new" element={<NewRaasiBatchPage />} />

        {/* Outward */}
        <Route path="outward" element={<OrderListPage />} />
        <Route path="outward/new" element={<NewOrderPage />} />

        {/* Setup */}
        <Route path="setup/varieties" element={<VarietiesPage />} />

        {/* User Management */}
        <Route path="user-management" element={<UserManagementPage />} />
        <Route path="user-management/new" element={<NewUserPage />} />
        <Route path="user-management/:id/edit" element={<NewUserPage />} />

        {/* Mobile "More" tab — replaced by Setup tab; keep for legacy */}
        <Route
          path="more"
          element={<Navigate to="/setup/varieties" replace />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/purchase" replace />} />
      </Route>
    </Routes>
  );
}
