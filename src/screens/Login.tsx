import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../database/database";
import { useNavigation } from "@react-navigation/native";

export default function Login() {
  const navigation = useNavigation();
  const [email, setEmail] = useState<string>("");
  const [senha, setSenha] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isNavigatorReady, setIsNavigatorReady] = useState(false);
  const navigationTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    navigationTimeout.current = setTimeout(() => setIsNavigatorReady(true), 500);
    return () => {
      if (navigationTimeout.current) clearTimeout(navigationTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!isNavigatorReady) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified && navigation?.replace) {
        navigation.replace("Home");
      }
    });
    return unsubscribe;
  }, [isNavigatorReady]);

  async function fazerLogin() {
    if (email === "" || senha === "") {
      Alert.alert("Atenção", "Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      // Verifica se o e-mail foi confirmado
      if (!user.emailVerified) {
        Alert.alert(
          "E-mail não verificado",
          "Por favor, verifique seu e-mail (incluindo spam) e clique no link de confirmação antes de fazer login."
        );
        setLoading(false);
        return;
      }

      if (navigation?.replace) navigation.replace("Home");
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        Alert.alert("Erro", "Email ou senha inválidos");
      } else if (error.code === 'auth/user-not-found') {
        Alert.alert("Erro", "Usuário não encontrado");
      } else {
        Alert.alert("Erro", "Não foi possível fazer login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function esqueciSenha() {
    if (!email) {
      Alert.alert("Atenção", "Digite seu e-mail para recuperar a senha");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "E-mail enviado",
        "Enviamos um link de redefinição de senha para o seu e-mail. Verifique sua caixa de entrada (e spam)."
      );
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        Alert.alert("Erro", "Nenhum usuário encontrado com este e-mail");
      } else {
        Alert.alert("Erro", "Não foi possível enviar o e-mail de recuperação");
      }
    } finally {
      setLoading(false);
    }
  }

  function irParaCadastro() {
    if (navigation?.navigate) navigation.navigate("Cadastro");
    else Alert.alert("Aguarde", "O aplicativo está carregando, tente novamente em alguns segundos");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🍔</Text>
          </View>
          <Text style={styles.titulo}>IF-aminto</Text>
          <Text style={styles.subtitulo}>Comida caseira feita por alunos do IFSul</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>📧</Text>
            <TextInput
              style={styles.input}
              placeholder="E-mail"
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
              placeholder="Senha"
              secureTextEntry={!showPassword}
              value={senha}
              onChangeText={setSenha}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.esqueciSenha} onPress={esqueciSenha}>
            <Text style={styles.esqueciSenhaText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, loading && styles.botaoDisabled]}
            onPress={fazerLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Entrar</Text>}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.botaoCadastro} onPress={irParaCadastro}>
            <Text style={styles.botaoCadastroTexto}>Criar nova conta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Ao continuar, você concorda com os{"\n"}
            <Text style={styles.footerLink}>Termos de uso</Text> e{" "}
            <Text style={styles.footerLink}>Política de privacidade</Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FF6B6B" },
  content: { flex: 1, justifyContent: "space-between", paddingHorizontal: 25, paddingVertical: 50 },
  logoContainer: { alignItems: "center", marginTop: 40 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", marginBottom: 20, elevation: 10 },
  logoEmoji: { fontSize: 50 },
  titulo: { fontSize: 36, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  subtitulo: { fontSize: 14, color: "#fff", textAlign: "center", opacity: 0.9 },
  formContainer: { backgroundColor: "#fff", borderRadius: 25, padding: 20, elevation: 5 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, backgroundColor: "#fafafa" },
  inputIcon: { fontSize: 20, marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#333", opacity: 0.9 },
  eyeIcon: { fontSize: 20, color: "#999" },
  esqueciSenha: { alignSelf: "flex-end", marginBottom: 20 },
  esqueciSenhaText: { color: "#FF6B6B", fontSize: 13 },
  botao: { backgroundColor: "#FF6B6B", paddingVertical: 15, borderRadius: 12, alignItems: "center", marginBottom: 15 },
  botaoDisabled: { opacity: 0.7 },
  botaoTexto: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e0e0e0" },
  dividerText: { marginHorizontal: 15, color: "#999", fontSize: 14 },
  botaoCadastro: { borderWidth: 1, borderColor: "#FF6B6B", paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  botaoCadastroTexto: { color: "#FF6B6B", fontSize: 16, fontWeight: "500" },
  footer: { alignItems: "center", marginBottom: 20 },
  footerText: { color: "#fff", fontSize: 12, textAlign: "center", opacity: 0.8 },
  footerLink: { textDecorationLine: "underline", fontWeight: "bold" },
});