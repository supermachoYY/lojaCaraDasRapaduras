import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
  Image,
} from "react-native";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../database/database";
import * as ImagePicker from "expo-image-picker";
import Checkbox from "expo-checkbox";

export default function CriarLanche({ navigation }: any) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [quantidadeDisponivel, setQuantidadeDisponivel] = useState("10");
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [tempoPreparo, setTempoPreparo] = useState("15-25");
  const [ingredientes, setIngredientes] = useState("");
  const [promocao, setPromocao] = useState(false);
  const [localRetirada, setLocalRetirada] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const IMGBB_API_KEY = "14ec2963cb8fc44320d0674c7be38801";

  const opcoesCategorias = [
    { id: "lanche", label: "🍔 Salgado", cor: "#FF6B6B" },
    { id: "doce", label: "🍰 Doce", cor: "#FFE66D" },
    { id: "bebida", label: "🥤 Bebida", cor: "#4ECDC4" },
  ];

  function toggleCategoria(catId: string) {
    setCategoriasSelecionadas(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  }

  function escolherOpcaoImagem() {
    Alert.alert(
      "Imagem do Lanche",
      "De onde você quer pegar a foto?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "📷 Tirar Foto (Câmera)", onPress: () => processarImagem('camera') },
        { text: "🖼️ Abrir Galeria", onPress: () => processarImagem('galeria') }
      ]
    );
  }

  const processarImagem = async (origem: 'camera' | 'galeria') => {
    try {
      let result;
      const opcoes: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      };
      if (origem === 'camera') {
        const permissao = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissao.granted) {
          Alert.alert("Atenção", "Precisa de permissão para usar a câmera");
          return;
        }
        result = await ImagePicker.launchCameraAsync(opcoes);
      } else {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissao.granted) {
          Alert.alert("Atenção", "Precisa de permissão para acessar a galeria");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(opcoes);
      }
      if (!result.canceled && result.assets[0].base64) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('image', result.assets[0].base64);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          const url = data.data.url;
          setImagemUrl(url);
          Alert.alert("Sucesso", "Imagem carregada com sucesso!");
        } else {
          Alert.alert("Erro", "Falha ao fazer upload da imagem");
        }
      }
    } catch (error) {
      console.error("Erro no upload: ", error);
      Alert.alert("Erro", "Não foi possível processar a imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  async function salvarLanche() {
    if (!nome || !preco || !descricao) {
      Alert.alert("Erro", "Preencha nome, preço e descrição");
      return;
    }
    if (parseFloat(preco) <= 0) {
      Alert.alert("Erro", "Preço deve ser maior que zero");
      return;
    }
    if (!auth.currentUser) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }
    if (!imagemUrl) {
      Alert.alert("Erro", "Selecione uma imagem para o lanche");
      return;
    }
    if (!localRetirada) {
      Alert.alert("Erro", "Informe o local de retirada do lanche");
      return;
    }
    if (categoriasSelecionadas.length === 0) {
      Alert.alert("Erro", "Selecione pelo menos uma categoria");
      return;
    }

    setLoading(true);
    try {
      const lancheData: any = {
        nome,
        preco: parseFloat(preco),
        descricao,
        imagem: imagemUrl,
        quantidadeDisponivel: parseInt(quantidadeDisponivel),
        categorias: categoriasSelecionadas,
        disponivel: true,
        promocao,
        tempoPreparo,
        localRetirada,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        userId: auth.currentUser.uid,
        mediaAvaliacao: 0,
        totalAvaliacoes: 0,
      };
      if (promocao && precoPromocional) {
        lancheData.precoPromocional = parseFloat(precoPromocional);
      }
      if (ingredientes) {
        lancheData.ingredientes = ingredientes.split(",").map(i => i.trim());
      }
      await addDoc(collection(db, "lanches"), lancheData);
      Alert.alert("Sucesso!", "Lanche criado com sucesso! 🍔");
      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível salvar o lanche");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Criar Lanche</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.imageSection}>
        {imagemUrl ? (
          <Image source={{ uri: imagemUrl }} style={styles.previewImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>🍔</Text>
            <Text style={styles.imagePlaceholderText}>Nenhuma imagem selecionada</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.changeImageButton}
          onPress={escolherOpcaoImagem}
          disabled={uploadingImage}
        >
          <Text style={styles.changeImageText}>
            {uploadingImage ? "⏳ Enviando..." : 
             imagemUrl ? "🔄 Trocar imagem" : "📷 Selecionar imagem"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Informações Básicas</Text>
        <Text style={styles.label}>Nome do lanche *</Text>
        <TextInput style={styles.input} placeholder="Ex: X-Burger Especial" value={nome} onChangeText={setNome} />
        <Text style={styles.label}>Preço (R$) *</Text>
        <TextInput style={styles.input} placeholder="0,00" value={preco} onChangeText={setPreco} keyboardType="numeric" />
        <Text style={styles.label}>Descrição *</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Descreva seu lanche..." value={descricao} onChangeText={setDescricao} multiline />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Estoque</Text>
        <Text style={styles.label}>Quantidade disponível</Text>
        <TextInput style={styles.input} placeholder="10" value={quantidadeDisponivel} onChangeText={setQuantidadeDisponivel} keyboardType="numeric" />
        <Text style={styles.label}>Tempo de preparo (minutos)</Text>
        <TextInput style={styles.input} placeholder="15-25" value={tempoPreparo} onChangeText={setTempoPreparo} keyboardType="numeric" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏷️ Categorias (pode escolher mais de uma)</Text>
        {opcoesCategorias.map(cat => (
          <View key={cat.id} style={styles.checkboxRow}>
            <Checkbox
              value={categoriasSelecionadas.includes(cat.id)}
              onValueChange={() => toggleCategoria(cat.id)}
              color={categoriasSelecionadas.includes(cat.id) ? cat.cor : undefined}
            />
            <Text style={styles.checkboxLabel}>{cat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🥗 Ingredientes</Text>
        <TextInput style={styles.input} placeholder="Pão, hambúrguer, queijo, alface, tomate" value={ingredientes} onChangeText={setIngredientes} />
        <Text style={styles.helperText}>Separe os ingredientes por vírgula</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Local de Retirada</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Cantina do IFSul, Sala 101 / Rua das Flores, 123"
          value={localRetirada}
          onChangeText={setLocalRetirada}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>🎯 Ativar promoção</Text>
          <Switch value={promocao} onValueChange={setPromocao} trackColor={{ false: "#ddd", true: "#FF6B6B" }} />
        </View>
        {promocao && (
          <View>
            <Text style={styles.label}>Preço promocional (R$)</Text>
            <TextInput style={styles.input} placeholder="0,00" value={precoPromocional} onChangeText={setPrecoPromocional} keyboardType="numeric" />
          </View>
        )}
      </View>

      <TouchableOpacity style={[styles.botaoSalvar, loading && styles.botaoDisabled]} onPress={salvarLanche} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>🍔 Criar Lanche</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  backIcon: { fontSize: 28, color: "#FF6B6B" },
  titulo: { fontSize: 20, fontWeight: "bold", color: "#333" },
  imageSection: { backgroundColor: "#fff", alignItems: "center", padding: 20, marginTop: 12 },
  previewImage: { width: 200, height: 150, borderRadius: 12, resizeMode: "cover" },
  imagePlaceholder: { width: 200, height: 150, borderRadius: 12, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  imagePlaceholderIcon: { fontSize: 40, marginBottom: 8 },
  imagePlaceholderText: { fontSize: 12, color: "#999" },
  changeImageButton: { backgroundColor: "#f5f5f5", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, marginTop: 12 },
  changeImageText: { color: "#FF6B6B", fontWeight: "500" },
  section: { backgroundColor: "#fff", marginTop: 12, paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 16 },
  label: { fontSize: 14, color: "#666", marginBottom: 8, marginTop: 12, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: "#fff", color: "#333" },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  switchLabel: { fontSize: 16, color: "#333" },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  checkboxLabel: { fontSize: 16, marginLeft: 12, color: "#333" },
  helperText: { fontSize: 11, color: "#999", marginTop: 5 },
  botaoSalvar: { backgroundColor: "#FF6B6B", margin: 20, paddingVertical: 16, borderRadius: 12, alignItems: "center", elevation: 3 },
  botaoDisabled: { opacity: 0.7 },
  botaoTexto: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});