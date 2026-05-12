import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { auth, db } from "../database/database";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, deleteDoc, orderBy } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut, updateProfile } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";

export default function Perfil({ navigation }: any) {
  const [userData, setUserData] = useState<any>({});
  const [editando, setEditando] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState("perfil");
  const [refreshing, setRefreshing] = useState(false);
  
  // Dados do vendedor
  const [meusLanches, setMeusLanches] = useState<any[]>([]);
  const [pedidosRecebidos, setPedidosRecebidos] = useState<any[]>([]);
  const [avaliacoesRecebidas, setAvaliacoesRecebidas] = useState<any[]>([]);
  const [graficos, setGraficos] = useState({
    pedidosHoje: 0,
    pedidosSemana: 0,
    lucroEstimado: 0,
  });

  const IMGBB_API_KEY = "14ec2963cb8fc44320d0674c7be38801";

  useEffect(() => {
    carregarDadosUsuario();
    carregarDadosVendedor();
  }, []);

  async function carregarDadosUsuario() {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, "usuarios", auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      } else {
        const newUserData = {
          nome: auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "Aluno",
          email: auth.currentUser.email,
          telefone: "Não informado",
          fotoPerfil: auth.currentUser.photoURL || null,
          pontos: 0,
          criadoEm: new Date(),
          tipo: "aluno",
        };
        await setDoc(userRef, newUserData);
        setUserData(newUserData);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  async function carregarDadosVendedor() {
    if (!auth.currentUser) return;
    try {
      const lanchesQuery = query(collection(db, "lanches"), where("userId", "==", auth.currentUser.uid));
      const lanchesSnap = await getDocs(lanchesQuery);
      const lanchesLista = lanchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeusLanches(lanchesLista);

      const pedidosQuery = query(collection(db, "pedidos"), where("vendedorId", "==", auth.currentUser.uid), orderBy("criadoEm", "desc"));
      const pedidosSnap = await getDocs(pedidosQuery);
      const pedidosLista = pedidosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidosRecebidos(pedidosLista);

      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      const pedidosHoje = pedidosLista.filter(p => p.criadoEm?.toDate() >= hoje && p.status === "finalizado").length;
      const pedidosSemana = pedidosLista.filter(p => p.criadoEm?.toDate() >= inicioSemana && p.status === "finalizado").length;
      const lucroEstimado = pedidosLista.filter(p => p.status === "finalizado").reduce((sum, p) => sum + p.total, 0);
      setGraficos({ pedidosHoje, pedidosSemana, lucroEstimado });

      const avaliacoesQuery = query(collection(db, "avaliacoes_vendedor"), where("vendedorId", "==", auth.currentUser.uid), orderBy("criadoEm", "desc"));
      const avaliacoesSnap = await getDocs(avaliacoesQuery);
      setAvaliacoesRecebidas(avaliacoesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.log(error);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([carregarDadosUsuario(), carregarDadosVendedor()]);
    setRefreshing(false);
  };

  function escolherOpcaoImagem() {
    Alert.alert("Foto de Perfil", "De onde você quer pegar a foto?", [
      { text: "Cancelar", style: "cancel" },
      { text: "📷 Tirar Foto (Câmera)", onPress: () => processarImagem('camera') },
      { text: "🖼️ Abrir Galeria", onPress: () => processarImagem('galeria') }
    ]);
  }

  const processarImagem = async (origem: 'camera' | 'galeria') => {
    if (!auth.currentUser) return;
    try {
      let result;
      const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true };
      if (origem === 'camera') {
        const permissao = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissao.granted) { Alert.alert("Atenção", "Permissão para usar a câmera é necessária"); return; }
        result = await ImagePicker.launchCameraAsync(opcoes);
      } else {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissao.granted) { Alert.alert("Atenção", "Permissão para acessar a galeria é necessária"); return; }
        result = await ImagePicker.launchImageLibraryAsync(opcoes);
      }
      if (!result.canceled && result.assets[0].base64) {
        setUploadingImage(true);
        const formData = new FormData(); formData.append('image', result.assets[0].base64);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
          const downloadUrl = data.data.url;
          const userRef = doc(db, "usuarios", auth.currentUser.uid);
          await updateDoc(userRef, { fotoPerfil: downloadUrl });
          await updateProfile(auth.currentUser, { photoURL: downloadUrl });
          setUserData((prev: any) => ({ ...prev, fotoPerfil: downloadUrl }));
          Alert.alert("Sucesso", "Foto de perfil atualizada!");
        } else Alert.alert("Erro", "Falha ao fazer upload");
      }
    } catch (error) { console.error(error); Alert.alert("Erro", "Falha ao anexar imagem."); } finally { setUploadingImage(false); }
  };

  async function atualizarPerfil() {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, "usuarios", auth.currentUser.uid);
      await updateDoc(userRef, { nome: userData.nome, telefone: userData.telefone });
      await updateProfile(auth.currentUser, { displayName: userData.nome });
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
      setEditando(false);
    } catch (error) { Alert.alert("Erro", "Não foi possível atualizar o perfil"); }
  }

  async function alterarSenha() {
    if (!auth.currentUser) return;
    if (novaSenha !== confirmarSenha) { Alert.alert("Erro", "As senhas não coincidem"); return; }
    if (novaSenha.length < 6) { Alert.alert("Erro", "A senha deve ter no mínimo 6 caracteres"); return; }
    if (!senhaAtual) { Alert.alert("Erro", "Digite sua senha atual"); return; }
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, senhaAtual);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, novaSenha);
      Alert.alert("Sucesso", "Senha alterada com sucesso!");
      setShowPasswordModal(false);
      setNovaSenha(""); setConfirmarSenha(""); setSenhaAtual("");
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') Alert.alert("Erro", "Senha atual incorreta");
      else Alert.alert("Erro", "Não foi possível alterar a senha");
    }
  }

  async function limparPedidosAntigos() {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);
    
    try {
      const q = query(
        collection(db, "pedidos"),
        where("status", "in", ["finalizado", "cancelado"]),
        where("criadoEm", "<", dataLimite)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        Alert.alert("Info", "Não há pedidos antigos para remover.");
        return;
      }
      
      const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(promises);
      
      Alert.alert("Limpeza concluída", `${snapshot.size} pedidos removidos com sucesso.`);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível limpar os pedidos antigos.");
    }
  }

  function confirmarLimpeza() {
    Alert.alert(
      "Limpar pedidos antigos",
      "Esta ação irá remover permanentemente todos os pedidos finalizados ou cancelados com mais de 30 dias.\n\nEsta operação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Limpar", 
          style: "destructive",
          onPress: limparPedidosAntigos 
        }
      ]
    );
  }

  function handleLogout() {
    Alert.alert("Sair do App", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => signOut(auth).then(() => navigation.replace("Login")).catch(() => Alert.alert("Erro", "Não foi possível sair")) }
    ]);
  }

  function formatarData(data: any) {
    if (!data) return "Data não disponível";
    try {
      if (data.toDate) return data.toDate().toLocaleDateString("pt-BR");
      return new Date(data).toLocaleDateString("pt-BR");
    } catch { return "Data inválida"; }
  }

  const isAdmin = userData.papel === "admin";

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FF6B6B" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={escolherOpcaoImagem} disabled={uploadingImage} activeOpacity={0.8}>
          {userData.fotoPerfil ? <Image source={{ uri: userData.fotoPerfil }} style={styles.avatarImage} /> : <View style={styles.avatarContainer}><Text style={styles.avatarText}>{userData.nome?.charAt(0).toUpperCase() || "U"}</Text></View>}
          {uploadingImage && <View style={styles.uploadOverlay}><ActivityIndicator size="small" color="#fff" /></View>}
          <View style={styles.cameraIconContainer}><Text style={styles.cameraIcon}>📷</Text></View>
        </TouchableOpacity>
        <Text style={styles.nome}>{userData.nome || "Aluno IFSul"}</Text>
        <Text style={styles.email}>{auth.currentUser?.email}</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === "perfil" && styles.tabActive]} onPress={() => setActiveTab("perfil")}>
          <Text style={[styles.tabText, activeTab === "perfil" && styles.tabTextActive]}>Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "vendedor" && styles.tabActive]} onPress={() => setActiveTab("vendedor")}>
          <Text style={[styles.tabText, activeTab === "vendedor" && styles.tabTextActive]}>👨‍🍳 Modo Vendedor</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B6B"]} />}>
        {activeTab === "perfil" && (
          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📋 Informações Pessoais</Text>
                <TouchableOpacity onPress={() => setEditando(!editando)}><Text style={styles.editButton}>{editando ? "Cancelar" : "✏️ Editar"}</Text></TouchableOpacity>
              </View>
              {editando ? (
                <View>
                  <Text style={styles.label}>Nome completo</Text>
                  <TextInput style={styles.input} value={userData.nome} onChangeText={(text) => setUserData({ ...userData, nome: text })} placeholder="Seu nome" />
                  <Text style={styles.label}>Telefone</Text>
                  <TextInput style={styles.input} value={userData.telefone} onChangeText={(text) => setUserData({ ...userData, telefone: text })} keyboardType="phone-pad" placeholder="(00) 00000-0000" />
                  <TouchableOpacity style={styles.saveButton} onPress={atualizarPerfil}><Text style={styles.saveButtonText}>Salvar alterações</Text></TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>👤 Nome</Text><Text style={styles.infoValue}>{userData.nome || "Não informado"}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>📱 Telefone</Text><Text style={styles.infoValue}>{userData.telefone || "Não informado"}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>📧 E-mail</Text><Text style={styles.infoValue}>{auth.currentUser?.email}</Text></View>
                  <TouchableOpacity style={styles.passwordButton} onPress={() => setShowPasswordModal(true)}><Text style={styles.passwordButtonText}>🔒 Alterar senha</Text></TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Sua Atividade</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}><Text style={styles.statNumber}>{pedidosRecebidos.length}</Text><Text style={styles.statLabel}>Compras realizadas</Text></View>
                <View style={styles.statItem}><Text style={styles.statNumber}>{meusLanches.length}</Text><Text style={styles.statLabel}>Lanches anunciados</Text></View>
                <View style={styles.statItem}><Text style={styles.statNumber}>⭐ {(userData.avaliacaoMedia || 4.5).toFixed(1)}</Text><Text style={styles.statLabel}>Avaliação média</Text></View>
              </View>
            </View>

            {meusLanches.length > 0 && (
              <TouchableOpacity style={styles.vendorButton} onPress={() => navigation.navigate("PainelVendedor")}>
                <Text style={styles.vendorButtonText}>👨‍🍳 Abrir Painel do Vendedor</Text>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <TouchableOpacity style={styles.adminButton} onPress={confirmarLimpeza}>
                <Text style={styles.adminButtonText}>🧹 Limpar pedidos antigos (admin)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>🚪 SAIR DO APP</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "vendedor" && (
          <View style={styles.content}>
            {meusLanches.length === 0 ? (
              <View style={styles.emptyVendorCard}>
                <Text style={styles.emptyIcon}>🍔</Text>
                <Text style={styles.emptyTitle}>Você ainda não é um vendedor</Text>
                <Text style={styles.emptyText}>Comece a vender seus lanches para outros alunos do IFSul!</Text>
                <TouchableOpacity style={styles.startSellingButton} onPress={() => navigation.navigate("CriarLanche")}>
                  <Text style={styles.startSellingText}>+ Criar meu primeiro lanche</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📈 Desempenho do Vendedor</Text>
                  <View style={styles.metricsContainer}>
                    <View style={styles.metricCard}><Text style={styles.metricValue}>{graficos.pedidosHoje}</Text><Text style={styles.metricLabel}>Pedidos hoje</Text></View>
                    <View style={styles.metricCard}><Text style={styles.metricValue}>{graficos.pedidosSemana}</Text><Text style={styles.metricLabel}>Pedidos esta semana</Text></View>
                    <View style={styles.metricCard}><Text style={styles.metricValue}>R$ {graficos.lucroEstimado}</Text><Text style={styles.metricLabel}>Lucro estimado</Text></View>
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}><Text style={styles.cardTitle}>🍔 Meus Lanches ({meusLanches.length})</Text><TouchableOpacity onPress={() => navigation.navigate("CriarLanche")}><Text style={styles.addButton}>+ Adicionar</Text></TouchableOpacity></View>
                  {meusLanches.map((lanche) => (
                    <View key={lanche.id} style={styles.lancheItem}>
                      <Image source={{ uri: lanche.imagem }} style={styles.lancheImage} />
                      <View style={styles.lancheInfo}>
                        <Text style={styles.lancheName}>{lanche.nome}</Text>
                        <Text style={styles.lanchePrice}>R$ {lanche.preco}</Text>
                        <Text style={styles.lancheOrders}>{pedidosRecebidos.filter(p => p.lanches?.some((l: any) => l.id === lanche.id)).length} pedidos</Text>
                      </View>
                      <TouchableOpacity style={styles.editLancheButton} onPress={() => navigation.navigate("EditarLanche", { lanche })}><Text style={styles.editLancheText}>✏️</Text></TouchableOpacity>
                    </View>
                  ))}
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📦 Pedidos Recebidos</Text>
                  {pedidosRecebidos.length === 0 ? <Text style={styles.emptyText}>Nenhum pedido recebido ainda</Text> : pedidosRecebidos.slice(0,5).map((pedido) => (
                    <View key={pedido.id} style={styles.pedidoItem}>
                      <View style={styles.pedidoHeader}><Text style={styles.pedidoId}>Pedido #{pedido.id.slice(-6)}</Text><Text style={[styles.pedidoStatus, pedido.status === "finalizado" && styles.statusSuccess, pedido.status === "pendente" && styles.statusPending]}>{pedido.status === "finalizado" ? "✅ Finalizado" : "⏳ Pendente"}</Text></View>
                      <Text style={styles.pedidoDate}>{formatarData(pedido.criadoEm)}</Text>
                      <Text style={styles.pedidoTotal}>Total: R$ {pedido.total}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>⭐ Avaliações dos Clientes</Text>
                  {avaliacoesRecebidas.length === 0 ? <Text style={styles.emptyText}>Nenhuma avaliação recebida ainda</Text> : avaliacoesRecebidas.slice(0,5).map((avaliacao, idx) => (
                    <View key={idx} style={styles.avaliacaoItem}>
                      <View style={styles.avaliacaoHeader}><Text style={styles.avaliacaoStars}>{"★".repeat(Math.floor(avaliacao.nota))}{"☆".repeat(5 - Math.floor(avaliacao.nota))}</Text><Text style={styles.avaliacaoNota}>{avaliacao.nota.toFixed(1)}</Text></View>
                      {avaliacao.comentario && <Text style={styles.avaliacaoComentario}>"{avaliacao.comentario}"</Text>}
                      <Text style={styles.avaliacaoDate}>{formatarData(avaliacao.criadoEm)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alterar senha</Text>
            <TextInput style={styles.input} placeholder="Senha atual" secureTextEntry value={senhaAtual} onChangeText={setSenhaAtual} />
            <TextInput style={styles.input} placeholder="Nova senha" secureTextEntry value={novaSenha} onChangeText={setNovaSenha} />
            <TextInput style={styles.input} placeholder="Confirmar nova senha" secureTextEntry value={confirmarSenha} onChangeText={setConfirmarSenha} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setShowPasswordModal(false); setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha(""); }}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={alterarSenha}><Text style={styles.confirmButtonText}>Alterar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#FF6B6B", paddingTop: 50, paddingBottom: 30, alignItems: "center", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", marginBottom: 12, elevation: 5 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 3, borderColor: "#fff" },
  avatarText: { fontSize: 36, fontWeight: "bold", color: "#FF6B6B" },
  cameraIconContainer: { position: "absolute", bottom: 10, right: 10, backgroundColor: "#fff", borderRadius: 15, padding: 4, elevation: 3 },
  cameraIcon: { fontSize: 16 },
  uploadOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 40, justifyContent: "center", alignItems: "center" },
  nome: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  email: { fontSize: 14, color: "#fff", opacity: 0.9 },
  tabsContainer: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 20, elevation: 2 },
  tab: { flex: 1, paddingVertical: 15, alignItems: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: "#FF6B6B" },
  tabText: { fontSize: 16, color: "#999" },
  tabTextActive: { color: "#FF6B6B", fontWeight: "bold" },
  content: { padding: 20 },
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 20, marginBottom: 20, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  editButton: { color: "#FF6B6B", fontSize: 14 },
  label: { fontSize: 14, color: "#666", marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 10, backgroundColor: "#fff" },
  saveButton: { backgroundColor: "#FF6B6B", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 10 },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  infoLabel: { fontSize: 15, color: "#666" },
  infoValue: { fontSize: 15, color: "#333", fontWeight: "500" },
  passwordButton: { marginTop: 15, padding: 12, backgroundColor: "#f5f5f5", borderRadius: 10, alignItems: "center" },
  passwordButtonText: { color: "#FF6B6B", fontSize: 15, fontWeight: "500" },
  statsGrid: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "bold", color: "#FF6B6B" },
  statLabel: { fontSize: 12, color: "#999", marginTop: 5 },
  vendorButton: { backgroundColor: "#FF6B6B", padding: 15, borderRadius: 10, marginBottom: 15, alignItems: "center" },
  vendorButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  adminButton: { backgroundColor: "#6c5ce7", padding: 15, borderRadius: 10, marginBottom: 15, alignItems: "center" },
  adminButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  logoutButton: { backgroundColor: "#e74c3c", padding: 15, borderRadius: 10, marginBottom: 20, alignItems: "center" },
  logoutButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  emptyVendorCard: { backgroundColor: "#fff", borderRadius: 15, padding: 30, alignItems: "center", marginBottom: 20 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 10 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", marginBottom: 20 },
  startSellingButton: { backgroundColor: "#FF6B6B", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  startSellingText: { color: "#fff", fontWeight: "bold" },
  metricsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  metricCard: { flex: 1, alignItems: "center", backgroundColor: "#f8f8f8", padding: 12, borderRadius: 10, marginHorizontal: 5 },
  metricValue: { fontSize: 20, fontWeight: "bold", color: "#FF6B6B" },
  metricLabel: { fontSize: 11, color: "#999", marginTop: 5, textAlign: "center" },
  addButton: { color: "#FF6B6B", fontWeight: "bold" },
  lancheItem: { flexDirection: "row", marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  lancheImage: { width: 60, height: 60, borderRadius: 10 },
  lancheInfo: { flex: 1, marginLeft: 12 },
  lancheName: { fontSize: 16, fontWeight: "500", color: "#333" },
  lanchePrice: { fontSize: 14, color: "#FF6B6B", marginTop: 4 },
  lancheOrders: { fontSize: 12, color: "#999", marginTop: 4 },
  editLancheButton: { justifyContent: "center", paddingHorizontal: 10 },
  editLancheText: { fontSize: 20 },
  pedidoItem: { marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  pedidoHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  pedidoId: { fontSize: 14, fontWeight: "500", color: "#666" },
  pedidoStatus: { fontSize: 12, fontWeight: "500" },
  statusSuccess: { color: "#27ae60" },
  statusPending: { color: "#FFB800" },
  pedidoDate: { fontSize: 12, color: "#999", marginBottom: 5 },
  pedidoTotal: { fontSize: 14, fontWeight: "bold", color: "#333" },
  avaliacaoItem: { marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  avaliacaoHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  avaliacaoStars: { fontSize: 16, color: "#FFB800" },
  avaliacaoNota: { fontSize: 14, fontWeight: "bold", color: "#FFB800" },
  avaliacaoComentario: { fontSize: 14, color: "#666", marginBottom: 5, fontStyle: "italic" },
  avaliacaoDate: { fontSize: 11, color: "#999" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", borderRadius: 20, padding: 25, width: "90%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  modalButton: { flex: 1, padding: 12, borderRadius: 10, marginHorizontal: 5 },
  cancelButton: { backgroundColor: "#f5f5f5" },
  cancelButtonText: { color: "#666", textAlign: "center" },
  confirmButton: { backgroundColor: "#FF6B6B" },
  confirmButtonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});