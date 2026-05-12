import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  Switch,
} from "react-native";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../database/database";
import * as ImagePicker from "expo-image-picker";
import Checkbox from "expo-checkbox";

export default function EditarLanche({ route, navigation }: any) {
  const { lanche } = route.params;

  const [nome, setNome] = useState(lanche.nome);
  const [preco, setPreco] = useState(String(lanche.preco));
  const [descricao, setDescricao] = useState(lanche.descricao);
  const [imagemUrl, setImagemUrl] = useState(lanche.imagem);
  const [quantidadeDisponivel, setQuantidadeDisponivel] = useState(
    String(lanche.quantidadeDisponivel || 10)
  );
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(
    lanche.categorias || (lanche.categoria ? [lanche.categoria] : ["lanche"])
  );
  const [disponivel, setDisponivel] = useState(lanche.disponivel !== false);
  const [promocao, setPromocao] = useState(lanche.promocao || false);
  const [precoPromocional, setPrecoPromocional] = useState(
    String(lanche.precoPromocional || "")
  );
  const [tempoPreparo, setTempoPreparo] = useState(
    String(lanche.tempoPreparo || "15-25")
  );
  const [ingredientes, setIngredientes] = useState(
    lanche.ingredientes?.join(", ") || ""
  );
  const [localRetirada, setLocalRetirada] = useState(lanche.localRetirada || "");
  
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
          Alert.alert("Sucesso", "Imagem atualizada com sucesso!");
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

  async function atualizarLanche() {
    if (!nome || !preco || !descricao) {
      Alert.alert("Atenção", "Preencha nome, preço e descrição");
      return;
    }
    if (parseFloat(preco) <= 0) {
      Alert.alert("Atenção", "Preço deve ser maior que zero");
      return;
    }
    if (parseInt(quantidadeDisponivel) < 0) {
      Alert.alert("Atenção", "Quantidade disponível não pode ser negativa");
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
      const updateData: any = {
        nome,
        preco: parseFloat(preco),
        descricao,
        imagem: imagemUrl,
        quantidadeDisponivel: parseInt(quantidadeDisponivel),
        categorias: categoriasSelecionadas,
        disponivel,
        promocao,
        tempoPreparo,
        localRetirada,
        atualizadoEm: new Date(),
      };
      if (promocao && precoPromocional) {
        updateData.precoPromocional = parseFloat(precoPromocional);
      }
      if (ingredientes) {
        updateData.ingredientes = ingredientes.split(",").map(i => i.trim());
      }
      await updateDoc(doc(db, "lanches", lanche.id), updateData);
      Alert.alert("Sucesso", "Lanche atualizado com sucesso!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível atualizar o lanche");
    } finally {
      setLoading(false);
    }
  }

  async function excluirLanche() {
    Alert.alert(
      "Excluir Lanche",
      "Tem certeza que deseja excluir este lanche? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, "lanches", lanche.id));
              Alert.alert("Sucesso", "Lanche excluído com sucesso!");
              navigation.goBack();
            } catch (error) {
              console.log("❌ Erro ao excluir lanche:", error);
              Alert.alert("Erro", "Não foi possível excluir o lanche. Tente novamente.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Editar Lanche</Text>
        <TouchableOpacity onPress={excluirLanche} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imageSection}>
        <Image source={{ uri: imagemUrl }} style={styles.previewImage} />
        <TouchableOpacity
          style={styles.changeImageButton}
          onPress={escolherOpcaoImagem}
          disabled={uploadingImage}
        >
          <Text style={styles.changeImageText}>
            {uploadingImage ? "⏳ Enviando..." : "📷 Trocar imagem"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Informações Básicas</Text>
        <Text style={styles.label}>Nome do lanche *</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: X-Burger Especial" />
        <Text style={styles.label}>Preço (R$) *</Text>
        <TextInput style={styles.input} value={preco} onChangeText={setPreco} keyboardType="numeric" placeholder="0,00" />
        <Text style={styles.label}>Descrição *</Text>
        <TextInput style={[styles.input, styles.textArea]} value={descricao} onChangeText={setDescricao} placeholder="Descreva seu lanche..." multiline />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Estoque e Disponibilidade</Text>
        <Text style={styles.label}>Quantidade disponível</Text>
        <TextInput style={styles.input} value={quantidadeDisponivel} onChangeText={setQuantidadeDisponivel} keyboardType="numeric" placeholder="10" />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Lanche disponível para venda</Text>
          <Switch value={disponivel} onValueChange={setDisponivel} trackColor={{ false: "#ddd", true: "#FF6B6B" }} />
        </View>
        <Text style={styles.label}>Tempo de preparo (minutos)</Text>
        <TextInput style={styles.input} value={tempoPreparo} onChangeText={setTempoPreparo} keyboardType="numeric" placeholder="15-25" />
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
        <TextInput style={styles.input} value={ingredientes} onChangeText={setIngredientes} placeholder="Pão, hambúrguer, queijo, alface, tomate (separados por vírgula)" />
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
            <TextInput style={styles.input} value={precoPromocional} onChangeText={setPrecoPromocional} keyboardType="numeric" placeholder="0,00" />
            <Text style={styles.helperText}>O preço original será mostrado riscado</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.saveButton, loading && styles.disabledButton]} onPress={atualizarLanche} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>💾 Salvar Alterações</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  backIcon: { fontSize: 28, color: "#FF6B6B" },
  titulo: { fontSize: 20, fontWeight: "bold", color: "#333" },
  deleteButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  deleteButtonText: { fontSize: 24 },
  imageSection: { backgroundColor: "#fff", alignItems: "center", padding: 20, marginTop: 12 },
  previewImage: { width: 150, height: 150, borderRadius: 15, marginBottom: 15, resizeMode: "cover" },
  changeImageButton: { backgroundColor: "#f5f5f5", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  changeImageText: { color: "#FF6B6B", fontWeight: "500" },
  section: { backgroundColor: "#fff", marginTop: 12, paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 16 },
  label: { fontSize: 14, color: "#666", marginBottom: 8, marginTop: 12, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: "#fff" },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  switchLabel: { fontSize: 16, color: "#333" },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  checkboxLabel: { fontSize: 16, marginLeft: 12, color: "#333" },
  helperText: { fontSize: 11, color: "#999", marginTop: 5 },
  buttonContainer: { padding: 20, marginBottom: 30 },
  saveButton: { backgroundColor: "#27ae60", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cancelButton: { backgroundColor: "#f5f5f5", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  cancelButtonText: { color: "#666", fontSize: 16 },
  disabledButton: { opacity: 0.7 },
});