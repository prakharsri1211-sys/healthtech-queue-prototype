import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { usePageTracking } from "./utils/usePageTracking";
import RoleRoute from "./components/RoleRoute";
import LoginPage from "./pages/LoginPage";
import PatientSelector from "./pages/PatientSelector";
import Booking from "./pages/Booking";
import Tracker from "./pages/Tracker";
import CheckIn from "./pages/CheckIn";
import MedicalProfile from "./pages/MedicalProfile";
import MediatorDashboard from "./pages/MediatorDashboard";
import MediatorInfoPage from "./pages/MediatorInfoPage";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorBalance from "./pages/DoctorBalance";
import DoctorProfile from "./pages/DoctorProfile";
import MediatorWaitingPage from "./pages/MediatorWaitingPage";
import MediatorUnassignedPage from "./pages/MediatorUnassignedPage";

import ScheduleManagement from "./pages/ScheduleManagement";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import SignUpPage from "./pages/SignUpPage";
import AccountManagement from "./pages/AccountManagement";
import AdminDbSchema from "./pages/AdminDbSchema";
import AdminLogs from "./pages/AdminLogs";
import DoctorSetupPage from "./pages/DoctorSetupPage";
import DoctorPreferencesPage from "./pages/DoctorPreferencesPage";
import ClinicConfirmationPage from "./pages/ClinicConfirmationPage";
import SpecialtySelectionPage from "./pages/SpecialtySelectionPage";
import SetupClinic from "./pages/SetupClinic";
import GlobalErrorElement from "./pages/GlobalErrorElement";
import DoctorOnboarding from "./pages/DoctorOnboarding";
import AccountSetupPage from "./pages/AccountSetupPage";
import ClinicInfrastructure from "./pages/ClinicInfrastructure";
import ManageStaff from "./pages/ManageStaff";
import UnauthorizedPage from "./pages/UnauthorizedPage";

function TelemetryWrapper() {
  usePageTracking();
  return <Outlet />;
}

