import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type HomeScreenProps = {
  onSettings: () => void;
};

export default function HomeScreen({ onSettings }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      {/* Settings button */}
      <TouchableOpacity style={styles.cogButton} onPress={onSettings}>
        <Text style={styles.cogText}>⚙️</Text>
      </TouchableOpacity>

      <Text style={styles.title}>News Page Placeholder</Text>
      <Text style={styles.subtitle}>Alerts listenign placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#fff"
  },
  cogButton: { 
    position: "absolute", 
    top: 20, 
    left: 20, 
    padding: 10 
  },
  cogText: { 
    fontSize: 28 
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold" 
  },
  subtitle: { 
    marginTop: 10, 
    fontSize: 16, 
    color: "#555" 
  },
});
