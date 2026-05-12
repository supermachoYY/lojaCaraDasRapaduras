import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { CartContext } from "../services/CartContext";
import { auth, db } from "../database/database";
import { collection, addDoc, doc, getDoc, updateDoc, increment } from "firebase/firestore";

export default function ConfirmarPedido({ route, navigation }: any) {
  const dataRecebida = route.params?.dataRetirada;
  const { cart, limparCarrinho } = useContext(CartContext);
  const [loading, setLoading] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<string>("presencial");
  const [userData, setUserData] = useState<any>({});
  const [pontosUsuario, setPontosUsuario] = useState(0);
  const [usandoPontos, setUsandoPontos] = useState(false);
  const [pontosParaUsar, setPontosParaUsar] = useState(0);
  const [processandoPix, setProcessandoPix] = useState(false);

  useEffect(() => {
    carregarDadosUsuario();
  }, []);

  async function carregarDadosUsuario() {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setPontosUsuario(data.pontos || 0);
      }
    } catch (error) {
      console.log(error);
    }
  }

  function gerarCodigoNumerico() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function calcularDataRetirada() {
    if (dataRecebida) return new Date(dataRecebida);
    const hoje = new Date();
    let dataRetirada = new Date(hoje);
    dataRetirada.setDate(hoje.getDate() + 1);
    if (dataRetirada.getDay() === 6) dataRetirada.setDate(dataRetirada.getDate() + 2);
    else if (dataRetirada.getDay() === 0) dataRetirada.setDate(dataRetirada.getDate() + 1);
    return dataRetirada;
  }

  function formatarData(data: Date) {
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return `${dias[data.getDay()]}, ${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  function calcularTotal() {
    return cart.reduce((total, item) => total + item.preco * item.quantidade, 0);
  }

  const REAIS_POR_PONTO = 5;
  function calcularPontosGanhos() {
    return Math.floor(calcularTotal() / REAIS_POR_PONTO);
  }

  function calcularDescontoPorPontos() {
    if (!usandoPontos) return 0;
    return Math.min(calcularTotal(), pontosParaUsar * 0.10);
  }

  function calcularTotalComDesconto() {
    return calcularTotal() - calcularDescontoPorPontos();
  }

  function toggleUsarPontos() {
    if (pontosUsuario === 0) {
      Alert.alert("Sem Pontos", "Você ainda não tem pontos para usar.");
      return;
    }
    if (!usandoPontos) {
      const maxPontosPossiveis = Math.floor(calcularTotal() / 0.10);
      const pontosRecomendados = Math.min(pontosUsuario, maxPontosPossiveis);
      setPontosParaUsar(pontosRecomendados);
    } else {
      setPontosParaUsar(0);
    }
    setUsandoPontos(!usandoPontos);
  }

  async function criarPedidoNoFirestore(status: string = "pendente", transactionId?: string) {
    const pedidosPorVendedor = new Map();
    cart.forEach((item) => {
      const vendedorId = item.userId;
      if (!vendedorId) return;
      if (!pedidosPorVendedor.has(vendedorId)) pedidosPorVendedor.set(vendedorId, []);
      pedidosPorVendedor.get(vendedorId).push(item);
    });

    if (pedidosPorVendedor.size === 0) {
      throw new Error("Nenhum vendedor identificado");
    }

    const pedidosCriados = [];
    const dataRetirada = calcularDataRetirada();
    const descontoPontos = calcularDescontoPorPontos();
    const totalComDesconto = calcularTotalComDesconto();
    const pontosGanhos = calcularPontosGanhos();
    const codigoNumerico = gerarCodigoNumerico();

    for (const [vendedorId, itens] of pedidosPorVendedor) {
      const idUnico = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const pedido = {
        compradorId: auth.currentUser!.uid,
        compradorNome: userData.nome || auth.currentUser!.email?.split('@')[0],
        vendedorId,
        lanches: itens.map((item: any) => ({
          id: item.id,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantidade,
          imagem: item.imagem,
          localRetirada: item.localRetirada || "Não informado",
        })),
        subtotal: itens.reduce((sum, item) => sum + item.preco * item.quantidade, 0),
        descontoPontos: descontoPontos / pedidosPorVendedor.size,
        total: (itens.reduce((sum, item) => sum + item.preco * item.quantidade, 0)) - (descontoPontos / pedidosPorVendedor.size),
        dataRetirada,
        metodoPagamento,
        pontosGanhos,
        pontosUsados: usandoPontos ? pontosParaUsar : 0,
        status: status,
        qrCode: idUnico,
        codigoNumerico,
        transactionId: transactionId || null,
        avaliado: false,
        criadoEm: new Date(),
      };
      const docRef = await addDoc(collection(db, "pedidos"), pedido);
      pedidosCriados.push({ ...pedido, id: docRef.id });
    }

    const userRef = doc(db, "usuarios", auth.currentUser!.uid);
    const updateData: any = { pontos: increment(pontosGanhos) };
    if (usandoPontos && pontosParaUsar > 0) updateData.pontos = increment(pontosGanhos - pontosParaUsar);
    await updateDoc(userRef, updateData);

    return pedidosCriados;
  }

  async function pagarComPIX() {
    if (!auth.currentUser) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Erro", "Carrinho vazio");
      return;
    }
    for (const item of cart) {
      if (item.userId && item.userId === auth.currentUser.uid) {
        Alert.alert("Erro", "Seu pedido contém um lanche que você mesmo vende. Remova-o do carrinho.");
        return;
      }
    }

    setProcessandoPix(true);
    try {
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const pedidosCriados = await criarPedidoNoFirestore("aguardando_pagamento", transactionId);
      const total = calcularTotalComDesconto();
      const itens = cart.map(i => ({ nome: i.nome, quantidade: i.quantidade, preco: i.preco }));
      const email = auth.currentUser.email;

      if (!email) {
        throw new Error("Email do usuário não encontrado para pagamento PIX");
      }

      const apiUrl = 'https://loja-cara-das-rapaduras.vercel.app/api/create-preference';
      console.log("Chamando API:", apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total, itens, transactionId, email }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Resposta da Vercel (erro):", errorText);
        throw new Error(`Erro ${response.status}: ${errorText || 'Falha na comunicação'}`);
      }

      const data = await response.json();
      if (!data) throw new Error("Resposta vazia da API");

      if (data.qrCode) {
        navigation.navigate('ExibirQRCode', {
          qrCode: data.qrCode,
          qrCodeText: data.qrCodeText,
          transactionId,
        });
      } else {
        throw new Error("Resposta da API não contém QR Code");
      }
    } catch (error: any) {
      console.error("Erro no PIX:", error);
      Alert.alert("Erro", error.message || "Não foi possível iniciar o pagamento PIX");
    } finally {
      setProcessandoPix(false);
    }
  }

  async function finalizarPedidoPresencial() {
    if (!auth.currentUser) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Erro", "Carrinho vazio");
      return;
    }
    for (const item of cart) {
      if (item.userId && item.userId === auth.currentUser.uid) {
        Alert.alert("Erro", "Seu pedido contém um lanche que você mesmo vende. Remova-o do carrinho.");
        return;
      }
    }

    setLoading(true);
    try {
      const pedidosCriados = await criarPedidoNoFirestore("pendente");
      const codigoNumerico = pedidosCriados[0].codigoNumerico;
      Alert.alert(
        "✅ Pedido Confirmado!",
        `🔢 Código de retirada: ${codigoNumerico}\n\nApresente o QR Code ou o código ao vendedor.`,
        [
          {
            text: "Ver QR Code",
            onPress: () => {
              limparCarrinho();
              navigation.replace("QRCodePedido", { pedidos: pedidosCriados });
            },
          },
        ]
      );
    } catch (error: any) {
      console.log("Erro ao finalizar pedido:", error);
      Alert.alert("Erro", `Não foi possível finalizar o pedido: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const metodosPagamento = [
    { id: "presencial", nome: "💰 Pagamento Presencial", descricao: "Pague na hora da retirada" },
    { id: "pix", nome: "📱 PIX", descricao: "Pague via QR Code PIX" },
    { id: "credito", nome: "💳 Cartão de Crédito", descricao: "Pague com cartão na retirada" },
    { id: "debito", nome: "💳 Cartão de Débito", descricao: "Pague com cartão na retirada" },
  ];

  const TOTAL = calcularTotal();
  const DESCONTO_PONTOS = calcularDescontoPorPontos();
  const TOTAL_COM_DESCONTO = calcularTotalComDesconto();
  const PONTOS_GANHOS = calcularPontosGanhos();
  const dataRetiradaObj = calcularDataRetirada();

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
        <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
          <Text style={styles.botaoTexto}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPIX = metodoPagamento === "pix";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Revisar Pedido</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍔 Seu Pedido</Text>
        {cart.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.orderItemInfo}>
              <Text style={styles.orderItemQuantity}>{item.quantidade}x</Text>
              <Text style={styles.orderItemName}>{item.nome}</Text>
            </View>
            <Text style={styles.orderItemPrice}>R$ {(item.preco * item.quantidade).toFixed(2)}</Text>
            <Text style={styles.localRetiradaText}>📍 {item.localRetirada || "Local não informado"}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.fidelidadeCard}>
          <Text style={styles.fidelidadeIcon}>⭐</Text>
          <View style={styles.fidelidadeInfo}>
            <Text style={styles.fidelidadeTitle}>Programa Fidelidade</Text>
            <Text style={styles.fidelidadePontos}>Você tem {pontosUsuario} pontos acumulados!</Text>
            <Text style={styles.fidelidadeDescricao}>Cada R$ {REAIS_POR_PONTO} = 1 ponto | 10 pontos = R$1 de desconto</Text>
            {pontosUsuario > 0 && (
              <TouchableOpacity style={[styles.usarPontosButton, usandoPontos && styles.usarPontosButtonActive]} onPress={toggleUsarPontos}>
                <Text style={styles.usarPontosButtonText}>{usandoPontos ? "❌ Cancelar uso de pontos" : "🎁 Usar meus pontos"}</Text>
              </TouchableOpacity>
            )}
            {usandoPontos && (
              <View style={styles.pontosInfo}>
                <Text style={styles.pontosInfoText}>Usando {pontosParaUsar} pontos → Desconto de R$ {DESCONTO_PONTOS.toFixed(2)}</Text>
                <Text style={styles.pontosInfoText}>Após a compra você terá: {pontosUsuario - pontosParaUsar + PONTOS_GANHOS} pontos</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💳 Forma de Pagamento</Text>
        {metodosPagamento.map((metodo) => (
          <TouchableOpacity
            key={metodo.id}
            style={[styles.pagamentoOption, metodoPagamento === metodo.id && styles.pagamentoOptionSelected]}
            onPress={() => setMetodoPagamento(metodo.id)}
          >
            <View style={styles.pagamentoRadio}>{metodoPagamento === metodo.id && <View style={styles.pagamentoRadioSelected} />}</View>
            <View>
              <Text style={styles.pagamentoNome}>{metodo.nome}</Text>
              <Text style={styles.pagamentoDescricao}>{metodo.descricao}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Retirada</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View>
              <Text style={styles.infoLabel}>Data escolhida</Text>
              <Text style={styles.infoValue}>{formatarData(dataRetiradaObj)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Resumo</Text>
        <View style={styles.resumoCard}>
          <View style={styles.resumoRow}><Text style={styles.resumoLabel}>Subtotal</Text><Text style={styles.resumoValue}>R$ {TOTAL.toFixed(2)}</Text></View>
          {DESCONTO_PONTOS > 0 && <View style={styles.resumoRow}><Text style={styles.resumoLabelDesconto}>Desconto por pontos</Text><Text style={styles.resumoValueDesconto}>- R$ {DESCONTO_PONTOS.toFixed(2)}</Text></View>}
          <View style={styles.resumoRow}><Text style={styles.resumoLabel}>Taxa de entrega</Text><Text style={styles.resumoValueGratis}>Grátis</Text></View>
          <View style={styles.divisor} />
          <View style={styles.resumoTotal}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalValue}>R$ {TOTAL_COM_DESCONTO.toFixed(2)}</Text></View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.pontosGanhosCard}>
          <Text style={styles.pontosGanhosIcon}>⭐</Text>
          <View><Text style={styles.pontosGanhosTitle}>Você ganhará</Text><Text style={styles.pontosGanhosValor}>{PONTOS_GANHOS} pontos</Text><Text style={styles.pontosGanhosDescricao}>equivalente a R$ {(PONTOS_GANHOS * 0.10).toFixed(2)} de desconto futuro</Text></View>
        </View>
      </View>

      {isPIX ? (
        <TouchableOpacity
          style={[styles.botaoFinalizar, processandoPix && styles.botaoDisabled]}
          onPress={pagarComPIX}
          disabled={processandoPix}
        >
          {processandoPix ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoFinalizarTexto}>Pagar com PIX • R$ {TOTAL_COM_DESCONTO.toFixed(2)}</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.botaoFinalizar, loading && styles.botaoDisabled]}
          onPress={finalizarPedidoPresencial}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoFinalizarTexto}>Confirmar Pedido • R$ {TOTAL_COM_DESCONTO.toFixed(2)}</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  backIcon: { fontSize: 28, color: "#FF6B6B" },
  titulo: { fontSize: 20, fontWeight: "bold", color: "#333" },
  section: { backgroundColor: "#fff", marginTop: 12, paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 16 },
  orderItem: { marginBottom: 12, borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingBottom: 8 },
  orderItemInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  orderItemQuantity: { fontSize: 14, fontWeight: "bold", color: "#FF6B6B", width: 35 },
  orderItemName: { fontSize: 16, color: "#333" },
  orderItemPrice: { fontSize: 16, fontWeight: "500", color: "#333", marginTop: 4 },
  localRetiradaText: { fontSize: 12, color: "#666", marginTop: 4, fontStyle: "italic" },
  fidelidadeCard: { flexDirection: "row", backgroundColor: "#FFF3E0", borderRadius: 12, padding: 15 },
  fidelidadeIcon: { fontSize: 32, marginRight: 15 },
  fidelidadeInfo: { flex: 1 },
  fidelidadeTitle: { fontSize: 16, fontWeight: "bold", color: "#FF6B6B", marginBottom: 4 },
  fidelidadePontos: { fontSize: 20, fontWeight: "bold", color: "#FF6B6B", marginBottom: 4 },
  fidelidadeDescricao: { fontSize: 12, color: "#666", marginBottom: 10 },
  usarPontosButton: { backgroundColor: "#FF6B6B20", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: "flex-start", marginTop: 5 },
  usarPontosButtonActive: { backgroundColor: "#e74c3c20" },
  usarPontosButtonText: { color: "#FF6B6B", fontWeight: "500", fontSize: 13 },
  pontosInfo: { marginTop: 10, padding: 8, backgroundColor: "#FF6B6B10", borderRadius: 8 },
  pontosInfoText: { fontSize: 12, color: "#666", marginBottom: 2 },
  pagamentoOption: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  pagamentoOptionSelected: { backgroundColor: "#FF6B6B10" },
  pagamentoRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#ddd", marginRight: 15, justifyContent: "center", alignItems: "center" },
  pagamentoRadioSelected: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FF6B6B" },
  pagamentoNome: { fontSize: 16, fontWeight: "500", color: "#333" },
  pagamentoDescricao: { fontSize: 12, color: "#999", marginTop: 2 },
  infoCard: { backgroundColor: "#f8f8f8", borderRadius: 12, padding: 15 },
  infoRow: { flexDirection: "row", marginBottom: 15 },
  infoIcon: { fontSize: 22, marginRight: 15 },
  infoLabel: { fontSize: 12, color: "#999", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "500", color: "#333" },
  resumoCard: { backgroundColor: "#f8f8f8", borderRadius: 12, padding: 15 },
  resumoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  resumoLabel: { fontSize: 14, color: "#666" },
  resumoValue: { fontSize: 14, fontWeight: "500", color: "#333" },
  resumoLabelDesconto: { fontSize: 14, color: "#27ae60" },
  resumoValueDesconto: { fontSize: 14, fontWeight: "500", color: "#27ae60" },
  resumoValueGratis: { fontSize: 14, fontWeight: "500", color: "#27ae60" },
  divisor: { height: 1, backgroundColor: "#ddd", marginVertical: 10 },
  resumoTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  totalLabel: { fontSize: 18, fontWeight: "bold", color: "#333" },
  totalValue: { fontSize: 22, fontWeight: "bold", color: "#FF6B6B" },
  pontosGanhosCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", borderRadius: 12, padding: 15 },
  pontosGanhosIcon: { fontSize: 32, marginRight: 15 },
  pontosGanhosTitle: { fontSize: 12, color: "#666" },
  pontosGanhosValor: { fontSize: 24, fontWeight: "bold", color: "#4CAF50" },
  pontosGanhosDescricao: { fontSize: 11, color: "#999" },
  botaoFinalizar: { backgroundColor: "#FF6B6B", margin: 20, paddingVertical: 18, borderRadius: 12, alignItems: "center", elevation: 3 },
  botaoDisabled: { opacity: 0.7 },
  botaoFinalizarTexto: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  botaoVoltar: { backgroundColor: "#FF6B6B", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  botaoTexto: { color: "#fff", fontWeight: "bold" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f8f8", padding: 20 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 10 },
  emptyText: { fontSize: 14, color: "#999", marginBottom: 30 },
});