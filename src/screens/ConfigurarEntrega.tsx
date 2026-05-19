import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../database/database';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function ConfigurarEntrega({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [pontoPartida, setPontoPartida] = useState({
        latitude: -23.5505,
        longitude: -46.6333,
    });
    const [valorPorKm, setValorPorKm] = useState('2.00');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        carregarConfiguracoes();
    }, []);

    async function carregarConfiguracoes() {
        if (!auth.currentUser) return;
        try {
            const configRef = doc(db, "configuracoes_entrega", auth.currentUser.uid);
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                const data = configSnap.data();
                setPontoPartida(data.pontoPartida || pontoPartida);
                setValorPorKm(data.valorPorKm?.toString() || '2.00');
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }

    async function salvarConfiguracoes() {
        if (!auth.currentUser) return;
        setSaving(true);
        try {
            const configRef = doc(db, "configuracoes_entrega", auth.currentUser.uid);
            await setDoc(configRef, {
                pontoPartida,
                valorPorKm: parseFloat(valorPorKm),
                atualizadoEm: new Date(),
            });
            Alert.alert("Sucesso", "Configurações salvas!");
            navigation.goBack();
        } catch (error) {
            Alert.alert("Erro", "Não foi possível salvar as configurações");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#FF6B6B" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.titulo}>Configurar Entrega</Text>

            <Text style={styles.label}>Ponto de partida (sua localização):</Text>
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: pontoPartida.latitude,
                    longitude: pontoPartida.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }}
                onPress={(e) => setPontoPartida(e.nativeEvent.coordinate)}
            >
                <Marker coordinate={pontoPartida} draggable onDragEnd={(e) => setPontoPartida(e.nativeEvent.coordinate)} />
            </MapView>

            <Text style={styles.label}>Valor por km (R$):</Text>
            <TextInput
                style={styles.input}
                value={valorPorKm}
                onChangeText={setValorPorKm}
                keyboardType="numeric"
                placeholder="2.00"
            />

            <TouchableOpacity style={styles.saveButton} onPress={salvarConfiguracoes} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? "Salvando..." : "Salvar Configurações"}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
    map: { width: '100%', height: 250, borderRadius: 12, marginBottom: 10 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
    saveButton: { backgroundColor: '#FF6B6B', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
    saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});