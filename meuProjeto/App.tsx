import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./src/navigation/StackNavigator";
import { CartProvider } from "./src/services/CartContext";
import { auth } from "./src/database/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { ActivityIndicator, View, Text } from "react-native";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("📱 App: Configurando listener de autenticação...");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("📱 App: Estado de autenticação mudou:", firebaseUser ? firebaseUser.email : "null");
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={{ marginTop: 10 }}>Carregando...</Text>
      </View>
    );
  }

  console.log("📱 App: Renderizando. Usuário:", user ? user.email : "null");

  return (
    <CartProvider>
      <NavigationContainer>
        <StackNavigator />
      </NavigationContainer>
    </CartProvider>
  );
}