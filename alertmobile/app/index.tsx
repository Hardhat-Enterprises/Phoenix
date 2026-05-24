import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { io } from "socket.io-client";

import HomeScreen from './(tabs)/homescreen';
import SettingsScreen from './(tabs)/settings';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function App() {
  const [showHome, setShowHome] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  //Create socket and keep alive
  const socket = useMemo(() => {
    console.log("Connecting to the backend:", BACKEND_URL);
    return io(BACKEND_URL, { transports: ["websocket"] });
  }, []);

  //Attach listeners
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Success! Connected to backend!");
    });

    socket.on("alert", (data) => {
      console.log("Alert received!", data);
    });

    socket.on("connect_error", (err) => {
      console.log("Error! Connection error:", err.message);
    });

    return () => { socket.disconnect(); };
  }, [socket]);

  //Android notification permission
  const requestNotificationPermission = async () => {
    if (Platform.OS !== "android") {
      console.log("⚠️ Notification permission only applies to Android.");
      return;
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Notification Permission",
          message: "This app would like to send you notifications.",
          buttonPositive: "Allow",
          buttonNegative: "Deny",
        }
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("+ Notification permission granted");
      } else {
        console.log("- Notification permission denied");
      }
    } catch (err) {
      console.log("Permission error:", err);
    }
  };

  const handleLogout = () => {
    setShowSettings(false);
    setShowHome(false);
  };

  if (showSettings) {
    return (
      <SettingsScreen
        onBack={() => setShowSettings(false)}
        onLogout={handleLogout}
        onRequestPermission={requestNotificationPermission}
      />
    );
  }

  if (showHome) {
    return <HomeScreen onSettings={() => setShowSettings(true)} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sign In</Text>

      <TextInput style={styles.input} placeholder="Enter your username or email" />
      <TextInput style={styles.input} placeholder="Enter your password" secureTextEntry />

      <View style={styles.button}>
        <Text style={styles.buttonText}>Sign In</Text>
      </View>

      <TouchableOpacity style={styles.devButton} onPress={() => setShowHome(true)}>
        <Text style={styles.devButtonText}>Dev Entry</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor:'#ffffff'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#000000',
  },
  input: {
    height: 50,
    borderColor: '#d0d0d0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#000000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devButton: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  devButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
});
