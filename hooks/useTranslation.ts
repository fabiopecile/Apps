import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { translate, type TranslationKey } from '@/lib/i18n';

export function useTranslation() {
  const { profile } = useAuth();
  const language = profile?.language ?? 'de';

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language]
  );

  return { t, language };
}
