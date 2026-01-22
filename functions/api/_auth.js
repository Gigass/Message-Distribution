const DEFAULT_TOKENS = [
  { id: 'default', password: 'MEILIN1!', label: '默认' }
];

const normalizeTokens = (tokens) => {
  if (!Array.isArray(tokens)) return [];

  return tokens
    .map((token, index) => {
      const id = token && token.id ? String(token.id) : `token_${index + 1}`;
      const password = token && token.password ? String(token.password) : '';
      const label = token && token.label ? String(token.label) : id;
      const shareCode =
        token && (token.shareCode || token.code) ? String(token.shareCode || token.code) : '';

      return { id, password, label, shareCode };
    })
    .filter(token => token.password);
};

export const getTokensFromEnv = (env = {}) => {
  if (env.TOKENS_JSON) {
    try {
      const parsed = JSON.parse(env.TOKENS_JSON);
      if (Array.isArray(parsed)) {
        const tokens = normalizeTokens(parsed);
        if (tokens.length) return tokens;
      }
      if (parsed && Array.isArray(parsed.tokens)) {
        const tokens = normalizeTokens(parsed.tokens);
        if (tokens.length) return tokens;
      }
    } catch (error) {
      console.warn('[Auth] Failed to parse TOKENS_JSON:', error.message);
    }
  }

  if (env.ADMIN_PASSWORD) {
    return [{ id: 'default', password: String(env.ADMIN_PASSWORD), label: '默认' }];
  }

  return DEFAULT_TOKENS;
};

export const findTokenByPassword = (env, password) => {
  if (!password) return null;
  const tokens = getTokensFromEnv(env);
  return tokens.find(token => token.password === password) || null;
};

export const findTokenByShareCode = (env, code) => {
  if (!code) return null;
  const tokens = getTokensFromEnv(env);

  return (
    tokens.find(token => {
      if (token.shareCode) return token.shareCode === code;
      return token.id === code;
    }) || null
  );
};
