import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function listManualReleasedStudentIds(
  parentCollection: "modules" | "lessons",
  parentId: string
): Promise<string[]> {
  const snap = await getDocs(
    collection(db, parentCollection, parentId, "manualReleaseStudents")
  );
  return snap.docs.map((d) => d.id);
}

export async function setManualReleaseForStudent(
  parentCollection: "modules" | "lessons",
  parentId: string,
  studentId: string,
  released: boolean
): Promise<void> {
  const r = doc(db, parentCollection, parentId, "manualReleaseStudents", studentId);
  if (released) {
    await setDoc(r, { releasedAt: Date.now() }, { merge: true });
  } else {
    await deleteDoc(r);
  }
}

export async function isStudentManuallyReleased(
  parentCollection: "modules" | "lessons",
  parentId: string,
  studentId: string
): Promise<boolean> {
  const snap = await getDoc(
    doc(db, parentCollection, parentId, "manualReleaseStudents", studentId)
  );
  return snap.exists();
}
