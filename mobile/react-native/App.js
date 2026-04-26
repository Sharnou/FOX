// NOTE: For production, replace token state with AsyncStorage for persistence across restarts.
// Install: expo install expo-secure-store  (then use SecureStore.setItemAsync / getItemAsync)
import React, { useMemo, useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";

const Stack = createNativeStackNavigator();

// ── API hook: all fetch calls wrapped in try/catch ─────────────────────────
function useApi(baseDefault) {
  const [base, setBase] = useState(baseDefault);
  const headers = { "Content-Type": "application/json" };
  const authHeaders = (token) => Object.assign({}, headers, token ? { Authorization: "Bearer " + token } : {});
  return {
    base,
    setBase,
    register: async (payload) => {
      try {
        const r = await fetch(base + "/api/auth/register", { method: "POST", headers, body: JSON.stringify(payload) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    login: async (payload) => {
      try {
        const r = await fetch(base + "/api/auth/login", { method: "POST", headers, body: JSON.stringify(payload) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    me: async (t) => {
      try {
        const r = await fetch(base + "/api/auth/me", { headers: authHeaders(t) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    updateProfile: async (t, doc) => {
      try {
        const r = await fetch(base + "/api/profile", { method: "PATCH", headers: authHeaders(t), body: JSON.stringify(doc) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    classify: async (title) => {
      try {
        const r = await fetch(base + "/api/classify", { method: "POST", headers, body: JSON.stringify({ title }) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    createListing: async (t, doc) => {
      try {
        const r = await fetch(base + "/api/listings", { method: "POST", headers: authHeaders(t), body: JSON.stringify(doc) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    myListings: async (t) => {
      try {
        const r = await fetch(base + "/api/listings/mine", { headers: authHeaders(t) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    search: async (q) => {
      try {
        const r = await fetch(base + "/api/search", { method: "POST", headers, body: JSON.stringify(q) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    savedAdd: async (t, name, query) => {
      try {
        const r = await fetch(base + "/api/saved-searches", { method: "POST", headers: authHeaders(t), body: JSON.stringify({ name, query }) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    savedList: async (t) => {
      try {
        const r = await fetch(base + "/api/saved-searches", { headers: authHeaders(t) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    favAdd: async (t, id) => {
      try {
        const r = await fetch(base + "/api/favorites", { method: "POST", headers: authHeaders(t), body: JSON.stringify({ listingId: id }) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    favList: async (t) => {
      try {
        const r = await fetch(base + "/api/favorites", { headers: authHeaders(t) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    chatSend: async (from, to, text) => {
      try {
        const r = await fetch(base + "/api/chat/send", { method: "POST", headers, body: JSON.stringify({ from, to, text }) });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
    chatThread: async (a, b) => {
      try {
        const r = await fetch(base + "/api/chat/thread?userA=" + encodeURIComponent(a) + "&userB=" + encodeURIComponent(b), { headers });
        return await r.json();
      } catch (e) { return { error: e.message }; }
    },
  };
}

function ScreenContainer({ children }) {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, padding: 16 }}>{children}</View>
    </ScrollView>
  );
}

function Button({ title, onPress, color }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: color || "#0e7afe", padding: 12, borderRadius: 6, marginVertical: 6 }}>
      <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>{title}</Text>
    </TouchableOpacity>
  );
}

function Input(props) {
  return <TextInput {...props} style={[{ borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 6, marginVertical: 6 }, props.style]} />;
}

// ── Gender Picker Component ────────────────────────────────────────────────
function GenderPicker({ value, onChange, required }) {
  return (
    <View style={{ marginVertical: 6 }}>
      <Text style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
        الجنس — Gender{required ? <Text style={{ color: "red" }}> *</Text> : null}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          onPress={() => onChange("male")}
          style={{
            flex: 1, padding: 10, borderRadius: 8, alignItems: "center",
            backgroundColor: value === "male" ? "#0e7afe" : "#f0f0f0",
            borderWidth: 2, borderColor: value === "male" ? "#0e7afe" : "#ddd",
          }}
        >
          <Text style={{ color: value === "male" ? "white" : "#333", fontWeight: "600" }}>👨 ذكر (Male)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onChange("female")}
          style={{
            flex: 1, padding: 10, borderRadius: 8, alignItems: "center",
            backgroundColor: value === "female" ? "#e91e8c" : "#f0f0f0",
            borderWidth: 2, borderColor: value === "female" ? "#e91e8c" : "#ddd",
          }}
        >
          <Text style={{ color: value === "female" ? "white" : "#333", fontWeight: "600" }}>👩 أنثى (Female)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Home Screen ────────────────────────────────────────────────────────────
function Home({ navigation }) {
  const [base, setBase] = useState("https://xtox-production.up.railway.app");
  const [token, setToken] = useState("");
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>fox · XTOX</Text>
      <Input value={base} onChangeText={setBase} placeholder="Backend URL" />
      <Input value={token} onChangeText={setToken} placeholder="Auth Token (paste after login)" />
      <Button title="🔑 Auth (Register / Login)" onPress={() => navigation.navigate("Auth", { base })} />
      <Button title="👤 My Profile" onPress={() => navigation.navigate("Profile", { base, token })} />
      <Button title="📢 Post Listing" onPress={() => navigation.navigate("Post", { base })} />
      <Button title="🔍 Search" onPress={() => navigation.navigate("Search", { base })} />
      <Button title="⭐ Favorites & Saved" onPress={() => navigation.navigate("Saved", { base })} />
      <Button title="💬 Chat" onPress={() => navigation.navigate("Chat", { base })} />
      <StatusBar style="auto" />
    </ScreenContainer>
  );
}

// ── Auth Screen ────────────────────────────────────────────────────────────
function Auth({ route }) {
  const api = useApi(route.params.base);
  const [method, setMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("facebook");
  const [providerId, setProviderId] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [token, setToken] = useState("");
  const [me, setMe] = useState(null);
  const [genderError, setGenderError] = useState("");

  function payload() {
    const base = { method, name, gender };
    if (method === "email") return { ...base, email };
    if (method === "phone") return { ...base, phone };
    return { ...base, provider, providerId };
  }

  async function handleRegister() {
    if (!gender) { setGenderError("⚠️ الجنس مطلوب — Gender is required"); return; }
    setGenderError("");
    const r = await api.register(payload());
    setToken(r.token || "");
    if (r.error) Alert.alert("Error", r.error);
  }

  async function handleLogin() {
    const r = await api.login(payload());
    setToken(r.token || "");
    if (r.error) Alert.alert("Error", r.error);
  }

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Auth</Text>
      <Input placeholder="method: email|phone|social" value={method} onChangeText={setMethod} />
      {method === "email" ? <Input placeholder="email" value={email} onChangeText={setEmail} keyboardType="email-address" /> : null}
      {method === "phone" ? <Input placeholder="phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /> : null}
      {method === "social" ? <Input placeholder="provider (facebook/google/apple)" value={provider} onChangeText={setProvider} /> : null}
      {method === "social" ? <Input placeholder="providerId" value={providerId} onChangeText={setProviderId} /> : null}
      <Input placeholder="name" value={name} onChangeText={setName} />
      <GenderPicker value={gender} onChange={setGender} required />
      {genderError ? <Text style={{ color: "red", fontSize: 13, marginVertical: 4 }}>{genderError}</Text> : null}
      <Button title="📝 Register" onPress={handleRegister} />
      <Button title="🔑 Login" onPress={handleLogin} color="#333" />
      <Input placeholder="token (paste here after login)" value={token} onChangeText={setToken} />
      <Button title="👤 Me" onPress={async () => { const r = await api.me(token); setMe(r); }} color="#555" />
      {me && <Text selectable style={{ marginTop: 8, fontSize: 12, color: "#333" }}>{JSON.stringify(me, null, 2)}</Text>}
    </ScreenContainer>
  );
}

// ── Profile Screen ─────────────────────────────────────────────────────────
function Profile({ route }) {
  const api = useApi(route.params.base);
  const [token, setToken] = useState(route.params.token || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState("");
  const [msg, setMsg] = useState("");

  async function loadMe() {
    if (!token) return;
    setLoading(true);
    const r = await api.me(token);
    setLoading(false);
    if (r && !r.error) {
      setUser(r);
      setGender(r.gender || "");
    }
  }

  useEffect(() => { loadMe(); }, [token]);

  async function saveGender(g) {
    if (!token) { setMsg("يرجى إدخال التوكن أولاً"); return; }
    setSaving(true);
    const r = await api.updateProfile(token, { gender: g });
    setSaving(false);
    if (r && !r.error) {
      setGender(g);
      setUser(u => u ? { ...u, gender: g } : u);
      setMsg("✅ تم حفظ الجنس بنجاح!");
    } else {
      setMsg("❌ " + (r?.error || "حدث خطأ"));
    }
    setTimeout(() => setMsg(""), 3000);
  }

  const genderMissing = user && !user.gender;

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>👤 ملفي الشخصي — My Profile</Text>
      <Input
        placeholder="أدخل التوكن — Paste your token"
        value={token}
        onChangeText={setToken}
        onSubmitEditing={loadMe}
        returnKeyType="done"
      />
      <Button title="تحميل — Load" onPress={loadMe} color="#555" />

      {loading && <ActivityIndicator size="large" color="#0e7afe" style={{ marginVertical: 16 }} />}

      {/* Gender missing banner */}
      {genderMissing && (
        <View style={{ backgroundColor: "#fef9c3", borderRadius: 10, padding: 14, marginVertical: 10, borderWidth: 1.5, borderColor: "#facc15" }}>
          <Text style={{ color: "#92400e", fontWeight: "bold", fontSize: 14, textAlign: "center" }}>
            ⚠️ يرجى تحديد الجنس لإكمال ملفك الشخصي
          </Text>
          <Text style={{ color: "#92400e", fontSize: 12, textAlign: "center", marginTop: 4 }}>
            Please select your gender to complete your profile
          </Text>
        </View>
      )}

      {user && (
        <View style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: 16, marginVertical: 8 }}>
          <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 4 }}>{user.name || "—"}</Text>
          <Text style={{ color: "#666", fontSize: 13 }}>📧 {user.email || user.xtoxEmail || "—"}</Text>
          {user.phone && <Text style={{ color: "#666", fontSize: 13 }}>📱 {user.phone}</Text>}
          {user.xtoxId && <Text style={{ color: "#888", fontSize: 12 }}>ID: {user.xtoxId}</Text>}
          <Text style={{ color: "#888", fontSize: 12 }}>
            الجنس: {user.gender === "male" ? "👨 ذكر" : user.gender === "female" ? "👩 أنثى" : "⚠️ غير محدد"}
          </Text>
        </View>
      )}

      {user && (
        <>
          <GenderPicker value={gender} onChange={setGender} required />
          <Button
            title={saving ? "جارٍ الحفظ..." : "💾 حفظ الجنس — Save Gender"}
            onPress={() => saveGender(gender)}
            color={genderMissing ? "#f59e0b" : "#0e7afe"}
          />
        </>
      )}

      {msg ? <Text style={{ textAlign: "center", marginTop: 8, color: msg.startsWith("✅") ? "#16a34a" : "#dc2626", fontWeight: "600" }}>{msg}</Text> : null}
    </ScreenContainer>
  );
}

// ── Post Screen ────────────────────────────────────────────────────────────
function Post({ route }) {
  const api = useApi(route.params.base);
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [attrs, setAttrs] = useState("{}");
  const [price, setPrice] = useState("");
  const [last, setLast] = useState(null);
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Post Listing</Text>
      <Input placeholder="token" value={token} onChangeText={setToken} />
      <Input placeholder="title" value={title} onChangeText={setTitle} />
      <Button title="Classify" onPress={async () => { const r = await api.classify(title); setCategory(JSON.stringify(r.category || {})); setAttrs(JSON.stringify(r.attributes || {}, null, 0)); }} />
      <Input placeholder='category {"l1":"Electronics","l2":"Mobile Phones"}' value={category} onChangeText={setCategory} />
      <Input placeholder='attributes {"Brand":"Apple"}' value={attrs} onChangeText={setAttrs} />
      <Input placeholder="price" value={price} onChangeText={setPrice} keyboardType="numeric" />
      <Button title="Create" onPress={async () => {
        let cat = null; let a = null;
        try { cat = JSON.parse(category); } catch {}
        try { a = JSON.parse(attrs); } catch {}
        const r = await api.createListing(token, { title, category: cat, attributes: a, price: Number(price) });
        setLast(r);
      }} />
      <Button title="My Listings" onPress={async () => { const r = await api.myListings(token); setLast(r); }} color="#555" />
      {last && <Text selectable style={{ fontSize: 12, marginTop: 8, color: "#333" }}>{JSON.stringify(last, null, 2)}</Text>}
    </ScreenContainer>
  );
}

// ── Search Screen ──────────────────────────────────────────────────────────
function Search({ route }) {
  const api = useApi(route.params.base);
  const [text, setText] = useState("");
  const [l1, setL1] = useState("");
  const [l2, setL2] = useState("");
  const [out, setOut] = useState(null);
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Search</Text>
      <Input placeholder="text" value={text} onChangeText={setText} />
      <Input placeholder="l1 (category)" value={l1} onChangeText={setL1} />
      <Input placeholder="l2 (subcategory)" value={l2} onChangeText={setL2} />
      <Button title="🔍 Search" onPress={async () => { const r = await api.search({ text, l1: l1 || undefined, l2: l2 || undefined, page: 1, pageSize: 20 }); setOut(r); }} />
      <FlatList
        data={(out && (out.items || out.ads)) || []}
        keyExtractor={(item, i) => (item.id || item._id || String(i))}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
            <Text style={{ fontWeight: "600" }}>{item.title}</Text>
            <Text style={{ color: "#888" }}>{item.price !== undefined ? String(item.price) : ""}</Text>
          </View>
        )}
        scrollEnabled={false}
      />
    </ScreenContainer>
  );
}

// ── Saved & Favorites Screen ───────────────────────────────────────────────
function Saved({ route }) {
  const api = useApi(route.params.base);
  const [token, setToken] = useState("");
  const [name, setName] = useState("Search");
  const [query, setQuery] = useState('{"text":"iphone","l1":"Electronics"}');
  const [last, setLast] = useState(null);
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Saved & Favorites</Text>
      <Input placeholder="token" value={token} onChangeText={setToken} />
      <Input placeholder="name" value={name} onChangeText={setName} />
      <Input placeholder='query {"text":"iphone"}' value={query} onChangeText={setQuery} />
      <Button title="Save Search" onPress={async () => { let q = null; try { q = JSON.parse(query); } catch {} const r = await api.savedAdd(token, name, q); setLast(r); }} />
      <Button title="List Saved" onPress={async () => { const r = await api.savedList(token); setLast(r); }} color="#555" />
      <Button title="Favorites" onPress={async () => { const r = await api.favList(token); setLast(r); }} color="#555" />
      {last && <Text selectable style={{ fontSize: 12, marginTop: 8, color: "#333" }}>{JSON.stringify(last, null, 2)}</Text>}
    </ScreenContainer>
  );
}

// ── Chat Screen ────────────────────────────────────────────────────────────
function Chat({ route }) {
  const api = useApi(route.params.base);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [out, setOut] = useState(null);
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Chat</Text>
      <Input placeholder="from (userId)" value={from} onChangeText={setFrom} />
      <Input placeholder="to (userId)" value={to} onChangeText={setTo} />
      <Input placeholder="text" value={text} onChangeText={setText} />
      <Button title="📤 Send" onPress={async () => { const r = await api.chatSend(from, to, text); setOut(r); }} />
      <Button title="📖 Thread" onPress={async () => { const r = await api.chatThread(from, to); setOut(r); }} color="#555" />
      {out && <Text selectable style={{ fontSize: 12, marginTop: 8, color: "#333" }}>{JSON.stringify(out, null, 2)}</Text>}
    </ScreenContainer>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={Home} options={{ title: "XTOX Mobile" }} />
        <Stack.Screen name="Auth" component={Auth} options={{ title: "Register / Login" }} />
        <Stack.Screen name="Profile" component={Profile} options={{ title: "My Profile" }} />
        <Stack.Screen name="Post" component={Post} options={{ title: "Post Listing" }} />
        <Stack.Screen name="Search" component={Search} options={{ title: "Search" }} />
        <Stack.Screen name="Saved" component={Saved} options={{ title: "Saved & Favorites" }} />
        <Stack.Screen name="Chat" component={Chat} options={{ title: "Chat" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