export const router = createBrowserRouter([{
  element: <TelemetryWrapper />,
  errorElement: <GlobalErrorElement />,
  children: [
  // ── Public Routes ──────────────────────────────────────────────────
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/unauthorized",
    element: <RoleRoute allowedRole="PATIENT"><UnauthorizedPage /></RoleRoute>,
  },
  {
    path: "/role-selection",
    Component: RoleSelectionPage,
  },
  {
    path: "/signup",
    Component: SignUpPage,
  },
  {
    path: "/admin",
    element: <Navigate to="/admin/db-schema" />,
  },
  {
    path: "/admin/db-schema",
    Component: AdminDbSchema,
  },
  {
    path: "/admin/logs",
    Component: AdminLogs,
  },
  {
    path: "/mediator/login",
    Component: LoginPage,
  },

  // ── Patient Routes (ROLE_PATIENT) ──────────────────────────────────
  {
    path: "/patient",
    element: <RoleRoute allowedRole="PATIENT"><PatientSelector /></RoleRoute>,
  },
  {
    path: "/patient-selector",
    element: <RoleRoute allowedRole="PATIENT"><PatientSelector /></RoleRoute>,
  },
  {
    path: "/patient-dashboard",
    element: <RoleRoute allowedRole="PATIENT"><PatientSelector /></RoleRoute>,
  },
  {
    path: "/patient-portal",
    element: <RoleRoute allowedRole="PATIENT"><PatientSelector /></RoleRoute>,
  },
  {
    path: "/booking",
    element: <RoleRoute allowedRole="PATIENT"><Booking /></RoleRoute>,
  },
  {
    path: "/tracker",
    element: <RoleRoute allowedRole="PATIENT"><Tracker /></RoleRoute>,
  },
  {
    path: "/check-in",
    element: <RoleRoute allowedRole="PATIENT"><CheckIn /></RoleRoute>,
  },
  {
    path: "/medical-profile",
    element: <RoleRoute allowedRole="PATIENT"><MedicalProfile /></RoleRoute>,
  },
  {
    path: "/specialty-selection",
    element: <RoleRoute allowedRole="PATIENT"><SpecialtySelectionPage /></RoleRoute>,
  },
  {
    path: "/appointment/confirmation",
    element: <Navigate to="/tracker" />,
  },
  {
    path: "/account-management",
    element: <RoleRoute allowedRole="PATIENT"><AccountManagement /></RoleRoute>,
  },

  // ── Mediator Routes (ROLE_MEDIATOR) ────────────────────────────────
  {
    path: "/mediator",
    element: <RoleRoute allowedRole="MEDIATOR"><MediatorDashboard /></RoleRoute>,
  },
  {
    path: "/mediator-dashboard",
    element: <RoleRoute allowedRole="MEDIATOR"><MediatorDashboard /></RoleRoute>,
  },
  {
    path: "/mediator/dashboard",
    element: <RoleRoute allowedRole="MEDIATOR"><MediatorDashboard /></RoleRoute>,
  },
  {
    path: "/mediator/unassigned",
    element: <RoleRoute allowedRole="MEDIATOR"><MediatorUnassignedPage /></RoleRoute>,
  },
  {
    path: "/mediator/waiting",
    element: <RoleRoute allowedRole="MEDIATOR"><MediatorWaitingPage /></RoleRoute>,
  },

  // ── Doctor Routes (ROLE_DOCTOR) ────────────────────────────────────
  {
    path: "/doctor",
    element: <RoleRoute allowedRole="DOCTOR"><DoctorDashboard /></RoleRoute>,
  },
  {
    path: "/doctor-dashboard",
    element: <RoleRoute allowedRole="DOCTOR"><DoctorDashboard /></RoleRoute>,
  },
  {
    path: "/doctor/dashboard",
    element: <RoleRoute allowedRole="DOCTOR"><DoctorDashboard /></RoleRoute>,
  },
  {
    path: "/doctor/dashboard/:id",
    element: <RoleRoute allowedRole="DOCTOR"><DoctorDashboard /></RoleRoute>,
  },
  {
    path: "/doctor/manage-staff",
    element: <RoleRoute allowedRole="DOCTOR"><ManageStaff /></RoleRoute>,
  },
  {
    path: "/doctor-onboarding",
    element: <RoleRoute allowedRole="DOCTOR"><DoctorOnboarding /></RoleRoute>,
  },
  {
    path: "/doctor-balance",
    element: <RoleRoute allowedRole="DOCTOR"><DoctorBalance /></RoleRoute>,
  },
  {
    path: "/doctor-profile/:id?",
    element: <RoleRoute allowedRole={["DOCTOR", "PATIENT"]}><DoctorProfile /></RoleRoute>,
  },
  {
    path: "/schedule-management",
    element: <RoleRoute allowedRole="DOCTOR"><ScheduleManagement /></RoleRoute>,
  },
  {
    path: "/doctor-setup",
    element: <RoleRoute allowedRole="DOCTOR"><DoctorSetupPage /></RoleRoute>,
  },
  {
    path: "/doctor-preferences",
    element: <RoleRoute allowedRole="DOCTOR"><DoctorPreferencesPage /></RoleRoute>,
  },
  {
    path: "/clinic-confirmation",
    element: <RoleRoute allowedRole="DOCTOR"><ClinicConfirmationPage /></RoleRoute>,
  },
  {
    path: "/setup-clinic",
    element: <RoleRoute allowedRole="DOCTOR"><SetupClinic /></RoleRoute>,
  },
  {
    path: "/account-setup",
    element: <RoleRoute allowedRole="DOCTOR"><AccountSetupPage /></RoleRoute>,
  },
  {
    path: "/clinic-infrastructure",
    element: <RoleRoute allowedRole="DOCTOR"><ClinicInfrastructure /></RoleRoute>,
  },
]}], { basename: "/" });