import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type SettingsScreenProps = {
  onBack: () => void;
  onLogout: () => void;
  onRequestPermission: () => void;
};

export default function SettingsScreen({
  onBack,
  onLogout,
  onRequestPermission
}: SettingsScreenProps) {
  return (
    <View style={styles.container}>

      {/* Back arrow */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Settings</Text>

      {/* Notification Permission */}
      <TouchableOpacity style={styles.permissionButton} onPress={onRequestPermission}>
        <Text style={styles.permissionText}>Notification Permission</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
  },
  backText: {
    fontSize: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },

  permissionButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  permissionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  logoutButton: {
    backgroundColor: '#e63946',
    padding: 15,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
