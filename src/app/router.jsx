import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../layout/ProtectedRoute";
import MainLayout from "../layout/MainLayout";
import { useAuth } from "../features/auth/AuthContext";

const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const Forbidden = lazy(() => import("../pages/Forbidden"));

const SuperAdminDashboard = lazy(() => import("../features/dashboard/SuperAdminDashboard"));
const UserControlPage = lazy(() => import("../features/users/pages/UserControlPage"));
const AddUserPage = lazy(() => import("../features/users/pages/AddUserPage"));
const UserListPage = lazy(() => import("../features/users/pages/UserListPage"));

const JobTitleListPage = lazy(() => import("../features/master/pages/JobTitleListPage"));
const AddJobTitlePage = lazy(() => import("../features/master/pages/AddJobTitlePage"));
const DepartmentListPage = lazy(() => import("../features/master/pages/DepartmentListPage"));
const AddDepartmentPage = lazy(() => import("../features/master/pages/AddDepartmentPage"));

const CourierListPage = lazy(() => import("../features/master/pages/CourierListPage"));
const AddCourierPage = lazy(() => import("../features/master/pages/AddCourierPage"));
const TrayListPage = lazy(() => import("../features/master/pages/TrayListPage"));
const AddTrayPage = lazy(() => import("../features/master/pages/AddTrayPage"));

const InvoiceListPage = lazy(() => import("../features/invoice/pages/InvoiceListPage"));
const MyInvoiceListPage = lazy(() => import("../features/invoice/pages/MyInvoiceListPage"));
const PendingInvoicesPage = lazy(() => import("../features/invoice/pages/PendingInvoicesPage"));
const HistoryPage = lazy(() => import("../features/history/pages/HistoryPage"));
const InvoiceHistoryView = lazy(() => import("../features/history/pages/InvoiceHistoryView"));

import OperationsLayout from "../layout/OperationsLayout";
const PackingInvoiceListPage = lazy(() => import("../features/packing/pages/PackingInvoiceListPage"));
const MyPackingListPage = lazy(() => import("../features/packing/pages/MyPackingListPage"));
const TrayAssignmentPage = lazy(() => import("../features/packing/pages/TrayAssignmentPage"));
const BoxingListPage = lazy(() => import("../features/packing/pages/BoxingListPage"));
const BoxingPage = lazy(() => import("../features/packing/pages/BoxingPage"));
const MultiBoxingPage = lazy(() => import("../features/packing/pages/MultiBoxingPage"));
const InvoicePublicPage = lazy(() => import("../pages/InvoicePublicPage"));

// Import Billing Pages
const BillingInvoiceListPage = lazy(() => import("../features/billing/pages/BillingInvoiceListPage"));
const BillingInvoiceViewPage = lazy(() => import("../features/billing/pages/BillingInvoiceViewPage"));
const BillingReviewedListPage = lazy(() => import("../features/billing/pages/BillingReviewedListPage"));

// Import Express Billing Pages
const ExpressBillingListPage = lazy(() => import("../features/expressBilling/pages/ExpressBillingListPage"));

// Import Delivery Pages
const DeliveryDispatchPage = lazy(() => import("../features/delivery/pages/DeliveryDispatchPage"));
const MyDeliveryListPage = lazy(() => import("../features/delivery/pages/MyDeliveryListPage"));
const CourierDeliveryListPage = lazy(() => import("../features/delivery/pages/CourierDeliveryListPage"));
const CompanyDeliveryListPage = lazy(() => import("../features/delivery/pages/CompanyDeliveryListPage"));

const CommonInvoiceView = lazy(() => import("../components/CommonInvoiceView"));
const DeveloperSettingsPage = lazy(() => import("../pages/DeveloperSettingsPage"));
const AdminPrivilegePage = lazy(() => import("../pages/AdminPrivilegePage"));

// Import Reports Pages
const InvoiceReportPage = lazy(() => import("../features/reports/pages/InvoiceReportPage"));
const BillingUserSummaryPage = lazy(() => import("../features/reports/pages/BillingUserSummaryPage"));

const PickingInvoiceReportPage = lazy(() => import("../features/reports/pages/PickingInvoiceReportPage"));
const PickingUserSummaryPage = lazy(() => import("../features/reports/pages/PickingUserSummaryPage"));

