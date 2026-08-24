import { Link, useParams } from 'react-router'
import { Copy, Eye, UserCheck, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFriendProfile } from '@/hooks/useFriendProfile'
import {
  useFollowerCount,
  useFollowingCount,
  useFollowUser,
  useIsFollowing,
  useUnfollowUser,
} from '@/hooks/useFollows'
import { useCopyProgramToMyAccount } from '@/hooks/usePrograms'
import { ProfileNotVisibleError, type FriendProfile } from '@/lib/friend-profile-api'
import { GOAL_LABELS } from '@/lib/profile-api'
import { PROGRAM_FOCUS_LABELS, type ProgramFocus } from '@/lib/programs-api'

function formatWeightDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    // recorded_at is a plain date, not an instant — must render in UTC or
    // it silently shifts back a day for any viewer west of UTC.
    timeZone: 'UTC',
  })
}

const MEASUREMENT_LABELS: [
  key: 'neckCm' | 'chestCm' | 'waistCm' | 'hipsCm' | 'armCm' | 'thighCm' | 'calfCm',
  label: string,
][] = [
  ['neckCm', 'Cou'],
  ['chestCm', 'Poitrine'],
  ['waistCm', 'Taille'],
  ['hipsCm', 'Hanches'],
  ['armCm', 'Bras'],
  ['thighCm', 'Cuisse'],
  ['calfCm', 'Mollet'],
]

function formatMeasurementSummary(
  entry: FriendProfile['recentMeasurements'][number],
): string {
  return MEASUREMENT_LABELS.filter(([key]) => entry[key] !== null)
    .map(([key, label]) => `${label} ${entry[key]}cm`)
    .join(' · ')
}

export function FriendProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { data: profile, isLoading, isError, error } = useFriendProfile(userId ?? '')
  const isPrivate = error instanceof ProfileNotVisibleError

  return (
    <div className="flex flex-col gap-4">
      <Link to="/feed" className="text-sm text-primary hover:underline">
        ← Retour au feed
      </Link>

      {isLoading && <p className="text-muted-foreground">Chargement…</p>}
      {isError && isPrivate && (
        <p className="text-muted-foreground">
          Ce profil est privé, seuls ses amis peuvent le consulter.
        </p>
      )}
      {isError && !isPrivate && (
        <p role="alert" className="text-destructive">
          Impossible de charger ce profil.
        </p>
      )}

      {profile && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div className="flex items-center gap-4">
                <Avatar
                  url={profile.avatarUrl}
                  displayName={profile.displayName}
                  size="lg"
                />
                <div>
                  <h1 className="text-xl font-semibold">{profile.displayName}</h1>
                  {profile.age !== null && (
                    <p className="text-sm text-muted-foreground">{profile.age} ans</p>
                  )}
                  {profile.isPublic && <FollowCounts userId={profile.id} />}
                </div>
              </div>
              {profile.isPublic && <FollowButton userId={profile.id} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Objectif</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.goal ? (
                <Badge>{GOAL_LABELS[profile.goal]}</Badge>
              ) : (
                <p className="text-sm text-muted-foreground">Non renseigné.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Programme en cours</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.activeProgram ? (
                <CopyProgramSection
                  activeProgram={profile.activeProgram}
                  authorName={profile.displayName}
                  isPublic={profile.isPublic}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun programme actif pour l'instant.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Dernières pesées</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.recentWeights.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune pesée enregistrée.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {profile.recentWeights.map((entry) => (
                    <li
                      key={entry.recordedAt}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono font-medium tabular-nums">
                        {entry.weightKg} kg
                      </span>
                      <span className="text-muted-foreground">
                        {formatWeightDate(entry.recordedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Dernières mensurations</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.recentMeasurements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune mensuration enregistrée.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {profile.recentMeasurements.map((entry) => (
                    <li key={entry.recordedAt} className="text-sm">
                      <p>{formatMeasurementSummary(entry)}</p>
                      <p className="text-muted-foreground">
                        {formatWeightDate(entry.recordedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// P2 — compteurs seulement (pas de liste nominative, voir TODOS.md). null
// (profil ni public ni soi-même) ne devrait jamais arriver ici puisque le
// parent ne rend ce composant que pour un profil public, mais reste géré
// proprement plutôt que d'afficher un faux "0".
function FollowCounts({ userId }: { userId: string }) {
  const { data: followerCount } = useFollowerCount(userId)
  const { data: followingCount } = useFollowingCount(userId)

  if (followerCount === null || followerCount === undefined) return null
  if (followingCount === null || followingCount === undefined) return null

  return (
    <p className="text-sm text-muted-foreground">
      {followerCount} abonné{followerCount !== 1 ? 's' : ''} · {followingCount} abonnement
      {followingCount !== 1 ? 's' : ''}
    </p>
  )
}

// P1 du follow asymétrique — réservé aux profils publics (le parent ne
// rend ce bouton que si profile.isPublic), un suivi ne fait que remonter
// dans le feed un contenu déjà consultable par n'importe qui via cette
// page.
function FollowButton({ userId }: { userId: string }) {
  const { data: isFollowing, isLoading } = useIsFollowing(userId)
  const followUser = useFollowUser()
  const unfollowUser = useUnfollowUser()
  const isPending = followUser.isPending || unfollowUser.isPending

  if (isLoading) return null

  return isFollowing ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => unfollowUser.mutate(userId)}
    >
      <UserCheck /> {unfollowUser.isPending ? 'Retrait…' : 'Suivi'}
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={() => followUser.mutate(userId)}
    >
      <UserPlus /> {followUser.isPending ? 'Suivi…' : 'Suivre'}
    </Button>
  )
}

function CopyProgramSection({
  activeProgram,
  authorName,
  isPublic,
}: {
  activeProgram: { id: string; name: string; focus: ProgramFocus }
  authorName: string
  isPublic: boolean
}) {
  const copyProgram = useCopyProgramToMyAccount()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="font-medium">{activeProgram.name}</p>
        <Badge variant="outline">{PROGRAM_FOCUS_LABELS[activeProgram.focus]}</Badge>
      </div>
      {copyProgram.isError && (
        <p role="alert" className="text-sm text-destructive">
          Impossible de copier ce programme.
        </p>
      )}
      {copyProgram.isSuccess && (
        <p className="text-sm text-muted-foreground">
          Copié dans tes programmes sous « {copyProgram.data.name} ».
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {isPublic && (
          // can_view_program_details() only opens the day-by-day detail
          // (session_templates/exercises) for the owner or a public
          // profile — never a plain friend — so this link only makes
          // sense to offer when isPublic is true, matching that gate.
          <Link to={`/programs/${activeProgram.id}`}>
            <Button type="button" variant="outline" size="sm">
              <Eye /> Voir le programme en détail
            </Button>
          </Link>
        )}
        {!copyProgram.isSuccess && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={copyProgram.isPending}
            onClick={() =>
              copyProgram.mutate({
                programId: activeProgram.id,
                sourceLabel: `copié de ${authorName}`,
              })
            }
          >
            <Copy /> {copyProgram.isPending ? 'Copie…' : 'Copier dans mes programmes'}
          </Button>
        )}
      </div>
    </div>
  )
}
