import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ScrollView } from 'react-native';

export default function App() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState('');

  const runCheck = () => {
    setResults(`Running check for: ${url}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Phoenix App</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Name"
        value={url}
        onChangeText={setUrl}
      />
      <Button title="Begin" onPress={runCheck} />
      {results ? <Text style={styles.results}>{results}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#888', padding: 10, marginBottom: 20, borderRadius: 5 },
  results: { marginTop: 20, fontSize: 16, color: 'blue' },
});