import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../database/database";
import StarRating from "../components/StarRating";

export default function AvaliarProduto({ route, navigation }: any) {
  const { pedidoId, produto, vendedorId } = route.params;
  const [avaliacaoProduto, setAvaliacaoProduto] = useState(0);
  const [avaliacaoVendedor, setAvaliacaoVendedor] = useState(0);
  const [comentario, setComentario] = useState("");

  async function enviarAvaliacao() {
    if (avaliacaoProduto === 0) {
      Alert.alert("Atenção", "Avalie o produto com estrelas");
      return;
    }

    if (avaliacaoVendedor === 0) {
      Alert.alert("Atenção", "Avalie o vendedor com estrelas");
      return;
    }

    try {
      // Avaliação do produto
      await addDoc(collection(db, "avaliacoes_produto"), {
        produtoId: produto.id,
        produtoNome: produto.nome,
        compradorId: auth.currentUser?.uid,
        vendedorId: vendedorId,
        nota: avaliacaoProduto,
        comentario: comentario,
        pedidoId: pedidoId,
        criadoEm: new Date(),
      });

      // Avaliação do vendedor
      await addDoc(collection(db, "avaliacoes_vendedor"), {
        vendedorId: vendedorId,
        compradorId: auth.currentUser?.uid,
        nota: avaliacaoVendedor,
        comentario: comentario,
        pedidoId: pedidoId,
        criadoEm: new Date(),
      });

      Alert.alert("Obrigado!", "Sua avaliação foi registrada com sucesso!");
      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível enviar a avaliação");
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Avaliar Pedido</Text>

      <View style={styles.card}>
        <Text style={styles.produtoNome}>{produto.nome}</Text>

        <Text style={styles.label}>Avalie o produto:</Text>
        <StarRating rating={avaliacaoProduto} onRatingPress={setAvaliacaoProduto} />

        <Text style={styles.label}>Avalie o vendedor:</Text>
        <StarRating rating={avaliacaoVendedor} onRatingPress={setAvaliacaoVendedor} />

        <Text style={styles.label}>Deixe um comentário (opcional):</Text>
        <TextInput
          style={styles.input}
          placeholder="O que você achou do lanche e do atendimento?"
          value={comentario}
          onChangeText={setComentario}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.botao} onPress={enviarAvaliacao}>
          <Text style={styles.botaoTexto}>Enviar Avaliação</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  card: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  produtoNome: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 100,
  },
  botao: {
    backgroundColor: "#FF6B6B",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  botaoTexto: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
});