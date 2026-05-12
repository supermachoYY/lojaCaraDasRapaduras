import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, auth } from "../database/database";

export default function PedidosRecebidos({ navigation }: any) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function buscarPedidos() {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, "pedidos"),
        where("vendedorId", "==", auth.currentUser.uid),
        where("status", "in", ["pendente", "pago"]),
        orderBy("criadoEm", "desc")
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidos(lista);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível carregar os pedidos");
    }
  }

  useEffect(() => {
    buscarPedidos();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await buscarPedidos();
    setRefreshing(false);
  };

  function formatarData(data: any) {
    if (!data) return "Data não informada";
    if (data.toDate) return data.toDate().toLocaleDateString("pt-BR");
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function formatarHorario(data: any) {
    if (!data) return "";
    const d = data.toDate ? data.toDate() : new Date(data);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function renderPedido({ item }: any) {
    // Exibe os itens do pedido
    const itensTexto = item.lanches?.map((l: any) => `${l.quantidade}x ${l.nome}`).join(", ");

    return (
      <View style={styles.card}>
        <Text style={styles.pedidoId}>Pedido #{item.id.slice(-6)}</Text>
        <Text style={styles.cliente}>Cliente: {item.compradorNome || item.compradorId.slice(-6)}</Text>
        <Text style={styles.data}>Data: {formatarData(item.criadoEm)} às {formatarHorario(item.criadoEm)}</Text>
        <Text style={styles.itens}>📦 Itens: {itensTexto}</Text>
        <Text style={styles.local}>📍 Retirada: {item.lanches?.[0]?.localRetirada || "Local não informado"}</Text>
        <Text style={styles.total}>Total: R$ {item.total.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.botaoConfirmar}
          onPress={() => navigation.navigate("LerQRCode", { pedidoId: item.id, codigoNumerico: item.codigoNumerico })}
        >
          <Text style={styles.botaoTexto}>✅ Confirmar entrega</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Pedidos Pendentes</Text>
      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id}
        renderItem={renderPedido}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B6B"]} />}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhum pedido pendente</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f8f8f8" },
  titulo: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#333" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  pedidoId: { fontSize: 16, fontWeight: "bold", marginBottom: 5, color: "#333" },
  cliente: { fontSize: 14, color: "#333", marginBottom: 2 },
  data: { fontSize: 12, color: "#666", marginBottom: 4 },
  itens: { fontSize: 13, color: "#444", marginBottom: 4, fontWeight: "500" },
  local: { fontSize: 12, color: "#666", marginBottom: 5, fontStyle: "italic" },
  total: { fontSize: 16, fontWeight: "bold", color: "#27ae60", marginBottom: 10 },
  botaoConfirmar: { backgroundColor: "#27ae60", padding: 10, borderRadius: 8, alignItems: "center" },
  botaoTexto: { color: "#fff", fontWeight: "bold" },
  vazio: { textAlign: "center", marginTop: 40, fontSize: 16, color: "#999" },
});