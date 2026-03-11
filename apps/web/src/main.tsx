import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ClassDetail from "./pages/ClassDetail";
import AssignmentDetail from "./pages/AssignmentDetail";
import RubricBuilder from "./pages/RubricBuilder";
import QuizBuilder from "./pages/QuizBuilder";
import QuizEditPage from "./pages/QuizEditPage";
import QuizAttemptsPage from "./pages/QuizAttemptsPage";
import QuizPlayer from "./pages/QuizPlayer";
import CommunityPage from "./pages/CommunityPage";
import PortfolioPage from "./pages/PortfolioPage";
import PurchaseClassPage from "./pages/PurchaseClassPage";
import CertificationsPage from "./pages/CertificationsPage";
import TeacherProfilePage from "./pages/TeacherProfilePage";
import TeacherProfileEdit from "./pages/TeacherProfileEdit";
import CertificateDesigner from "./pages/CertificateDesigner";
import StudentTodoPage from "./pages/StudentTodoPage";
import StudentProfile from "./pages/StudentProfile";
import TeacherStudentsPage from "./pages/TeacherStudentsPage";
import TeacherCommunityHub from "./pages/TeacherCommunityHub";
import TeacherLessonsPage from "./pages/TeacherLessonsPage";
import TeacherAssignmentsPage from "./pages/TeacherAssignmentsPage";
import TeacherQuizzesPage from "./pages/TeacherQuizzesPage";
import TeacherSettingsPage from "./pages/TeacherSettingsPage";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="profile/:profileId" element={<TeacherProfilePage />} />
              <Route path="signin" element={<SignIn />} />
              <Route path="student" element={<StudentDashboard />} />
              <Route path="student/class/:id" element={<ClassDetail />} />
              <Route path="student/class/:classId/assignment/:assignmentId" element={<AssignmentDetail />} />
              <Route path="student/class/:classId/quiz/:quizId" element={<QuizPlayer />} />
              <Route path="student/class/:classId/community" element={<CommunityPage />} />
              <Route path="student/portfolio" element={<PortfolioPage />} />
              <Route path="student/certifications" element={<CertificationsPage />} />
              <Route path="purchase/:classId" element={<PurchaseClassPage />} />
              <Route path="teacher" element={<TeacherDashboard />} />
              <Route path="teacher/students" element={<TeacherStudentsPage />} />
              <Route path="teacher/community" element={<TeacherCommunityHub />} />
              <Route path="teacher/lessons" element={<TeacherLessonsPage />} />
              <Route path="teacher/assignments" element={<TeacherAssignmentsPage />} />
              <Route path="teacher/quizzes" element={<TeacherQuizzesPage />} />
              <Route path="teacher/profile" element={<TeacherProfileEdit />} />
              <Route path="teacher/settings" element={<TeacherSettingsPage />} />
              <Route path="teacher/class/:id" element={<ClassDetail />} />
              <Route path="teacher/class/:classId/rubrics" element={<RubricBuilder />} />
              <Route path="teacher/class/:classId/certificate" element={<CertificateDesigner />} />
              <Route path="teacher/class/:classId/quizzes" element={<QuizBuilder />} />
              <Route path="teacher/class/:classId/quiz/:quizId/edit" element={<QuizEditPage />} />
              <Route path="teacher/class/:classId/quiz/:quizId/attempts" element={<QuizAttemptsPage />} />
              <Route path="teacher/class/:classId/community" element={<CommunityPage />} />
              <Route path="teacher/class/:classId/assignment/:assignmentId" element={<AssignmentDetail />} />
              <Route path="teacher/class/:classId/student/:studentId" element={<StudentProfile />} />
              <Route path="admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
