import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Carrinho from "../screens/Carrinho";
import Login from "../screens/Login";
import Cadastro from "../screens/Cadastro";
import Home from "../screens/Home";
import Produto from "../screens/Produto";
import ConfirmarPedido from "../screens/ConfirmarPedido";
import QRCodePedido from "../screens/QRCodePedido";
import AvaliarProduto from "../screens/AvaliarProduto";
import CriarLanche from "../screens/CriarLanche";
import PainelVendedor from "../screens/PainelVendedor";
import EditarLanche from "../screens/EditarLanche";
import LerQRCode from "../screens/LerQRCode";
import Perfil from "../screens/Perfil";
import PedidosRecebidos from "../screens/PedidosRecebidos"; 
import MeusPedidos from "../screens/MeusPedidos";
import AvaliarPedido from "../screens/AvaliarPedido";
import GraficoVendas from "../screens/GraficoVendas";



const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
      <Stack.Screen name="Perfil" component={Perfil} options={{ title: "Meu Perfil" }} />
      <Stack.Screen name="LerQRCode" component={LerQRCode} />
      <Stack.Screen name="Cadastro" component={Cadastro} />
      <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <Stack.Screen name="CriarLanche" component={CriarLanche} />
      <Stack.Screen name="EditarLanche" component={EditarLanche} />
      <Stack.Screen name="PainelVendedor" component={PainelVendedor} />
      <Stack.Screen name="Produto" component={Produto} />
      <Stack.Screen name="Carrinho" component={Carrinho} />
      <Stack.Screen name="ConfirmarPedido" component={ConfirmarPedido} />
      <Stack.Screen name="QRCodePedido" component={QRCodePedido} />
      <Stack.Screen name="AvaliarProduto" component={AvaliarProduto} />
      <Stack.Screen name="PedidosRecebidos" component={PedidosRecebidos} options={{ title: "Pedidos pendentes" }} />
      <Stack.Screen name="MeusPedidos" component={MeusPedidos} options={{ title: "Meus Pedidos" }} />
      <Stack.Screen name="AvaliarPedido" component={AvaliarPedido} options={{ title: "Avaliar Pedido" }} />
      <Stack.Screen name="GraficoVendas" component={GraficoVendas} options={{ title: "Gráfico de Vendas" }} />
    </Stack.Navigator>
  );
}