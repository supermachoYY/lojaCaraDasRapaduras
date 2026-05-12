import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";

import StackNavigator from "./StackNavigator";
import Carrinho from "../screens/Carrinho";
import Perfil from "../screens/Perfil";

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="Inicio" component={StackNavigator} />
      <Drawer.Screen name="Carrinho" component={Carrinho} />
      <Drawer.Screen name="Perfil" component={Perfil} />
    </Drawer.Navigator>
  );
}