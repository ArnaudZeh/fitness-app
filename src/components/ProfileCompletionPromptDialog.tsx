import { useNavigate } from 'react-router'
import { UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ProfileCompletionPromptDialogProps {
  onDismiss: () => void
}

// Rendered by AppLayout only while the profile is missing a name or photo —
// see the shouldShowProfilePrompt check there, which also holds off
// NotificationsPromptDialog so the two never stack on the same app open.
export function ProfileCompletionPromptDialog({ onDismiss }: ProfileCompletionPromptDialogProps) {
  const navigate = useNavigate()

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5" /> Complète ton profil
          </DialogTitle>
          <DialogDescription>
            Ajoute une photo, ton nom et quelques infos pour que tes amis te
            reconnaissent et profiter pleinement de l'app.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDismiss}>
            Plus tard
          </Button>
          <Button
            type="button"
            onClick={() => {
              onDismiss()
              void navigate('/profile')
            }}
          >
            Compléter mon profil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
