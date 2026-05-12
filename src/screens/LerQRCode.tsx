import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../database/database";

export default function LerQRCode({ route, navigation }: any) {
  const pedidoId = route.params?.pedidoId;
  const codigoEsperado = route.params?.codigoNumerico;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [usandoCodigo, setUsandoCodigo] = useState(false);
  const qrLock = useRef(false);

  async function finalizarPedido(id: string) {
    const pedidoRef = doc(db, "pedidos", id);
    const pedidoSnap = await getDoc(pedidoRef);
    if (!pedidoSnap.exists()) {
      Alert.alert("Erro", "Pedido não encontrado");
      return false;
    }
    const pedido = pedidoSnap.data();
    if (pedido.status === "finalizado") {
      Alert.alert("Aviso", "Este pedido já foi finalizado");
      return false;
    }
    await updateDoc(pedidoRef, { status: "finalizado", retiradoEm: new Date() });
    return true;
  }

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned || loading || qrLock.current) return;
    qrLock.current = true;
    setScanned(true);
    setLoading(true);
    try {
      const qrData = JSON.parse(data);
      const { pedidoId: id, vendedorId } = qrData;
      if (auth.currentUser?.uid !== vendedorId) {
        Alert.alert("Erro", "Este QR Code não pertence aos seus produtos");
        setScanned(false);
        setLoading(false);
        qrLock.current = false;
        return;
      }
      const sucesso = await finalizarPedido(id);
      if (sucesso) {
        Alert.alert("Sucesso", "Pedido confirmado e liberado!");
        navigation.goBack();
      } else {
        setScanned(false);
        setLoading(false);
        qrLock.current = false;
      }
    } catch (error) {
      Alert.alert("Erro", "QR Code inválido");
      setScanned(false);
      setLoading(false);
      qrLock.current = false;
    }
  }

  async function confirmarPorCodigo() {
    if (!codigoDigitado || !pedidoId) {
      Alert.alert("Erro", "Código inválido ou pedido não identificado");
      return;
    }
    setLoading(true);
    const pedidoRef = doc(db, "pedidos", pedidoId);
    const pedidoSnap = await getDoc(pedidoRef);
    if (!pedidoSnap.exists()) {
      Alert.alert("Erro", "Pedido não encontrado");
      setLoading(false);
      return;
    }
    const pedido = pedidoSnap.data();
    if (pedido.codigoNumerico !== codigoDigitado) {
      Alert.alert("Erro", "Código numérico incorreto");
      setLoading(false);
      return;
    }
    if (auth.currentUser?.uid !== pedido.vendedorId) {
      Alert.alert("Erro", "Você não tem permissão para finalizar este pedido");
      setLoading(false);
      return;
    }
    await updateDoc(pedidoRef, { status: "finalizado", retiradoEm: new Date() });
    Alert.alert("Sucesso", "Pedido confirmado!");
    navigation.goBack();
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text>Solicitando permissão da câmera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ textAlign: "center", marginBottom: 20 }}>
          Precisamos de acesso à câmera para ler QR Codes.
        </Text>
        <TouchableOpacity style={styles.botao} onPress={requestPermission}>
          <Text style={styles.botaoTexto}>Conceder Permissão</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
          <Text style={styles.botaoTexto}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!usandoCodigo ? (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <Text style={styles.scanText}>Centralize o QR Code</Text>
            </View>
          </View>
        </CameraView>
      ) : (
        <View style={styles.codigoContainer}>
          <Text style={styles.codigoLabel}>Digite o código numérico do pedido</Text>
          <TextInput
            style={styles.codigoInput}
            placeholder="Ex: 123456"
            keyboardType="number-pad"
            value={codigoDigitado}
            onChangeText={setCodigoDigitado}
            maxLength={6}
          />
          <TouchableOpacity style={styles.botaoConfirmar} onPress={confirmarPorCodigo}>
            <Text style={styles.botaoTexto}>Confirmar entrega</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.botoesTroca}>
        <TouchableOpacity style={styles.botaoAlternativo} onPress={() => setUsandoCodigo(!usandoCodigo)}>
          <Text style={styles.botaoTextoAlt}>
            {usandoCodigo ? "📷 Usar câmera (QR)" : "🔢 Digitar código numérico"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
          <Text style={styles.botaoTexto}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  scanArea: { width: 250, height: 250, borderWidth: 2, borderColor: "#FF6B6B", borderRadius: 20, justifyContent: "center", alignItems: "center" },
  scanText: { color: "#fff", fontSize: 16, fontWeight: "bold", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  codigoContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  codigoLabel: { fontSize: 16, marginBottom: 20, color: "#333" },
  codigoInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 18, width: "80%", textAlign: "center", marginBottom: 20 },
  botoesTroca: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" },
  botaoAlternativo: { backgroundColor: "#4ECDC4", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, marginBottom: 15 },
  botaoTextoAlt: { color: "#fff", fontWeight: "bold" },
  botaoConfirmar: { backgroundColor: "#27ae60", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  botaoVoltar: { backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 15, paddingVertical: 10, borderRadius: 25, marginTop: 10 },
  botao: { backgroundColor: "#FF6B6B", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});