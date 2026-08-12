'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function ShareAssessment({
  assessmentId,
  isPublished,
}: {
  assessmentId: string;
  isPublished: boolean;
}) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Build the public URL on the client (needs window.location.origin). Points
  // at the assessment's branded landing page.
  useEffect(() => {
    setUrl(`${window.location.origin}/a/${assessmentId}`);
  }, [assessmentId]);

  const copy = async () => {
    setError('');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('share.copyError'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Share2 className="h-5 w-5 text-primary" />
          {t('share.title')}
        </CardTitle>
        <CardDescription>
          {isPublished ? t('share.descPublished') : t('share.descDraft')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 flex-1 truncate rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Public assessment URL"
          />
          <Button onClick={copy} variant={copied ? 'secondary' : 'default'}>
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                {t('share.copied')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {t('share.copyLink')}
              </>
            )}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
