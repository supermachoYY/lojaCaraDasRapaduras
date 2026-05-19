import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import * as Location from 'expo-location';

export default function EnderecoEntrega({ navigation, route }: any) {
    const { cartTotal } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [entregaTipo, setEntregaTipo] = useState<'retirada' | 'entrega'>('retirada');
    const [selectedLocation, setSelectedLocation] = useState({
        latitude: -23.5505,
        longitude: -46.6333,
    });
    const [region, setRegion] = useState({
        latitude: -23.5505,
        longitude: -46.6333,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    });
    const [addressText, setAddressText] = useState('');
    const [MapComponent, setMapComponent] = useState<any>(null);
    const [MarkerComponent, setMarkerComponent] = useState<any>(null);

    // Carrega o componente do mapa apenas em dispositivos móveis
    useEffect(() => {
        if (Platform.OS !== 'web') {
            import('react-native-maps').then((module) => {
                setMapComponent(() => module.default);
                setMarkerComponent(() => module.Marker);
            });
        }
    }, []);

    // Carrega a localização atual do usuário ao montar
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permissão negada', 'Não foi possível acessar sua localização');
                    setLoading(false);
                    return;
                }
                const location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;
                setSelectedLocation({ latitude, longitude });
                setRegion({
                    latitude,
                    longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                });
                const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
                setAddressText(`${address.street}, ${address.name || address.district || ''}`);
            } catch (error) {
                console.log(error);
                Alert.alert('Erro', 'Não foi possível obter sua localização');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleMapPress = async (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        setSelectedLocation({ latitude, longitude });
        try {
            const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
            setAddressText(`${address.street}, ${address.name || address.district || ''}`);
        } catch (error) {
            console.log(error);
            setAddressText('Localização selecionada');
        }
    };

    const usarLocalizacaoAtual = async () => {
        setLoading(true);
        try {
            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            setSelectedLocation({ latitude, longitude });
            setRegion({
                latitude,
                longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            });
            const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
            setAddressText(`${address.street}, ${address.name || address.district || ''}`);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível obter sua localização');
        } finally {
            setLoading(false);
        }
    };

    const confirmarEndereco = () => {
        if (entregaTipo === 'entrega') {
            navigation.navigate('ConfirmarPedido', {
                entregaTipo,
                endereco: {
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                    texto: addressText || 'Localização selecionada',
                },
            });
        } else {
            navigation.navigate('ConfirmarPedido', {
                entregaTipo,
                endereco: null,
            });
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF6B6B" />
            </View>
        );
    }

    const renderMap = () => {
        if (Platform.OS === 'web') {
            return (
                <View style={styles.mapPlaceholder}>
                    <Text style={styles.mapPlaceholderText}>
                        O mapa está disponível apenas no aplicativo móvel.
                    </Text>
                </View>
            );
        }
        if (MapComponent && MarkerComponent) {
            return (
                <MapComponent
                    style={styles.map}
                    region={region}
                    onPress={handleMapPress}
                    showsUserLocation
                    showsMyLocationButton={false}
                >
                    <MarkerComponent
                        coordinate={selectedLocation}
                        draggable
                        onDragEnd={(e) => {
                            const { latitude, longitude } = e.nativeEvent.coordinate;
                            setSelectedLocation({ latitude, longitude });
                        }}
                    />
                </MapComponent>
            );
        }
        return (
            <View style={styles.mapPlaceholder}>
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text>Carregando mapa...</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Onde você quer receber?</Text>

            <View style={styles.switchContainer}>
                <TouchableOpacity
                    style={[styles.option, entregaTipo === 'retirada' && styles.optionActive]}
                    onPress={() => setEntregaTipo('retirada')}
                >
                    <Text style={styles.optionIcon}>📍</Text>
                    <Text style={styles.optionTitle}>Retirar com o vendedor</Text>
                    <Text style={styles.optionPrice}>Grátis</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.option, entregaTipo === 'entrega' && styles.optionActive]}
                    onPress={() => setEntregaTipo('entrega')}
                >
                    <Text style={styles.optionIcon}>🚚</Text>
                    <Text style={styles.optionTitle}>Receber em casa</Text>
                    <Text style={styles.optionPrice}>Calculado por km</Text>
                </TouchableOpacity>
            </View>

            {entregaTipo === 'entrega' && (
                <>
                    <View style={styles.mapContainer}>
                        {renderMap()}
                    </View>

                    <TouchableOpacity style={styles.currentLocationButton} onPress={usarLocalizacaoAtual}>
                        <Text style={styles.currentLocationText}>📍 Usar minha localização atual</Text>
                    </TouchableOpacity>

                    {addressText ? (
                        <Text style={styles.address}>Endereço: {addressText}</Text>
                    ) : null}
                </>
            )}

            <TouchableOpacity style={styles.confirmButton} onPress={confirmarEndereco}>
                <Text style={styles.confirmButtonText}>Continuar</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f8f8f8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    switchContainer: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    option: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 12, alignItems: 'center', elevation: 2 },
    optionActive: { backgroundColor: '#FF6B6B10', borderWidth: 2, borderColor: '#FF6B6B' },
    optionIcon: { fontSize: 30, marginBottom: 8 },
    optionTitle: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
    optionPrice: { fontSize: 12, color: '#666', marginTop: 4 },
    mapContainer: { height: 350, borderRadius: 12, overflow: 'hidden', marginBottom: 15 },
    map: { flex: 1 },
    mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
    mapPlaceholderText: { color: '#666', textAlign: 'center' },
    currentLocationButton: { backgroundColor: '#fff', padding: 12, borderRadius: 25, alignItems: 'center', marginBottom: 10, elevation: 2 },
    currentLocationText: { color: '#FF6B6B', fontWeight: 'bold' },
    address: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 15 },
    confirmButton: { backgroundColor: '#FF6B6B', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    confirmButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});