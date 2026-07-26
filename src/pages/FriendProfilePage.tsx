import { Link, useParams } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFriendProfile } from '@/hooks/useFriendProfile'
import { GOAL_LABELS } from '@/lib/profile-api'
import { PROGRAM_FOCUS_LABELS } from '@/lib/programs-api'

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

export function FriendProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { data: profile, isLoading, isError } = useFriendProfile(userId ?? '')

  return (
    <div className="flex flex-col gap-4">
      <Link to="/feed" className="text-sm text-primary hover:underline">
        ← Retour au feed
      </Link>

      {isLoading && <p className="text-muted-foreground">Chargement…</p>}
      {isError && (
        <p role="alert" className="text-destructive">
          Impossible de charger ce profil.
        </p>
      )}

      {profile && (
        <>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <Avatar url={profile.avatarUrl} displayName={profile.displayName} size="lg" />
              <div>
                <h1 className="text-xl font-semibold">{profile.displayName}</h1>
                {profile.age !== null && (
                  <p className="text-sm text-muted-foreground">{profile.age} ans</p>
                )}
              </div>
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
                <div className="flex items-center gap-2">
                  <p className="font-medium">{profile.activeProgram.name}</p>
                  <Badge variant="outline">
                    {PROGRAM_FOCUS_LABELS[profile.activeProgram.focus]}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun programme actif pour l'instant.</p>
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
        </>
      )}
    </div>
  )
}
