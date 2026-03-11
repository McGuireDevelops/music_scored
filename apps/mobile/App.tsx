import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { auth, db } from "./src/firebase";

type UserRole = "student" | "teacher" | "admin";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}

interface Class {
  id: string;
  name: string;
  description?: string;
}

export default function App() {
  const [user, setUser] = useState<typeof auth.currentUser>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.data();
        setProfile({
          uid: u.uid,
          email: u.email ?? null,
          displayName: u.displayName ?? data?.displayName ?? null,
          role: (data?.role as UserRole) ?? "student",
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user?.uid || !profile) return;
    const fetchClasses = async () => {
      setClassesLoading(true);
      try {
        if (profile.role === "teacher" || profile.role === "admin") {
          const snap = await getDocs(
            collection(db, "classes")
          );
          const list = snap.docs
            .filter((d) => d.data().teacherId === user.uid)
            .map((d) => ({
              id: d.id,
              name: d.data().name ?? "Class",
              description: d.data().description,
            }));
          setClasses(list);
        } else {
          const grantsSnap = await getDocs(
            collection(db, "users", user.uid, "accessGrants")
          );
          const ids = grantsSnap.docs.map((d) => d.id);
          const list: Class[] = [];
          for (const id of ids) {
            const classSnap = await getDoc(doc(db, "classes", id));
            if (classSnap.exists())
              list.push({
                id: classSnap.id,
                name: classSnap.data().name ?? "Class",
                description: classSnap.data().description,
              });
          }
          setClasses(list);
        }
      } finally {
        setClassesLoading(false);
      }
    };
    fetchClasses();
  }, [user?.uid, profile?.role]);

  const signIn = async () => {
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign in failed");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <StatusBar style="auto" />
      </View>
    );

  if (!user)
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Learning Scores</Text>
        <Text style={styles.subtitle}>Film Music Learning Platform</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        {authError ? <Text style={styles.error}>{authError}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={signIn}>
          <Text style={styles.buttonText}>Sign in</Text>
        </TouchableOpacity>
        <StatusBar style="auto" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {profile?.role === "teacher" ? "Teacher" : "Student"} Dashboard
      </Text>
      <Text style={styles.subtitle}>
        {profile?.displayName ?? profile?.email ?? "User"}
      </Text>
      <TouchableOpacity style={styles.smallButton} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Your classes</Text>
      {classesLoading ? (
        <ActivityIndicator />
      ) : classes.length === 0 ? (
        <Text style={styles.empty}>No classes yet.</Text>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.classCard}>
              <Text style={styles.className}>{item.name}</Text>
              {item.description && (
                <Text style={styles.classDesc}>{item.description}</Text>
              )}
            </View>
          )}
          style={styles.list}
        />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  smallButton: {
    backgroundColor: "#666",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  list: {
    width: "100%",
  },
  classCard: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  className: {
    fontSize: 16,
    fontWeight: "600",
  },
  classDesc: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  empty: {
    color: "#666",
    fontSize: 14,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  error: {
    color: "#c00",
    marginBottom: 12,
    fontSize: 14,
  },
});
