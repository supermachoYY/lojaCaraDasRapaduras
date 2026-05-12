import React, { createContext, useState, ReactNode, useEffect } from "react";
import { Alert } from "react-native";
import { auth } from "../database/database";

interface CartItem {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  imagem: string;
  userId?: string;
  localRetirada?: string;
}

interface CartContextType {
  cart: CartItem[];
  adicionarAoCarrinho: (produto: any) => void;
  removerItem: (id: string) => void;
  atualizarQuantidade: (id: string, novaQuantidade: number) => void;
  limparCarrinho: () => void;
  totalItens: number;
}

export const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalItens, setTotalItens] = useState(0);

  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + item.quantidade, 0);
    setTotalItens(total);
  }, [cart]);

  function adicionarAoCarrinho(produto: any) {
    const currentUser = auth.currentUser;
    // Impedir que o vendedor compre seu próprio lanche
    if (currentUser && produto.userId === currentUser.uid) {
      Alert.alert("Ação não permitida", "Você não pode comprar seu próprio lanche.");
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === produto.id);
      if (existingItem) {
        if (existingItem.quantidade >= 3) {
          Alert.alert("Limite atingido", "Você pode adicionar no máximo 3 unidades deste produto.");
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [
        ...prevCart,
        {
          id: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
          imagem: produto.imagem,
          userId: produto.userId,
          localRetirada: produto.localRetirada || "Local não informado",
        },
      ];
    });
  }

  function removerItem(id: string) {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  }

  function atualizarQuantidade(id: string, novaQuantidade: number) {
    if (novaQuantidade < 1) {
      removerItem(id);
      return;
    }
    if (novaQuantidade > 3) {
      Alert.alert("Limite", "Máximo de 3 unidades por produto.");
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === id ? { ...item, quantidade: novaQuantidade } : item))
    );
  }

  function limparCarrinho() {
    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        adicionarAoCarrinho,
        removerItem,
        atualizarQuantidade,
        limparCarrinho,
        totalItens,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}