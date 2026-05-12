import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../database/database";
import StarRating from "../components/StarRating";

export default function AvaliarPedido({ route, navigation }: any) {
  const { pedido } = route.params;
  const [avaliacoes, setAvaliacoes] = useState<{ [produtoId: string]: number }>({});
  const [comentarios, setComentarios] = useState<{ [produtoId: string]: string }>({});
  const [avaliacaoVendedor, setAvaliacaoVendedor] = useState(0);
  const [comentarioVendedor, setComentarioVendedor] = useState("");
  const [loading, setLoading] = useState(false);

  function setNota(produtoId: string, nota: number) {
    setAvaliacoes(prev => ({ ...prev, [produtoId]: nota }));
  }

  function setComentario(produtoId: string, texto: string) {
    setComentarios(prev => ({ ...prev, [produtoId]: texto }));
  }

  async function enviarAvaliacoes() {
    if (!auth.currentUser) return;

    // Verifica se todos os produtos foram avaliados
    const todosAvaliados = pedido.lanches.every((p: any) => avaliacoes[p.id] && avaliacoes[p.id] > 0);
    if (!todosAvaliados) {
      Alert.alert("Atenção", "Avalie todos os produtos com estrelas");
      return;
    }
    if (avaliacaoVendedor === 0) {
      Alert.alert("Atenção", "Avalie o vendedor");
      return;
    }

    setLoading(true);
    try {
      // Salvar avaliações de cada produto
      for (const item of pedido.lanches) {
        await addDoc(collection(db, "avaliacoes_produto"), {
          produtoId: item.id,
          produtoNome: item.nome,
          compradorId: auth.currentUser.uid,
          vendedorId: pedido.vendedorId,
          nota: avaliacoes[item.id],
          comentario: comentarios[item.id] || "",
          pedidoId: pedido.id,
          criadoEm: new Date(),
        });
      }

      // Salvar avaliação do vendedor
      await addDoc(collection(db, "avaliacoes_vendedor"), {
        vendedorId: pedido.vendedorId,
        compradorId: auth.currentUser.uid,
        nota: avaliacaoVendedor,
        comentario: comentarioVendedor,
        pedidoId: pedido.id,
        criadoEm: new Date(),
      });

      // Marcar pedido como já avaliado
      await updateDoc(doc(db, "pedidos", pedido.id), { avaliado: true });

      Alert.alert("Obrigado!", "Avaliações registradas com sucesso!");
      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível enviar as avaliações");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Avaliar Pedido</Text>
      <Text style={styles.pedidoId}>Pedido #{pedido.id.slice(-6)}</Text>

      {pedido.lanches.map((item: any) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.produtoNome}>{item.nome}</Text>
          <Text style={styles.label}>Sua nota:</Text>
          <StarRating rating={avaliacoes[item.id] || 0} onRatingPress={(nota) => setNota(item.id, nota)} />
          <Text style={styles.label}>Comentário (opcional):</Text>
          <TextInput
            style={styles.input}
            placeholder="O que achou deste lanche?"
            value={comentarios[item.id] || ""}
            onChangeText={(text) => setComentario(item.id, text)}
            multiline
          />
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.produtoNome}>Avalie o vendedor</Text>
        <Text style={styles.label}>Nota para o vendedor:</Text>
        <StarRating rating={avaliacaoVendedor} onRatingPress={setAvaliacaoVendedor} />
        <Text style={styles.label}>Comentário (opcional):</Text>
        <TextInput
          style={styles.input}
          placeholder="Como foi o atendimento?"
          value={comentarioVendedor}
          onChangeText={setComentarioVendedor}
          multiline
        />
      </View>

      <TouchableOpacity style={styles.botao} onPress={enviarAvaliacoes} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Enviar Avaliações</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8", padding: 16 },
  titulo: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  pedidoId: { fontSize: 14, color: "#666", marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  produtoNome: { fontSize: 18, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 8, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 14, textAlignVertical: "top", minHeight: 60, marginBottom: 8 },
  botao: { backgroundColor: "#FF6B6B", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8, marginBottom: 30 },
  botaoTexto: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});