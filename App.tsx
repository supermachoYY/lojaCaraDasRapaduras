import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./src/navigation/StackNavigator";
import { CartProvider } from "./src/services/CartContext";
import { auth } from "./src/database/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { ActivityIndicator, View, Text, Alert } from "react-native";
import { useURL } from "expo-linking";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const url = useURL(); // Hook moderno para deep links

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Reage sempre que a URL do deep link mudar
  useEffect(() => {
    if (url) {
      console.log("Deep link recebido:", url);
      // Parse manual da URL
      const urlParts = url.split("?");
      const queryParams = new URLSearchParams(urlParts[1]);
      const status = queryParams.get("status");

      if (status === "approved") {
        Alert.alert("Pagamento aprovado!", "Seu pedido foi confirmado e será preparado.");
      } else if (status === "rejected") {
        Alert.alert("Pagamento recusado", "Tente novamente ou escolha outra forma de pagamento.");
      }
    }
  }, [url]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={{ marginTop: 10 }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <CartProvider>
      <NavigationContainer>
        <StackNavigator />
      </NavigationContainer>
    </CartProvider>
  );
}