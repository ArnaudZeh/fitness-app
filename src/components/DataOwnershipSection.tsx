import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useDeleteAccount, useExportUserData } from '@/hooks/useDataExport'

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
            Télécharge une copie de toutes tes données (profil, programmes, séances,
            poids) au format JSON.
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

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Supprimer ton compte efface définitivement toutes tes données : profil,
            programmes, séances, historique de poids et clés IA enregistrées.
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
