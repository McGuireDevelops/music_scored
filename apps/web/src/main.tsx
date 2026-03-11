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
import QuizPlayer from "./pages/QuizPlayer";
import CommunityPage from "./pages/CommunityPage";
import PortfolioPage from "./pages/PortfolioPage";
import TeacherProfilePage from "./pages/TeacherProfilePage";
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
              <Route path="teacher" element={<TeacherDashboard />} />
              <Route path="teacher/class/:id" element={<ClassDetail />} />
              <Route path="teacher/class/:classId/rubrics" element={<RubricBuilder />} />
              <Route path="teacher/class/:classId/quizzes" element={<QuizBuilder />} />
              <Route path="teacher/class/:classId/community" element={<CommunityPage />} />
              <Route path="teacher/class/:classId/assignment/:assignmentId" element={<AssignmentDetail />} />
              <Route path="admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
