import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { CartContext } from "../services/CartContext";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../database/database";
import StarRating from "../components/StarRating";

export default function Produto({ route, navigation }: any) {
  const { produto } = route.params;
  const { adicionarAoCarrinho } = useContext(CartContext);
  const [quantidade, setQuantidade] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [mediaAvaliacao, setMediaAvaliacao] = useState(0);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(true);
  const [vendedorInfo, setVendedorInfo] = useState<any>(null);
  const [isFavorito, setIsFavorito] = useState(false);

  const precoAtual = produto.promocao && produto.precoPromocional ? produto.precoPromocional : produto.preco;
  const precoOriginal = produto.promocao ? produto.preco : null;
  const descontoPercentual = precoOriginal ? Math.round(((precoOriginal - precoAtual) / precoOriginal) * 100) : 0;

  useEffect(() => {
    verificarFavorito();
    buscarAvaliacoes();
    buscarVendedorInfo();
  }, []);

  async function verificarFavorito() {
    if (!auth.currentUser) return;
    const favoritoId = `${auth.currentUser.uid}_${produto.id}`;
    const favoritoRef = doc(db, "favoritos", favoritoId);
    const docSnap = await getDoc(favoritoRef);
    setIsFavorito(docSnap.exists());
  }

  async function buscarAvaliacoes() {
    try {
      const q = query(
        collection(db, "avaliacoes_produto"),
        where("produtoId", "==", produto.id),
        orderBy("criadoEm", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const lista: any[] = [];
      let soma = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        lista.push({ id: doc.id, ...data });
        soma += data.nota;
      });
      setAvaliacoes(lista);
      setMediaAvaliacao(lista.length > 0 ? soma / lista.length : 0);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingAvaliacoes(false);
    }
  }

  async function buscarVendedorInfo() {
    if (!produto.userId) return;
    try {
      const userDoc = await getDoc(doc(db, "usuarios", produto.userId));
      if (userDoc.exists()) setVendedorInfo(userDoc.data());
    } catch (error) {
      console.log(error);
    }
  }

  function incrementar() {
    const limiteMaximo = 3;
    const limiteEstoque = produto.quantidadeDisponivel || 999;
    if (quantidade >= limiteMaximo) {
      Alert.alert("Limite atingido", "Máximo 3 unidades por pedido");
      return;
    }
    if (quantidade >= limiteEstoque) {
      Alert.alert("Estoque insuficiente", `Apenas ${limiteEstoque} disponíveis`);
      return;
    }
    setQuantidade(quantidade + 1);
  }

  function decrementar() {
    if (quantidade > 1) setQuantidade(quantidade - 1);
  }

  function adicionarAoCarrinhoComQuantidade() {
    if (produto.disponivel === false) {
      Alert.alert("Indisponível", "Este lanche não está disponível no momento");
      return;
    }
    const quantidadeEstoque = produto.quantidadeDisponivel || 999;
    if (quantidade > quantidadeEstoque) {
      Alert.alert("Estoque insuficiente", `Apenas ${quantidadeEstoque} unidades disponíveis`);
      return;
    }
    for (let i = 0; i < quantidade; i++) {
      adicionarAoCarrinho({ ...produto, preco: precoAtual });
    }
    setShowModal(true);
    setTimeout(() => setShowModal(false), 1500);
  }

  async function toggleFavorito() {
    if (!auth.currentUser) {
      Alert.alert("Login necessário", "Faça login para favoritar");
      return;
    }
    const favoritoId = `${auth.currentUser.uid}_${produto.id}`;
    const favoritoRef = doc(db, "favoritos", favoritoId);
    if (isFavorito) {
      await deleteDoc(favoritoRef);
      setIsFavorito(false);
      Alert.alert("Removido", "Lanche removido dos favoritos");
    } else {
      await setDoc(favoritoRef, {
        usuarioId: auth.currentUser.uid,
        lancheId: produto.id,
        criadoEm: new Date()
      });
      setIsFavorito(true);
      Alert.alert("Favoritado", "Lanche adicionado aos favoritos");
    }
  }

  const estaDisponivel = produto.disponivel !== false && (produto.quantidadeDisponivel || 999) > 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: produto.imagem }} style={styles.imagem} />
        {produto.promocao && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>-{descontoPercentual}% OFF</Text>
          </View>
        )}
        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorito}>
          <Text style={styles.favoriteIcon}>{isFavorito ? "❤️" : "🤍"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.headerInfo}>
          {produto.categoria && (
            <View style={[styles.categoriaBadge, { backgroundColor: getCorCategoria(produto.categoria) + "20" }]}>
              <Text style={[styles.categoriaText, { color: getCorCategoria(produto.categoria) }]}>
                {getNomeCategoria(produto.categoria)}
              </Text>
            </View>
          )}
          <Text style={styles.nome}>{produto.nome}</Text>
        </View>

        <View style={styles.ratingSection}>
          <StarRating rating={mediaAvaliacao} readonly={true} />
          <Text style={styles.ratingText}>{mediaAvaliacao.toFixed(1)} ({avaliacoes.length} avaliações)</Text>
        </View>

        <View style={styles.priceSection}>
          {precoOriginal ? (
            <>
              <Text style={styles.precoOriginal}>R$ {precoOriginal.toFixed(2)}</Text>
              <Text style={styles.preco}>R$ {precoAtual.toFixed(2)}</Text>
              <View style={styles.economiaBadge}>
                <Text style={styles.economiaText}>Economize R$ {(precoOriginal - precoAtual).toFixed(2)}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.preco}>R$ {precoAtual.toFixed(2)}</Text>
          )}
        </View>

        <View style={styles.statusSection}>
          {estaDisponivel ? (
            <View style={styles.disponivelCard}>
              <Text style={styles.disponivelIcon}>✅</Text>
              <View>
                <Text style={styles.disponivelTitle}>Disponível</Text>
                <Text style={styles.disponivelText}>
                  {produto.quantidadeDisponivel > 0 ? `${produto.quantidadeDisponivel} unidades` : "Estoque ilimitado"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.indisponivelCard}>
              <Text style={styles.indisponivelIcon}>❌</Text>
              <View>
                <Text style={styles.indisponivelTitle}>Indisponível</Text>
                <Text style={styles.indisponivelText}>Não disponível no momento</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Descrição</Text>
          <Text style={styles.descricao}>{produto.descricao}</Text>
        </View>

        {produto.ingredientes && produto.ingredientes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🥗 Ingredientes</Text>
            <View style={styles.ingredientesContainer}>
              {produto.ingredientes.map((ingrediente: string, index: number) => (
                <View key={index} style={styles.ingredienteTag}>
                  <Text style={styles.ingredienteText}>{ingrediente}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Informações</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏱️</Text>
              <View>
                <Text style={styles.infoLabel}>Tempo de preparo</Text>
                <Text style={styles.infoValue}>{produto.tempoPreparo || "15-25"} min</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <View>
                <Text style={styles.infoLabel}>Retirada</Text>
                <Text style={styles.infoValue}>Cantina do IFSul</Text>
              </View>
            </View>
            {vendedorInfo && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👨‍🍳</Text>
                <View>
                  <Text style={styles.infoLabel}>Vendedor</Text>
                  <Text style={styles.infoValue}>{vendedorInfo.nome || "Aluno IFSul"}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⭐ Avaliações</Text>
            <TouchableOpacity><Text style={styles.seeAll}>Ver todas</Text></TouchableOpacity>
          </View>
          {loadingAvaliacoes ? (
            <ActivityIndicator color="#FF6B6B" />
          ) : avaliacoes.length === 0 ? (
            <Text style={styles.noReviews}>Ainda não há avaliações</Text>
          ) : (
            avaliacoes.map((avaliacao, index) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewUser}>Aluno #{avaliacao.compradorId?.slice(-6)}</Text>
                  <StarRating rating={avaliacao.nota} readonly={true} />
                </View>
                {avaliacao.comentario && <Text style={styles.reviewComment}>"{avaliacao.comentario}"</Text>}
                <Text style={styles.reviewDate}>
                  {new Date(avaliacao.criadoEm?.toDate()).toLocaleDateString("pt-BR")}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {estaDisponivel && (
        <View style={styles.bottomBar}>
          <View style={styles.quantidadeContainer}>
            <TouchableOpacity style={styles.quantidadeButton} onPress={decrementar}>
              <Text style={styles.quantidadeButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantidade}>{quantidade}</Text>
            <TouchableOpacity style={styles.quantidadeButton} onPress={incrementar}>
              <Text style={styles.quantidadeButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.botaoComprar} onPress={adicionarAoCarrinhoComQuantidade}>
            <Text style={styles.botaoComprarTexto}>Adicionar • R$ {(precoAtual * quantidade).toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal transparent={true} visible={showModal} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalText}>Adicionado ao carrinho!</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getCorCategoria(categoria: string): string {
  const cores: Record<string, string> = { lanche: "#FF6B6B", bebida: "#4ECDC4", doce: "#FFE66D", promocao: "#FF6B6B" };
  return cores[categoria] || "#FF6B6B";
}
function getNomeCategoria(categoria: string): string {
  const nomes: Record<string, string> = { lanche: "🍔 Lanche", bebida: "🥤 Bebida", doce: "🍰 Doce", promocao: "🎉 Promoção" };
  return nomes[categoria] || "📦 Produto";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  imageContainer: { position: "relative", backgroundColor: "#fff" },
  imagem: { width: "100%", height: 300, resizeMode: "cover" },
  promoBadge: { position: "absolute", top: 20, right: 20, backgroundColor: "#e74c3c", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  promoBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  favoriteButton: { position: "absolute", bottom: 20, right: 20, width: 45, height: 45, borderRadius: 22.5, backgroundColor: "rgba(255,255,255,0.9)", justifyContent: "center", alignItems: "center" },
  favoriteIcon: { fontSize: 24 },
  backButton: { position: "absolute", top: 50, left: 20, width: 45, height: 45, borderRadius: 22.5, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  backIcon: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  content: { padding: 20 },
  headerInfo: { marginBottom: 12 },
  categoriaBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  categoriaText: { fontSize: 12, fontWeight: "500" },
  nome: { fontSize: 28, fontWeight: "bold", color: "#333" },
  ratingSection: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  ratingText: { marginLeft: 8, fontSize: 14, color: "#666" },
  priceSection: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", marginBottom: 16 },
  precoOriginal: { fontSize: 16, color: "#999", textDecorationLine: "line-through", marginRight: 8 },
  preco: { fontSize: 32, fontWeight: "bold", color: "#FF6B6B", marginRight: 8 },
  economiaBadge: { backgroundColor: "#27ae6020", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  economiaText: { fontSize: 12, color: "#27ae60", fontWeight: "500" },
  statusSection: { marginBottom: 20 },
  disponivelCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", padding: 12, borderRadius: 12 },
  disponivelIcon: { fontSize: 24, marginRight: 12 },
  disponivelTitle: { fontSize: 14, fontWeight: "bold", color: "#27ae60" },
  disponivelText: { fontSize: 12, color: "#666" },
  indisponivelCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFEBEE", padding: 12, borderRadius: 12 },
  indisponivelIcon: { fontSize: 24, marginRight: 12 },
  indisponivelTitle: { fontSize: 14, fontWeight: "bold", color: "#e74c3c" },
  indisponivelText: { fontSize: 12, color: "#666" },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { color: "#FF6B6B", fontSize: 14 },
  descricao: { fontSize: 15, color: "#666", lineHeight: 22 },
  ingredientesContainer: { flexDirection: "row", flexWrap: "wrap" },
  ingredienteTag: { backgroundColor: "#f0f0f0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  ingredienteText: { fontSize: 12, color: "#666" },
  infoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 15, elevation: 2 },
  infoRow: { flexDirection: "row", marginBottom: 15 },
  infoIcon: { fontSize: 22, marginRight: 15 },
  infoLabel: { fontSize: 12, color: "#999", marginBottom: 2 },
  infoValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  reviewCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 10, elevation: 1 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reviewUser: { fontSize: 14, fontWeight: "500", color: "#333" },
  reviewComment: { fontSize: 14, color: "#666", marginBottom: 8, fontStyle: "italic" },
  reviewDate: { fontSize: 11, color: "#999" },
  noReviews: { textAlign: "center", color: "#999", padding: 20 },
  bottomBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", padding: 15, borderTopWidth: 1, borderTopColor: "#eee", gap: 15 },
  quantidadeContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 12, padding: 5 },
  quantidadeButton: { width: 45, height: 45, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, elevation: 1 },
  quantidadeButtonText: { fontSize: 24, fontWeight: "bold", color: "#FF6B6B" },
  quantidade: { fontSize: 20, fontWeight: "bold", marginHorizontal: 20, color: "#333" },
  botaoComprar: { flex: 1, backgroundColor: "#FF6B6B", paddingVertical: 15, borderRadius: 12, alignItems: "center", elevation: 3 },
  botaoComprarTexto: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 15, alignItems: "center", elevation: 5 },
  modalIcon: { fontSize: 50, marginBottom: 10 },
  modalText: { fontSize: 16, fontWeight: "bold", color: "#333" },
});