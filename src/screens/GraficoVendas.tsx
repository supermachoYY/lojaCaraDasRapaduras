import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../database/database";
import { BarChart } from "react-native-chart-kit";

const { width: screenWidth } = Dimensions.get("window");

export default function GraficoVendas({ navigation }: any) {
  const [vendas, setVendas] = useState<{ dia: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarVendas();
  }, []);

  async function carregarVendas() {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);
      dataLimite.setHours(0, 0, 0, 0);

      const q = query(
        collection(db, "pedidos"),
        where("vendedorId", "==", auth.currentUser.uid),
        where("status", "==", "finalizado"),
        where("criadoEm", ">=", dataLimite)
      );
      const snapshot = await getDocs(q);
      const pedidos = snapshot.docs.map(doc => doc.data());

      const vendasPorDia: { [key: string]: number } = {};
      pedidos.forEach(pedido => {
        const data = pedido.criadoEm.toDate();
        const diaStr = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}`;
        vendasPorDia[diaStr] = (vendasPorDia[diaStr] || 0) + (pedido.total || 0);
      });

      const dados = Object.entries(vendasPorDia)
        .map(([dia, total]) => ({ dia, total }))
        .sort((a, b) => {
          const [diaA, mesA] = a.dia.split("/");
          const [diaB, mesB] = b.dia.split("/");
          return new Date(2024, parseInt(mesA)-1, parseInt(diaA)).getTime() -
                 new Date(2024, parseInt(mesB)-1, parseInt(diaB)).getTime();
        });

      setVendas(dados);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (vendas.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Nenhuma venda nos últimos 30 dias</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const labels = vendas.map(v => v.dia);
  const valores = vendas.map(v => v.total);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Vendas (30 dias)</Text>
      </View>

      <BarChart
        data={{
          labels: labels,
          datasets: [{ data: valores }],
        }}
        width={screenWidth - 32}
        height={300}
        yAxisLabel="R$ "
        chartConfig={{
          backgroundColor: "#fff",
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        verticalLabelRotation={45}
        fromZero
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8", padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  titulo: { fontSize: 18, fontWeight: "bold", marginLeft: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});