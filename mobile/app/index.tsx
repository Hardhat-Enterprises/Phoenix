import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>🔥</Text>
        </View>

        <View>
          <Text style={styles.title}>Phoenix</Text>
          <Text style={styles.subtitle}>
            Disaster and Cyber Risk Monitoring Dashboard
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Username or Email</Text>
        <TextInput
          placeholder="Enter your username or email"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Enter your password"
          secureTextEntry
          style={styles.input}
        />

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Forgot Password?</Text>
        </Pressable>

        <View style={styles.rememberRow}>
          <View style={styles.checkbox} />
          <Text style={styles.rememberText}>Remember Me</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f3f3",
    paddingHorizontal: 20
  },
  header: {
    backgroundColor: "#071633",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#111c4d",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 22,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#d7dced",
    fontSize: 13,
    marginTop: 4,
    maxWidth: 240,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 10,
    color: "#111",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: "black",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#333",
    borderRadius: 4,
    backgroundColor: "white",
  },
  rememberText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
});