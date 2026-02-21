import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage";
import ProtectedRoute from "../layout/ProtectedRoute";
import MainLayout from "../layout/MainLayout";
import Forbidden from "../pages/Forbidden";

import SuperAdminDashboard from "../features/dashboard/SuperAdminDashboard";
import UserDashboard from "../features/dashboard/UserDashboard";
import UserControlPage from "../features/users/pages/UserControlPage";
import AddUserPage from "../features/users/pages/AddUserPage";
import UserListPage from "../features/users/pages/UserListPage";

import JobTitleListPage from "../features/master/pages/JobTitleListPage";
import AddJobTitlePage from "../features/master/pages/AddJobTitlePage";
import DepartmentListPage from "../features/master/pages/DepartmentListPage";
import AddDepartmentPage from "../features/master/pages/AddDepartmentPage";
import CourierListPage from "../features/master/pages/CourierListPage";
import AddCourierPage from "../features/master/pages/AddCourierPage";

import InvoiceListPage from "../features/invoice/pages/InvoiceListPage";
// import InvoiceViewPage from "../features/invoice/pages/InvoiceViewPage";
import MyInvoiceListPage from "../features/invoice/pages/MyInvoiceListPage";
import PendingInvoicesPage from "../features/invoice/pages/PendingInvoicesPage";
import HistoryPage from "../features/history/pages/HistoryPage";
import InvoiceHistoryView from "../features/history/pages/InvoiceHistoryView";
import { useAuth } from "../features/auth/AuthContext";

import OperationsLayout from "../layout/OperationsLayout";
import PackingInvoiceListPage from "../features/packing/pages/PackingInvoiceListPage";
// import PackingInvoiceViewPage from "../features/packing/pages/PackingInvoiceViewPage";
import MyPackingListPage from "../features/packing/pages/MyPackingListPage";
import BoxAssignmentPage from "../features/packing/pages/BoxAssignmentPage";
import ConsolidatedPackingPage from "../features/packing/pages/ConsolidatedPackingPage";
import BoxLabelPrintPage from "../features/packing/pages/BoxLabelPrintPage";
import BoxDetailsPage from "../features/packing/pages/BoxDetailsPage";

// Import Billing Pages
import BillingInvoiceListPage from "../features/billing/pages/BillingInvoiceListPage";
import BillingInvoiceViewPage from "../features/billing/pages/BillingInvoiceViewPage";
import BillingReviewedListPage from "../features/billing/pages/BillingReviewedListPage";

// Import Delivery Pages
import DeliveryDispatchPage from "../features/delivery/pages/DeliveryDispatchPage";
import MyDeliveryListPage from "../features/delivery/pages/MyDeliveryListPage";
import CourierDeliveryListPage from "../features/delivery/pages/CourierDeliveryListPage";
import CompanyDeliveryListPage from "../features/delivery/pages/CompanyDeliveryListPage";

import CommonInvoiceView from "../components/CommonInvoiceView";
import DeveloperSettingsPage from "../pages/DeveloperSettingsPage";
import AdminPrivilegePage from "../pages/AdminPrivilegePage";

// Import Reports Pages
import InvoiceReportPage from "../features/reports/pages/InvoiceReportPage";
import BillingUserSummaryPage from "../features/reports/pages/BillingUserSummaryPage";

import PickingInvoiceReportPage from "../features/reports/pages/PickingInvoiceReportPage";
import PickingUserSummaryPage from "../features/reports/pages/PickingUserSummaryPage";

import PackingInvoiceReportPage from "../features/reports/pages/Packinginvoicereportpage";
import PackingUserSummaryPage from "../features/reports/pages/Packingusersummarypage";

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
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<Forbidden />} />
      <Route path="/box/:boxId" element={<BoxDetailsPage />} />

      {/* ADMIN / SUPERADMIN / USER */}
      <Route element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "USER"]} />}>
        <Route element={<MainLayout />}>
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
          <Route path="/packing/box-assignment/:invoiceNo" element={<BoxAssignmentPage />} />
          <Route path="/packing/consolidated-packing" element={<ConsolidatedPackingPage />} />
          <Route path="/packing/print-labels/:invoiceNo" element={<BoxLabelPrintPage />} />

          {/* Billing routes for SUPERADMIN */}
          <Route path="/billing/invoices" element={<BillingInvoiceListPage />} />
          <Route path="/billing/invoices/view/:id" element={<BillingInvoiceViewPage />} />
          <Route path="/billing/reviewed" element={<BillingReviewedListPage />} />

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
          <Route path="/ops/packing/box-assignment/:invoiceNo" element={<BoxAssignmentPage />} />
          <Route path="/ops/packing/consolidated-packing" element={<ConsolidatedPackingPage />} />
          <Route path="/ops/packing/print-labels/:invoiceNo" element={<BoxLabelPrintPage />} />

          {/* Billing */}
          <Route path="/ops/billing/invoices" element={<BillingInvoiceListPage />} />
          <Route path="/ops/billing/invoices/view/:id" element={<BillingInvoiceViewPage />} />
          <Route path="/ops/billing/reviewed" element={<BillingReviewedListPage />} />

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
  );
}