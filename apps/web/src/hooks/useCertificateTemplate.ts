import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  CertificateTemplate,
  CertificateTemplateLayout,
} from "@learning-scores/shared";

export interface CertificateTemplateWithId extends CertificateTemplate {
  id: string;
}

export function useCertificateTemplate(classId: string | undefined) {
  const [template, setTemplate] = useState<CertificateTemplateWithId | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "certificateTemplates"),
      where("classId", "==", classId)
    );
    getDocs(q)
      .then((snap) => {
        if (snap.empty) {
          setTemplate(null);
          return;
        }
        const d = snap.docs[0];
        setTemplate({ id: d.id, ...d.data() } as CertificateTemplateWithId);
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const sanitizeForFirestore = <T extends Record<string, unknown>>(
    obj: T
  ): { [K in keyof T]: T[K] extends undefined ? null : T[K] } => {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = v === undefined ? null : v;
    }
    return result as { [K in keyof T]: T[K] extends undefined ? null : T[K] };
  };

  const createOrUpdateTemplate = async (data: {
    ownerId: string;
    name: string;
    layout: CertificateTemplateLayout;
  }) => {
    if (!classId) throw new Error("No class selected");
    const now = Date.now();
    const placeholders = ["studentName", "className", "issuedAt"];
    const layout = sanitizeForFirestore(data.layout);

    if (template) {
      await updateDoc(doc(db, "certificateTemplates", template.id), {
        name: data.name,
        layout,
        updatedAt: now,
      });
      setTemplate((prev) =>
        prev ? { ...prev, ...data, updatedAt: now } : null
      );
      return template.id;
    } else {
      const ref = await addDoc(collection(db, "certificateTemplates"), {
        classId,
        ownerId: data.ownerId,
        name: data.name,
        layout,
        placeholders,
        createdAt: now,
        updatedAt: now,
      });
      setTemplate({
        id: ref.id,
        classId,
        ownerId: data.ownerId,
        name: data.name,
        layout,
        placeholders,
        createdAt: now,
        updatedAt: now,
      });
      return ref.id;
    }
  };

  const linkToClass = async (templateId: string) => {
    if (!classId) return;
    await updateDoc(doc(db, "classes", classId), {
      certificateTemplateId: templateId,
    });
  };

  return {
    template,
    loading,
    createOrUpdateTemplate,
    linkToClass,
  };
}
