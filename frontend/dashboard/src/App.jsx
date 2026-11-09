import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute, { PublicOnlyRoute } from "./auth/routes.jsx";
import Layout from "./components/Layout.jsx";
import ConversationDetailPage from "./pages/ConversationDetailPage.jsx";
import ConversationsPage from "./pages/ConversationsPage.jsx";
import DocumentsPage from "./pages/DocumentsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import TicketDetailPage from "./pages/TicketDetailPage.jsx";
import TicketsPage from "./pages/TicketsPage.jsx";

export default function App() {
  return (
    <Routes>
      {/* Only for signed-out visitors */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Only for signed-in owners */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/conversations/:id" element={<ConversationDetailPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}