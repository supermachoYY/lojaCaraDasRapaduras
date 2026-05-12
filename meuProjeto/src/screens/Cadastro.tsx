import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../database/database";
import { useNavigation } from "@react-navigation/native";

export default function Cadastro() {
  const navigation = useNavigation();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function cadastrar() {
    if (!nome || !telefone || !email || !senha) {
      Alert.alert("Atenção", "Preencha todos os campos");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      Alert.alert("Atenção", "Digite um e-mail válido");
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert("Atenção", "As senhas não coincidem");
      return;
    }
    if (senha.length < 6) {
      Alert.alert("Atenção", "A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (telefone.length < 10) {
      Alert.alert("Atenção", "Digite um telefone válido com DDD");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      // Define o nome de exibição no Firebase Auth
      await updateProfile(user, { displayName: nome });

      await sendEmailVerification(user);
      await setDoc(doc(db, "usuarios", user.uid), {
        nome,
        telefone,
        email,
        criadoEm: new Date(),
        tipo: "aluno",
        pontos: 0,
        emailVerificado: false,
      });

      Alert.alert(
        "Verifique seu e-mail",
        "Enviamos um link de confirmação para o seu e-mail.\n\nApós confirmar, faça login no aplicativo.",
        [{ text: "OK", onPress: () => navigation.replace("Login") }]
      );
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use')
        Alert.alert("Erro", "Este e-mail já está cadastrado");
      else if (error.code === 'auth/invalid-email')
        Alert.alert("Erro", "E-mail inválido");
      else if (error.code === 'auth/weak-password')
        Alert.alert("Erro", "Senha muito fraca. Use pelo menos 6 caracteres");
      else
        Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <Text style={styles.titulo}>Criar conta</Text>
            <Text style={styles.subtitulo}>Faça parte da comunidade IF-aminto</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                value={nome}
                onChangeText={setNome}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                style={styles.input}
                placeholder="Telefone (com DDD) ex: 51999999999"
                value={telefone}
                onChangeText={setTelefone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                style={styles.input}
                placeholder="seuemail@exemplo.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Senha (mínimo 6 caracteres)"
                secureTextEntry={!showPassword}
                value={senha}
                onChangeText={setSenha}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirmar senha"
                secureTextEntry={!showConfirmPassword}
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Text style={styles.eyeIcon}>{showConfirmPassword ? "👁️" : "👁️‍🗨️"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.botao, loading && styles.botaoDisabled]}
              onPress={cadastrar}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Cadastrar</Text>}
            </TouchableOpacity>

            <View style={styles.termosContainer}>
              <Text style={styles.termosText}>
                Ao se cadastrar, você concorda com nossos{"\n"}
                <Text style={styles.termosLink}>Termos de Serviço</Text> e{" "}
                <Text style={styles.termosLink}>Política de Privacidade</Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backIcon: { fontSize: 28, color: "#FF6B6B", marginRight: 5 },
  backText: { fontSize: 16, color: "#FF6B6B" },
  headerContainer: { marginBottom: 30 },
  titulo: { fontSize: 32, fontWeight: "bold", color: "#333", marginBottom: 8 },
  subtitulo: { fontSize: 14, color: "#999" },
  formContainer: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 3 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, backgroundColor: "#fafafa" },
  inputIcon: { fontSize: 20, marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#333" },
  eyeIcon: { fontSize: 20, color: "#999" },
  botao: { backgroundColor: "#FF6B6B", paddingVertical: 15, borderRadius: 12, alignItems: "center", marginTop: 10, marginBottom: 20 },
  botaoDisabled: { opacity: 0.7 },
  botaoTexto: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  termosContainer: { alignItems: "center" },
  termosText: { fontSize: 12, color: "#999", textAlign: "center" },
  termosLink: { color: "#FF6B6B", textDecorationLine: "underline" },
});