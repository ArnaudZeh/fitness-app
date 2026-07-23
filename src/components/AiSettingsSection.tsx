import { type FormEvent, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  useAiProviderKeys,
  useDeleteAiProviderKey,
  useSaveAiProviderKey,
  useTestAiProviderKey,
} from '@/hooks/useAiProviderKeys'
import {
  AI_PROVIDER_LABELS,
  AI_PROVIDERS,
  type AiProvider,
  type AiProviderKeyStatus,
} from '@/lib/ai-keys-api'

export function AiSettingsSection() {
  const { data: statuses, isLoading } = useAiProviderKeys()
  const statusByProvider = new Map((statuses ?? []).map((s) => [s.provider, s]))

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Paramètres IA</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Renseigne ta propre clé API pour activer les fonctionnalités IA. Ta clé est
          chiffrée et n'est utilisée que pour tes propres appels. Elle n'est jamais
          partagée ni visible en clair, y compris par nous.
        </p>
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!isLoading && (
          <div className="flex flex-col gap-4">
            {AI_PROVIDERS.map((provider) => (
              <ProviderKeyRow
                key={provider}
                provider={provider}
                status={statusByProvider.get(provider)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProviderKeyRow({
  provider,
  status,
}: {
  provider: AiProvider
  status: AiProviderKeyStatus | undefined
}) {
  const saveKey = useSaveAiProviderKey()
  const testKey = useTestAiProviderKey()
  const deleteKey = useDeleteAiProviderKey()
  const [apiKey, setApiKey] = useState('')

  const isConfigured = status !== undefined
  const isPending = saveKey.isPending || testKey.isPending || deleteKey.isPending

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (apiKey.trim() === '') return
    saveKey.reset()
    await saveKey.mutateAsync({ provider, apiKey: apiKey.trim() })
    setApiKey('')
  }

  const error = saveKey.error ?? testKey.error ?? deleteKey.error

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{AI_PROVIDER_LABELS[provider]}</span>
        <ProviderStatusBadge status={status} />
      </div>

      {isConfigured && status.last_validated_at && (
        <p className="text-xs text-muted-foreground">
          Dernière validation :{' '}
          {new Date(status.last_validated_at).toLocaleString('fr-FR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      )}

      <form
        onSubmit={(event) => void handleSave(event)}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="flex min-w-[12rem] flex-1 flex-col gap-2">
          <Label htmlFor={`api-key-${provider}`}>
            {isConfigured ? 'Remplacer la clé' : 'Clé API'} ·{' '}
            {AI_PROVIDER_LABELS[provider]}
          </Label>
          <Input
            id={`api-key-${provider}`}
            type="password"
            autoComplete="off"
            placeholder="sk-..."
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={isPending || apiKey.trim() === ''}>
          {saveKey.isPending ? 'Validation…' : isConfigured ? 'Remplacer' : 'Enregistrer'}
        </Button>
        {isConfigured && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Retester la clé"
              disabled={isPending}
              onClick={() => void testKey.mutateAsync(provider)}
            >
              <RefreshCw className={testKey.isPending ? 'animate-spin' : undefined} />
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer la clé ${AI_PROVIDER_LABELS[provider]}`}
                  disabled={isPending}
                >
                  <Trash2 />
                </Button>
              }
              title={`Supprimer la clé ${AI_PROVIDER_LABELS[provider]} ?`}
              description="Les fonctionnalités IA utilisant ce provider ne seront plus disponibles tant qu'une nouvelle clé n'est pas ajoutée."
              confirmLabel="Supprimer"
              onConfirm={async () => {
                await deleteKey.mutateAsync(provider)
              }}
            />
          </>
        )}
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  )
}

function ProviderStatusBadge({ status }: { status: AiProviderKeyStatus | undefined }) {
  if (!status) return <Badge variant="outline">Non configurée</Badge>
  if (status.is_valid) return <Badge>Validée ✓</Badge>
  return <Badge variant="destructive">Invalide</Badge>
}
