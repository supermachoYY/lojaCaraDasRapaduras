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
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../database/database";
import QRCode from "react-native-qrcode-svg";

export default function MeusPedidos({ navigation }: any) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);

  async function carregarPedidos() {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, "pedidos"),
        where("compradorId", "==", auth.currentUser.uid),
        orderBy("criadoEm", "desc")
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidos(lista);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível carregar seus pedidos");
    }
  }

  useEffect(() => {
    carregarPedidos();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarPedidos();
    setRefreshing(false);
  };

  function formatarData(data: any) {
    if (!data) return "Data não informada";
    if (data.toDate) return data.toDate().toLocaleDateString("pt-BR");
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function getStatusText(status: string) {
    switch (status) {
      case "pendente": return "⏳ Aguardando retirada";
      case "finalizado": return "✅ Finalizado";
      case "cancelado": return "❌ Cancelado";
      default: return status;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "pendente": return "#FFB800";
      case "finalizado": return "#27ae60";
      case "cancelado": return "#e74c3c";
      default: return "#999";
    }
  }

  function abrirDetalhes(pedido: any) {
    if (pedido.status === "pendente") {
      setPedidoSelecionado(pedido);
    } else {
      Alert.alert("Pedido finalizado", "Este pedido já foi entregue.");
    }
  }

  function fecharModal() {
    setPedidoSelecionado(null);
  }

  async function excluirPedido(pedidoId: string) {
    Alert.alert(
      "Excluir pedido",
      "Tem certeza? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "pedidos", pedidoId));
              setPedidos(prev => prev.filter(p => p.id !== pedidoId));
              Alert.alert("Sucesso", "Pedido excluído");
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir o pedido");
            }
          }
        }
      ]
    );
  }

  function avaliarPedido(pedido: any) {
    navigation.navigate("AvaliarPedido", { pedido });
  }

  function renderPedido({ item }: any) {
    const isFinalizado = item.status === "finalizado";
    const podeAvaliar = isFinalizado && !item.avaliado; // 🔥 CAMPO VERIFICADO

    return (
      <TouchableOpacity style={styles.card} onPress={() => abrirDetalhes(item)} activeOpacity={0.7}>
        <View style={styles.header}>
          <Text style={styles.pedidoId}>Pedido #{item.id.slice(-6)}</Text>
          <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
        <Text style={styles.data}>Data: {formatarData(item.criadoEm)}</Text>
        <Text style={styles.total}>Total: R$ {item.total.toFixed(2)}</Text>
        {item.status === "pendente" && (
          <Text style={styles.toque}>👆 Toque para ver o QR Code</Text>
        )}

        <View style={styles.actions}>
          {podeAvaliar && (
            <TouchableOpacity style={styles.avaliarButton} onPress={() => avaliarPedido(item)}>
              <Text style={styles.buttonText}>⭐ Avaliar</Text>
            </TouchableOpacity>
          )}
          {isFinalizado && (
            <TouchableOpacity style={styles.excluirButton} onPress={() => excluirPedido(item.id)}>
              <Text style={styles.buttonText}>🗑️ Excluir</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Meus Pedidos</Text>
      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id}
        renderItem={renderPedido}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B6B"]} />}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhum pedido encontrado</Text>}
      />

      {pedidoSelecionado && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Informações do Pedido</Text>
            <Text style={styles.modalPedidoId}>Pedido #{pedidoSelecionado.id.slice(-6)}</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={JSON.stringify({
                  pedidoId: pedidoSelecionado.id,
                  codigo: pedidoSelecionado.qrCode,
                  vendedorId: pedidoSelecionado.vendedorId,
                })}
                size={200}
              />
            </View>
            <Text style={styles.codigoNumerico}>
              🔢 Código de retirada: {pedidoSelecionado.codigoNumerico}
            </Text>
            <TouchableOpacity style={styles.botaoFechar} onPress={fecharModal}>
              <Text style={styles.botaoTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f8f8f8" },
  titulo: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  pedidoId: { fontSize: 16, fontWeight: "bold", color: "#333" },
  status: { fontSize: 14, fontWeight: "500" },
  data: { fontSize: 12, color: "#666", marginBottom: 5 },
  total: { fontSize: 16, fontWeight: "bold", color: "#27ae60" },
  toque: { fontSize: 12, color: "#FF6B6B", marginTop: 8, textAlign: "center" },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 10 },
  avaliarButton: { flex: 1, backgroundColor: "#FF6B6B", paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  excluirButton: { flex: 1, backgroundColor: "#e74c3c", paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  vazio: { textAlign: "center", marginTop: 40, fontSize: 16, color: "#999" },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    alignItems: "center",
  },
  modalTitulo: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  modalPedidoId: { fontSize: 14, color: "#666", marginBottom: 15 },
  qrContainer: { marginVertical: 20 },
  codigoNumerico: { fontSize: 16, fontWeight: "bold", marginTop: 10, marginBottom: 20 },
  botaoFechar: { backgroundColor: "#FF6B6B", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});