const PackingInvoiceReportPage = lazy(() => import("../features/reports/pages/Packinginvoicereportpage"));
const PackingUserSummaryPage = lazy(() => import("../features/reports/pages/Packingusersummarypage"));
const DeliveryReportPage = lazy(() => import("../features/reports/pages/Deliveryreportpage"));
const DeliveryUserSummaryPage = lazy(() => import("../features/reports/pages/Deliveryusersummarypage"));
const ItemsBilledTodayPage = lazy(() => import("../features/reports/pages/ItemsBilledTodayPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-gray-600">
      Loading page...
    </div>
  );
}

export default function AppRouter() {
  const { user, menus = [], logout } = useAuth();
  
  // SUPERADMIN-only wrapper for developer settings
  const SuperAdminRoute = ({ children }) => {
    if (user?.role !== 'SUPERADMIN') {
      return <Navigate to="/403" replace />;
    }
    return children;
  };
  
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<Forbidden />} />
      <Route path="/invoice/:invoiceNo" element={<InvoicePublicPage />} />

      {/* ADMIN / SUPERADMIN / USER */}
      <Route element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "USER"]} />}>
        <Route element={<MainLayout />}>
          {/* Enteries dropdown fallback - redirects to first submenu item */}
          <Route path="/orders" element={<Navigate to="/billing/invoices" replace />} />
          
          <Route
            path="/dashboard"
            element={
              (user?.role === "SUPERADMIN" || user?.role === "ADMIN")
                ? <SuperAdminDashboard />
                : <Navigate to="/invoices" replace />
            }
          />
          
          {/* Picking routes */}
          <Route path="/invoices" element={<InvoiceListPage />} />
          {/* <Route path="/invoices/view/:id" element={<InvoiceViewPage />} /> */}
          <Route path="/invoices/my" element={<MyInvoiceListPage />} />
          <Route path="/invoices/pending" element={<PendingInvoicesPage />} />
          
          {/* Packing routes for SUPERADMIN */}
          <Route path="/packing/invoices" element={<PackingInvoiceListPage />} />
          {/* <Route path="/packing/invoices/view/:id" element={<PackingInvoiceViewPage />} /> */}
          <Route path="/packing/my" element={<MyPackingListPage />} />
          <Route path="/packing/tray-assignment/:invoiceNo" element={<TrayAssignmentPage />} />
          <Route path="/packing/boxing" element={<BoxingListPage />} />
          <Route path="/packing/boxing/multi" element={<MultiBoxingPage />} />
          <Route path="/packing/boxing/:invoiceNo" element={<BoxingPage />} />

          {/* Billing routes for SUPERADMIN */}
          <Route path="/billing/invoices" element={<BillingInvoiceListPage />} />
          <Route path="/billing/invoices/view/:id" element={<BillingInvoiceViewPage />} />
          <Route path="/billing/reviewed" element={<BillingReviewedListPage />} />

          {/* Express Billing routes */}
          <Route path="/billing/express" element={<ExpressBillingListPage />} />

          {/* Delivery routes for SUPERADMIN/ADMIN */}
          <Route path="/delivery/dispatch" element={<DeliveryDispatchPage />} />
          <Route path="/delivery/my" element={<MyDeliveryListPage />} />

          {/* User Management */}
          <Route path="/user-management" element={<UserListPage />} />
          <Route path="/user-control" element={<UserControlPage />} />
          <Route path="/add-user" element={<AddUserPage />} />
          <Route path="/users/:id/edit" element={<AddUserPage />} />

          {/* Master Data */}
          <Route path="/master/job-title" element={<JobTitleListPage />} />
          <Route path="/master/job-title/add" element={<AddJobTitlePage />} />
          <Route path="/master/department" element={<DepartmentListPage />} />
          <Route path="/master/department/add" element={<AddDepartmentPage />} />
          <Route path="/master/courier" element={<CourierListPage />} />
          <Route path="/master/courier/add" element={<AddCourierPage />} />

            <Route path="/master/tray" element={<TrayListPage />} />
            <Route path="/master/tray/add" element={<AddTrayPage />} />

          <Route path="/delivery/courier-list" element={<CourierDeliveryListPage />} />
          <Route path="/delivery/company-list" element={<CompanyDeliveryListPage />} />

          {/* Common Invoice View Routes */}
          <Route path="/invoices/view/:id/:section?" element={<CommonInvoiceView />} />
          <Route path="/packing/invoices/view/:id/:section?" element={<CommonInvoiceView />} />
          <Route path="/billing/invoices/view/:id/:section?" element={<CommonInvoiceView />} />
          <Route path="/delivery/invoices/view/:id/:section?" element={<CommonInvoiceView />} />

          {/* History */}
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/consolidate" element={<InvoiceHistoryView />} />
          <Route path="/history/invoice-report" element={<InvoiceReportPage />} />
          <Route path="/history/billing-user-summary" element={<BillingUserSummaryPage />} />
          <Route path="/history/picking-report" element={<PickingInvoiceReportPage />} />
          <Route path="/history/picking-user-summary" element={<PickingUserSummaryPage />} />
          <Route path="/history/packing-report" element={<PackingInvoiceReportPage />} />
          <Route path="/history/packing-user-summary" element={<PackingUserSummaryPage />} />
          <Route path="/history/delivery-report" element={<DeliveryReportPage />} />
          <Route path="/history/delivery-user-summary" element={<DeliveryUserSummaryPage />} />
          <Route path="/history/items-sold-today" element={<ItemsBilledTodayPage />} />

          {/* Developer Options - SUPERADMIN ONLY */}
          <Route 
            path="/developer/settings" 
            element={
              <SuperAdminRoute>
                <DeveloperSettingsPage />
              </SuperAdminRoute>
            } 
          />

          {/* Admin Privilege - SUPERADMIN/ADMIN */}
          <Route path="/admin/privilege" element={<AdminPrivilegePage />} />
        </Route>
      </Route>

      {/* OPERATIONS (PICKER, PACKER, BILLER, DELIVERY, STORE) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"]} />
        }
      >
        <Route element={<OperationsLayout />}>
          {/* Picking */}
          <Route path="/ops/picking/invoices" element={<InvoiceListPage />} />
          {/* <Route path="/ops/picking/invoices/view/:id" element={<InvoiceViewPage />} /> */}
          <Route path="/ops/picking/pending" element={<PendingInvoicesPage />} />

          {/* Packing */}
          <Route path="/ops/packing/invoices" element={<PackingInvoiceListPage />} />
          {/* <Route path="/ops/packing/invoices/view/:id" element={<PackingInvoiceViewPage />} /> */}
          <Route path="/ops/packing/my" element={<MyPackingListPage />} />
          <Route path="/ops/packing/tray-assignment/:invoiceNo" element={<TrayAssignmentPage />} />
          <Route path="/ops/packing/boxing" element={<BoxingListPage />} />
          <Route path="/ops/packing/boxing/multi" element={<MultiBoxingPage />} />
          <Route path="/ops/packing/boxing/:invoiceNo" element={<BoxingPage />} />

          {/* Billing */}
          <Route path="/ops/billing/invoices" element={<BillingInvoiceListPage />} />
          <Route path="/ops/billing/invoices/view/:id" element={<BillingInvoiceViewPage />} />
          <Route path="/ops/billing/reviewed" element={<BillingReviewedListPage />} />
          <Route path="/ops/billing/express" element={<ExpressBillingListPage />} />

          {/* Delivery */}
          <Route path="/ops/delivery/dispatch" element={<DeliveryDispatchPage />} />
          <Route path="/ops/delivery/my" element={<MyDeliveryListPage />} />
          <Route path="/ops/delivery/courier-list" element={<CourierDeliveryListPage />} />
          <Route path="/ops/delivery/company-list" element={<CompanyDeliveryListPage />} />

          <Route path="/ops/picking/invoices/view/:id" element={<CommonInvoiceView />} />
          <Route path="/ops/packing/invoices/view/:id" element={<CommonInvoiceView />} />
          <Route path="/ops/billing/invoices/view/:id" element={<CommonInvoiceView />} />
          <Route path="/ops/delivery/invoices/view/:id" element={<CommonInvoiceView />} />
        </Route>
      </Route>

      {/* Fallback */}
      {/* <Route path="*" element={<Navigate to="/403" replace />} /> */}
      </Routes>
    </Suspense>
  );
}