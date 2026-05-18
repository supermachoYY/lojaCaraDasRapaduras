import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";
import { collection, onSnapshot, query, orderBy, where, getDoc, doc } from "firebase/firestore";
import { db, auth } from "../database/database";
import { signOut } from "firebase/auth";

export default function Home({ navigation }: any) {
  const [lanches, setLanches] = useState<any[]>([]);
  const [filteredLanches, setFilteredLanches] = useState<any[]>([]);
  const [promocoes, setPromocoes] = useState<any[]>([]);
  const [lanchesFavoritos, setLanchesFavoritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("todos");
  const [refreshing, setRefreshing] = useState(false);

  const categorias = [
    { id: "todos", nome: "Todos", icon: "🍽️", cor: "#FF6B6B" },
    { id: "lanche", nome: "Salgados", icon: "🍔", cor: "#FF6B6B" },
    { id: "bebida", nome: "Bebidas", icon: "🥤", cor: "#4ECDC4" },
    { id: "doce", nome: "Doces", icon: "🍰", cor: "#FFE66D" },
    { id: "promocao", nome: "Promoções", icon: "🎉", cor: "#FF6B6B" },
  ];

  // Buscar favoritos em tempo real
  useEffect(() => {
    if (!auth.currentUser) return;

    const favoritosQuery = query(
      collection(db, "favoritos"),
      where("usuarioId", "==", auth.currentUser.uid)
    );

    const unsubscribeFavoritos = onSnapshot(favoritosQuery, async (snapshot) => {
      if (snapshot.empty) {
        setLanchesFavoritos([]);
        return;
      }
      const ids = snapshot.docs.map(doc => doc.data().lancheId);
      const lanchesPromises = ids.map(async (id) => {
        const lancheDoc = await getDoc(doc(db, "lanches", id));
        return lancheDoc.exists() ? { id: lancheDoc.id, ...lancheDoc.data() } : null;
      });
      const lanchesData = (await Promise.all(lanchesPromises)).filter(l => l !== null);
      setLanchesFavoritos(lanchesData);
    });

    return () => unsubscribeFavoritos();
  }, []);

  // Buscar lanches e promoções
  useEffect(() => {
    const unsubscribeLanches = onSnapshot(
      query(collection(db, "lanches"), orderBy("criadoEm", "desc")),
      (snapshot) => {
        const lista: any[] = [];
        snapshot.forEach((doc) => {
          lista.push({ id: doc.id, ...doc.data() });
        });
        setLanches(lista);
        filtrarLanches(lista, categoriaSelecionada, searchText);
        setLoading(false);
      }
    );

    const unsubscribePromos = onSnapshot(
      query(collection(db, "lanches"), orderBy("criadoEm", "desc")),
      (snapshot) => {
        const lista: any[] = [];
        snapshot.forEach((doc) => {
          if (doc.data().promocao === true) lista.push({ id: doc.id, ...doc.data() });
        });
        setPromocoes(lista);
      }
    );

    return () => {
      unsubscribeLanches();
      unsubscribePromos();
    };
  }, []);

  function filtrarLanches(lista: any[], categoria: string, busca: string) {
    let resultado = [...lista];
    if (categoria !== "todos") {
      if (categoria === "promocao") {
        resultado = resultado.filter(item => item.promocao === true);
      } else {
        resultado = resultado.filter(item => {
          if (item.categorias && Array.isArray(item.categorias)) {
            return item.categorias.includes(categoria);
          } else if (item.categoria) {
            return item.categoria === categoria;
          }
          return false;
        });
      }
    }
    if (busca.trim() !== "") {
      resultado = resultado.filter(item =>
        item.nome.toLowerCase().includes(busca.toLowerCase()) ||
        item.descricao?.toLowerCase().includes(busca.toLowerCase())
      );
    }
    setFilteredLanches(resultado);
  }

  useEffect(() => {
    filtrarLanches(lanches, categoriaSelecionada, searchText);
  }, [categoriaSelecionada, searchText, lanches]);

  function filtrarPorCategoria(categoriaId: string) {
    setCategoriaSelecionada(categoriaId);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (error) {
      alert("Erro ao sair");
    }
  };

  function getCategoriaIcon(cat: string) {
    switch(cat) {
      case "lanche": return "🍔 Salgado";
      case "bebida": return "🥤 Bebida";
      case "doce": return "🍰 Doce";
      default: return cat;
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Carregando delícias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Olá, {auth.currentUser?.displayName?.split('@')[0] || auth.currentUser?.email?.split('@')[0] || "Aluno"}!
          </Text>
          <Text style={styles.subtitle}>O que você quer comer hoje?</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Perfil")} style={styles.profileButton}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar lanches..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B6B"]} />
        }
      >
        {/* Categorias */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasContainer}>
          {categorias.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.categoriaItem} onPress={() => filtrarPorCategoria(cat.id)}>
              <View style={[
                styles.categoriaIcon,
                { backgroundColor: cat.cor + "20" },
                categoriaSelecionada === cat.id && styles.categoriaIconActive,
                categoriaSelecionada === cat.id && { borderColor: cat.cor, borderWidth: 2 }
              ]}>
                <Text style={styles.categoriaIconText}>{cat.icon}</Text>
              </View>
              <Text style={[styles.categoriaNome, categoriaSelecionada === cat.id && { color: cat.cor, fontWeight: "bold" }]}>
                {cat.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Favoritos */}
        {lanchesFavoritos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>❤️ Seus Favoritos</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {lanchesFavoritos.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.promoCard}
                  onPress={() => navigation.navigate("Produto", { produto: item })}
                >
                  <Image source={{ uri: item.imagem }} style={styles.promoImage} />
                  <Text style={styles.promoNome} numberOfLines={2}>{item.nome}</Text>
                  <Text style={styles.promoPrice}>R$ {item.preco.toFixed(2)}</Text>
                  <Text style={styles.deliveryTime}>Pronto em {item.tempoPreparo || "15-25"} min</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Promoções */}
        {(categoriaSelecionada === "todos" || categoriaSelecionada === "promocao") && promocoes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎯 Promoções Especiais</Text>
              <TouchableOpacity onPress={() => filtrarPorCategoria("promocao")}>
                <Text style={styles.seeMore}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {promocoes.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.promoCard}
                  onPress={() => navigation.navigate("Produto", { produto: item })}
                >
                  <Image source={{ uri: item.imagem }} style={styles.promoImage} />
                  <Text style={styles.promoNome} numberOfLines={2}>{item.nome}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.oldPrice}>R$ {item.preco.toFixed(2)}</Text>
                    <Text style={styles.promoPrice}>R$ {(item.precoPromocional || item.preco).toFixed(2)}</Text>
                  </View>
                  <Text style={styles.deliveryTime}>Pronto em {item.tempoPreparo || "15-25"} min</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Listagem principal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {categoriaSelecionada === "todos" && "🍔 Todos os Lanches"}
              {categoriaSelecionada === "lanche" && "🍔 Salgados"}
              {categoriaSelecionada === "bebida" && "🥤 Bebidas"}
              {categoriaSelecionada === "doce" && "🍰 Doces"}
              {categoriaSelecionada === "promocao" && "🎉 Em Promoção"}
            </Text>
            <Text style={styles.resultCount}>{filteredLanches.length} itens</Text>
          </View>

          {filteredLanches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍔</Text>
              <Text style={styles.emptyText}>Nenhum lanche encontrado</Text>
              <Text style={styles.emptySubtext}>Tente outra categoria</Text>
            </View>
          ) : (
            filteredLanches.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.lancheCard}
                onPress={() => navigation.navigate("Produto", { produto: item })}
              >
                <Image source={{ uri: item.imagem }} style={styles.lancheImage} />
                <View style={styles.lancheInfo}>
                  <Text style={styles.lancheNome}>{item.nome}</Text>
                  <Text style={styles.lancheDescricao} numberOfLines={2}>{item.descricao}</Text>

                  <View style={styles.categoriaBadge}>
                    <Text style={styles.categoriaBadgeText}>
                      {item.categorias ? item.categorias.map(c => getCategoriaIcon(c)).join(' | ') : (item.categoria === "lanche" ? "🍔 Salgado" : item.categoria === "bebida" ? "🥤 Bebida" : "🍰 Doce")}
                    </Text>
                  </View>

                  {/* Exibição correta da avaliação média (sem fallback fixo) */}
                  <View style={styles.ratingContainer}>
                    <Text style={styles.rating}>
                      ⭐ {(item.mediaAvaliacao || 0).toFixed(1)}
                    </Text>
                    <Text style={styles.ratingCount}>
                      ({item.totalAvaliacoes || 0} {item.totalAvaliacoes === 1 ? "avaliação" : "avaliações"})
                    </Text>
                  </View>

                  <View style={styles.priceRow}>
                    {item.promocao ? (
                      <>
                        <Text style={styles.oldPrice}>R$ {item.preco.toFixed(2)}</Text>
                        <Text style={styles.lanchePreco}>R$ {(item.precoPromocional || item.preco).toFixed(2)}</Text>
                      </>
                    ) : (
                      <Text style={styles.lanchePreco}>R$ {item.preco.toFixed(2)}</Text>
                    )}
                  </View>
                  <Text style={styles.deliveryTime}>⏱️ Pronto em {item.tempoPreparo || "15-25"} min</Text>
                </View>
                {item.promocao && (
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>🔥 OFF</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")}>
          <Text style={[styles.navIcon, styles.navActive]}>🏠</Text>
          <Text style={[styles.navText, styles.navActiveText]}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Carrinho")}>
          <Text style={styles.navIcon}>🛒</Text>
          <Text style={styles.navText}>Carrinho</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("MeusPedidos")}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navText}>Pedidos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Perfil")}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navText}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#FF6B6B", fontSize: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 50, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  welcomeText: { fontSize: 24, fontWeight: "bold", color: "#333" },
  subtitle: { fontSize: 14, color: "#999", marginTop: 5 },
  profileButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: "#FF6B6B20", justifyContent: "center", alignItems: "center" },
  profileIcon: { fontSize: 24 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 15, paddingHorizontal: 15, borderRadius: 25, elevation: 2 },
  searchIcon: { fontSize: 18, color: "#999", marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  categoriasContainer: { paddingHorizontal: 15, marginBottom: 20 },
  categoriaItem: { alignItems: "center", marginRight: 20 },
  categoriaIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  categoriaIconActive: { transform: [{ scale: 1.05 }] },
  categoriaIconText: { fontSize: 30 },
  categoriaNome: { fontSize: 12, color: "#666" },
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 15, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  resultCount: { fontSize: 12, color: "#999" },
  seeMore: { color: "#FF6B6B", fontSize: 14 },
  promoCard: { backgroundColor: "#fff", width: 180, marginLeft: 15, borderRadius: 12, padding: 10, elevation: 2 },
  promoImage: { width: "100%", height: 120, borderRadius: 8, marginBottom: 8 },
  promoNome: { fontSize: 14, fontWeight: "500", marginBottom: 5 },
  priceContainer: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  oldPrice: { fontSize: 12, color: "#999", textDecorationLine: "line-through" },
  promoPrice: { fontSize: 16, fontWeight: "bold", color: "#FF6B6B" },
  deliveryTime: { fontSize: 11, color: "#4ECDC4" },
  lancheCard: { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 15, marginBottom: 15, borderRadius: 12, padding: 12, elevation: 2, position: "relative" },
  lancheImage: { width: 100, height: 100, borderRadius: 8 },
  lancheInfo: { flex: 1, marginLeft: 12 },
  lancheNome: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 4 },
  lancheDescricao: { fontSize: 12, color: "#666", marginBottom: 6 },
  categoriaBadge: { backgroundColor: "#f0f0f0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: "flex-start", marginBottom: 6 },
  categoriaBadgeText: { fontSize: 10, color: "#666" },
  ratingContainer: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  rating: { fontSize: 12, fontWeight: "bold", color: "#FFB800", marginRight: 4 },
  ratingCount: { fontSize: 11, color: "#999" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  lanchePreco: { fontSize: 16, fontWeight: "bold", color: "#FF6B6B" },
  promoBadge: { position: "absolute", top: 10, right: 10, backgroundColor: "#FF6B6B", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  promoBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 5 },
  emptySubtext: { fontSize: 12, color: "#999" },
  bottomNav: { flexDirection: "row", backgroundColor: "#fff", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#eee" },
  navItem: { flex: 1, alignItems: "center" },
  navIcon: { fontSize: 24, color: "#999" },
  navText: { fontSize: 12, color: "#999", marginTop: 4 },
  navActive: { color: "#FF6B6B" },
  navActiveText: { color: "#FF6B6B" },
});