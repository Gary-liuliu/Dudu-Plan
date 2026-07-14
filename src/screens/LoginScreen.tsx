import { Eye, EyeOff, LogIn } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme';

export interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

// [Function] 收集固定账号登录凭据并提交。[Warning] 密码只保留在当前组件内存。
export function LoginScreen({ onLogin, loading, error }: LoginScreenProps) {
  const passwordInputRef = useRef<TextInput>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

  const submitLogin = () => {
    if (!canSubmit) {
      return;
    }

    void onLogin(username.trim(), password).catch(() => undefined);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="login-screen"
      >
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <View style={[styles.brandBlock, styles.brandCoral]} />
            <View style={[styles.brandBlock, styles.brandPurple]} />
            <View style={[styles.brandBlock, styles.brandTeal]} />
            <View style={[styles.brandBlock, styles.brandYellow]} />
          </View>
          <Text style={styles.brandName}>嘟嘟计划</Text>
          <Text style={styles.welcome}>欢迎回来</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>用户名</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
              editable={!loading}
              onChangeText={setUsername}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              placeholder="输入用户名"
              placeholderTextColor={colors.inkMuted}
              returnKeyType="next"
              style={styles.input}
              testID="login-username"
              value={username}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>密码</Text>
            <View style={styles.passwordField}>
              <TextInput
                autoCapitalize="none"
                autoComplete="current-password"
                autoCorrect={false}
                editable={!loading}
                onChangeText={setPassword}
                onSubmitEditing={submitLogin}
                placeholder="输入密码"
                placeholderTextColor={colors.inkMuted}
                returnKeyType="done"
                ref={passwordInputRef}
                secureTextEntry={!passwordVisible}
                style={styles.passwordInput}
                testID="login-password"
                value={password}
              />
              <Pressable
                accessibilityLabel={passwordVisible ? '隐藏密码' : '显示密码'}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setPasswordVisible((visible) => !visible)}
                style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}
              >
                {passwordVisible ? (
                  <EyeOff color={colors.inkMuted} size={20} strokeWidth={2.2} />
                ) : (
                  <Eye color={colors.inkMuted} size={20} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>
          </View>

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error} testID="login-error">
              {error}
            </Text>
          ) : null}

          <PrimaryButton
            disabled={!canSubmit}
            icon={LogIn}
            label="登录"
            loading={loading}
            onPress={submitLogin}
            style={styles.loginButton}
            testID="login-submit"
            tone="coral"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 460,
    paddingHorizontal: 24,
    paddingVertical: 34,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
  },
  brandMark: {
    width: 58,
    height: 58,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  brandBlock: {
    width: 27,
    height: 27,
    borderRadius: 6,
  },
  brandCoral: {
    backgroundColor: colors.coral,
  },
  brandPurple: {
    backgroundColor: colors.purple,
  },
  brandTeal: {
    backgroundColor: colors.teal,
  },
  brandYellow: {
    backgroundColor: colors.yellow,
  },
  brandName: {
    marginTop: 18,
    color: colors.ink,
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 36,
    letterSpacing: 0,
  },
  welcome: {
    marginTop: 5,
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
  },
  form: {
    marginTop: 36,
    gap: 18,
  },
  field: {
    gap: 7,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.ink,
    backgroundColor: colors.surface,
    fontSize: 15,
    letterSpacing: 0,
  },
  passwordField: {
    height: 52,
    paddingLeft: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    color: colors.ink,
    fontSize: 15,
    letterSpacing: 0,
  },
  visibilityButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    marginTop: -4,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    letterSpacing: 0,
  },
  loginButton: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.6,
  },
});
