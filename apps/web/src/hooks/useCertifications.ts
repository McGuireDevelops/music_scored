import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export interface CertificationWithId {
  id: string;
  userId: string;
  issuedBy: string;
  classId: string;
  criteriaMet: string[];
  issuedAt: number;
  revokedAt?: number;
}

export function useStudentCertifications(userId: string | undefined) {
  const [certifications, setCertifications] = useState<CertificationWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "certifications"),
      where("userId", "==", userId),
      where("revokedAt", "==", null)
    );
    getDocs(q)
      .then((snap) => {
        setCertifications(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          } as CertificationWithId))
        );
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { certifications, loading };
}

export function useIssueCertification(teacherId: string | undefined) {
  const issueCertification = async (data: {
    userId: string;
    classId: string;
    criteriaMet?: string[];
  }) => {
    if (!teacherId) throw new Error("Not authenticated");
    const ref = await addDoc(collection(db, "certifications"), {
      userId: data.userId,
      issuedBy: teacherId,
      classId: data.classId,
      criteriaMet: data.criteriaMet ?? [],
      issuedAt: Date.now(),
    });
    return ref.id;
  };

  return { issueCertification };
}
