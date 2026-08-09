import { type ChangeEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  useDeleteAccount,
  useExportUserData,
  useImportUserData,
} from '@/hooks/useDataExport'
import {
  parseUserDataExport,
  type ImportResult,
  type UserDataExport,
} from '@/lib/data-export-api'

export function DataOwnershipSection() {
  const navigate = useNavigate()
  const exportData = useExportUserData()
  const deleteAccount = useDeleteAccount()

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Mes données</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Télécharge une copie de toutes tes données (profil, fiche coaching,
            programmes, séances, poids, mensurations) au format JSON — pratique pour la
            coller dans un autre assistant IA (Claude Desktop, etc.).
          </p>
          <Button
            variant="outline"
            className="self-start"
            disabled={exportData.isPending}
            onClick={() => exportData.mutate()}
          >
            {exportData.isPending ? 'Export…' : 'Exporter mes données'}
          </Button>
          {exportData.isError && (
            <p role="alert" className="text-sm text-destructive">
              {exportData.error.message}
            </p>
          )}
        </div>

        <ImportSection />

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Supprimer ton compte efface définitivement toutes tes données : profil,
            programmes, séances, historique de poids et mensurations, et clés IA
            enregistrées.
          </p>
          <ConfirmDialog
            trigger={
              <Button variant="destructive" className="self-start">
                Supprimer mon compte
              </Button>
            }
            title="Supprimer ton compte ?"
            description="Cette action est irréversible. Toutes tes données seront définitivement effacées."
            confirmLabel="Supprimer définitivement"
            onConfirm={async () => {
              await deleteAccount.mutateAsync()
              void navigate('/login')
            }}
          />
          {deleteAccount.isError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteAccount.error.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

type ExportArrayKey = Exclude<
  keyof UserDataExport,
  'schema_version' | 'exported_at' | 'profile' | 'coaching_profile' | 'body_measurements'
>

// coaching_profile and body_measurements are absent on export files
// created before those fields existed — parseUserDataExport() doesn't
// reject those for backward compatibility, so this must tolerate either
// being missing too.
function filledCoachingFieldsCount(parsed: UserDataExport): number {
  return Object.values(parsed.coaching_profile ?? {}).filter((value) => value !== null)
    .length
}

function bodyMeasurementsCount(parsed: UserDataExport): number {
  return parsed.body_measurements?.length ?? 0
}

const SUMMARY_LABELS: [key: ExportArrayKey, label: string][] = [
  ['programs', 'programmes'],
  ['session_templates', 'jours de séance'],
  ['session_template_exercises', 'exercices planifiés'],
  ['session_logs', 'séances loguées'],
  ['session_log_sets', 'séries'],
  ['weight_entries', 'pesées'],
  ['exercises', 'exercices personnalisés'],
]

function ImportSection() {
  const importData = useImportUserData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<UserDataExport | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setResult(null)
    setParseError(null)
    setParsed(null)
    importData.reset()
    try {
      setParsed(parseUserDataExport(await file.text()))
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Fichier invalide.')
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        Importe un fichier exporté précédemment. Les pesées et mensurations existantes
        sont mises à jour par date ; le reste (programmes, séances, exercices) vient
        s'ajouter à ce qui existe déjà sur ton compte.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        aria-label="Fichier d'import"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />
      <Button
        variant="outline"
        className="self-start"
        onClick={() => fileInputRef.current?.click()}
      >
        Choisir un fichier à importer
      </Button>

      {parseError && (
        <p role="alert" className="text-sm text-destructive">
          {parseError}
        </p>
      )}

      {parsed && (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <p className="text-sm font-medium">Contenu du fichier :</p>
          <ul className="text-sm text-muted-foreground">
            {filledCoachingFieldsCount(parsed) > 0 && (
              <li>{filledCoachingFieldsCount(parsed)} champs de fiche coaching</li>
            )}
            {bodyMeasurementsCount(parsed) > 0 && (
              <li>{bodyMeasurementsCount(parsed)} mensuration(s)</li>
            )}
            {SUMMARY_LABELS.filter(([key]) => parsed[key].length > 0).map(
              ([key, label]) => (
                <li key={key}>
                  {parsed[key].length} {label}
                </li>
              ),
            )}
          </ul>
          <ConfirmDialog
            trigger={
              <Button className="self-start" disabled={importData.isPending}>
                {importData.isPending ? 'Import…' : 'Importer'}
              </Button>
            }
            title="Importer ces données ?"
            description="Les programmes, séances et exercices importés viendront s'ajouter à ceux déjà présents sur ton compte."
            confirmLabel="Confirmer l'import"
            onConfirm={async () => {
              const importedResult = await importData.mutateAsync(parsed)
              setResult(importedResult)
              setParsed(null)
            }}
          />
        </div>
      )}

      {importData.isError && (
        <p role="alert" className="text-sm text-destructive">
          {importData.error.message}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm">
          <p>
            Import terminé : {result.imported.programs} programme(s),{' '}
            {result.imported.session_logs} séance(s) loguée(s),{' '}
            {result.imported.weight_entries} pesée(s), {result.imported.body_measurements}{' '}
            mensuration(s).
          </p>
          {result.errors.length > 0 && (
            <>
              <p className="text-destructive">{result.errors.length} erreur(s) :</p>
              <ul className="flex flex-col gap-1 text-destructive">
                {result.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
