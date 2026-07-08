import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Results from "./pages/Results";
import Books from "./pages/Books";
import Calendar from "./pages/Calendar";
import Notifications from "./pages/Notifications";
import RoleSelection from "./pages/RoleSelection";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/role-selection" component={RoleSelection} />
      <Route path="/dashboard/student" component={StudentDashboard} />
      <Route path="/dashboard/teacher" component={TeacherDashboard} />
      <Route path="/dashboard/admin" component={AdminDashboard} />
      <Route path="/results" component={Results} />
      <Route path="/books" component={Books} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/notifications" component={Notifications} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" dir="rtl" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
