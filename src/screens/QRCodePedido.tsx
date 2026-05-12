import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function QRCodePedido({ route, navigation }: any) {
  const { pedidos } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>QR Code para Retirada</Text>

      {pedidos.map((pedido: any, index: number) => (
        <View key={pedido.id} style={styles.card}>
          <Text style={styles.vendedor}>Pedido #{pedido.id.slice(-6)}</Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={JSON.stringify({
                pedidoId: pedido.id,
                codigo: pedido.qrCode,
                vendedorId: pedido.vendedorId,
              })}
              size={200}
            />
          </View>

          <Text style={styles.codigoNumerico}>🔢 Código de retirada: {pedido.codigoNumerico}</Text>
          <Text style={styles.total}>Total: R$ {pedido.total.toFixed(2)}</Text>
          <Text style={styles.data}>
            Retirada: {new Date(pedido.dataRetirada).toLocaleDateString("pt-BR")}
          </Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.botaoVoltar}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.botaoTexto}>Voltar ao Início</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  titulo: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    alignItems: "center",
  },
  vendedor: { fontSize: 14, color: "#666", marginBottom: 15 },
  qrContainer: { marginVertical: 20 },
  codigoNumerico: { fontSize: 16, fontWeight: "bold", color: "#333", marginTop: 10, textAlign: "center" },
  total: { fontSize: 18, fontWeight: "bold", color: "#27ae60", marginTop: 10 },
  data: { fontSize: 14, color: "#e74c3c", marginTop: 5 },
  botaoVoltar: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 30,
  },
  botaoTexto: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});