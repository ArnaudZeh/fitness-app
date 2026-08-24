import { useState } from 'react'
import { Link } from 'react-router'
import { UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/Avatar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAuthStore } from '@/lib/auth-store'
import {
  useFollowerCount,
  useFollowingCount,
  useFollowSuggestions,
  useFollowUser,
} from '@/hooks/useFollows'
import {
  useAcceptFriendRequest,
  useFriendsData,
  useRemoveFriendship,
  useSendFriendRequest,
  useUserSearch,
} from '@/hooks/useFriends'
import type { FriendEntry, FriendsData } from '@/lib/friends-api'

type RelationshipState =
  | { kind: 'none' }
  | { kind: 'friend' }
  | { kind: 'incoming'; friendshipId: string }
  | { kind: 'outgoing'; friendshipId: string }

function relationshipWith(userId: string, friends: FriendsData): RelationshipState {
  if (friends.friends.some((f) => f.userId === userId)) return { kind: 'friend' }
  const incoming = friends.incomingRequests.find((f) => f.userId === userId)
  if (incoming) return { kind: 'incoming', friendshipId: incoming.friendshipId }
  const outgoing = friends.outgoingRequests.find((f) => f.userId === userId)
  if (outgoing) return { kind: 'outgoing', friendshipId: outgoing.friendshipId }
  return { kind: 'none' }
}

export function FriendsPage() {
  const { data: friends, isLoading, isError } = useFriendsData()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Amis</h1>

      <MyFollowCountsCard />

      <DiscoverCard />

      <SearchCard friends={friends} />

      {isLoading && <p className="text-muted-foreground">Chargement…</p>}
      {isError && (
        <p role="alert" className="text-destructive">
          Impossible de charger tes amis.
        </p>
      )}

      {friends && friends.incomingRequests.length > 0 && (
        <RequestsCard title="Demandes reçues" entries={friends.incomingRequests} direction="incoming" />
      )}

      {friends && friends.outgoingRequests.length > 0 && (
        <RequestsCard title="Demandes envoyées" entries={friends.outgoingRequests} direction="outgoing" />
      )}

      {friends && <FriendsListCard entries={friends.friends} />}
    </div>
  )
}

// Toujours visibles pour soi-même, même profil privé (contrairement à
// FriendProfilePage où les compteurs d'un tiers ne s'affichent que si son
// profil est public) — voir count_followers/count_following côté DB.
function MyFollowCountsCard() {
  const myUserId = useAuthStore((state) => state.session?.user.id)
  const { data: followerCount } = useFollowerCount(myUserId ?? '')
  const { data: followingCount } = useFollowingCount(myUserId ?? '')

  if (!myUserId) return null

  return (
    <Card>
      <CardContent className="flex items-center justify-around py-4 text-center">
        <div>
          <p className="text-xl font-semibold">{followerCount ?? 0}</p>
          <p className="text-sm text-muted-foreground">Abonnés</p>
        </div>
        <div>
          <p className="text-xl font-semibold">{followingCount ?? 0}</p>
          <p className="text-sm text-muted-foreground">Abonnements</p>
        </div>
      </CardContent>
    </Card>
  )
}

// P3 — comptes publics pas déjà suivis ni déjà amis, classés par nombre
// d'abonnés côté DB (get_follow_suggestions). Liste vide = carte masquée
// entièrement plutôt qu'un état vide vide de sens ("aucune suggestion").
function DiscoverCard() {
  const { data: suggestions, isLoading } = useFollowSuggestions()
  const followUser = useFollowUser()

  if (isLoading) return null
  if (!suggestions || suggestions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Comptes à découvrir</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
            >
              <Link
                to={`/friends/${suggestion.id}`}
                className="flex flex-col text-sm font-medium hover:underline"
              >
                {suggestion.displayName}
                <span className="text-xs font-normal text-muted-foreground">
                  {suggestion.followerCount} abonné{suggestion.followerCount !== 1 ? 's' : ''}
                </span>
              </Link>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={followUser.isPending}
                onClick={() => followUser.mutate(suggestion.id)}
              >
                <UserPlus /> Suivre
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function SearchCard({ friends }: { friends: FriendsData | undefined }) {
  const [query, setQuery] = useState('')
  const { data: results, isLoading } = useUserSearch(query)
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Trouver quelqu'un</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher par nom…"
        />

        {isLoading && <p className="text-sm text-muted-foreground">Recherche…</p>}

        {results && results.length === 0 && query.trim() !== '' && !isLoading && (
          <p className="text-sm text-muted-foreground">Personne ne correspond à cette recherche.</p>
        )}

        {results && results.length > 0 && (
          <ul className="flex flex-col gap-2">
            {results.map((result) => {
              const state = friends ? relationshipWith(result.id, friends) : { kind: 'none' as const }
              return (
                <li
                  key={result.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
                >
                  <Link
                    to={`/friends/${result.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {result.displayName}
                  </Link>
                  {state.kind === 'none' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={sendRequest.isPending}
                      onClick={() => sendRequest.mutate(result.id)}
                    >
                      <UserPlus /> Ajouter
                    </Button>
                  )}
                  {state.kind === 'friend' && (
                    <span className="text-sm text-muted-foreground">Déjà ami</span>
                  )}
                  {state.kind === 'outgoing' && (
                    <span className="text-sm text-muted-foreground">Demande envoyée</span>
                  )}
                  {state.kind === 'incoming' && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={acceptRequest.isPending}
                      onClick={() => acceptRequest.mutate(state.friendshipId)}
                    >
                      Accepter
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function RequestsCard({
  title,
  entries,
  direction,
}: {
  title: string
  entries: FriendEntry[]
  direction: 'incoming' | 'outgoing'
}) {
  const acceptRequest = useAcceptFriendRequest()
  const removeFriendship = useRemoveFriendship()

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.friendshipId}
              className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
            >
              <span className="text-sm font-medium">{entry.displayName}</span>
              <div className="flex items-center gap-2">
                {direction === 'incoming' && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={acceptRequest.isPending}
                    onClick={() => acceptRequest.mutate(entry.friendshipId)}
                  >
                    Accepter
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={removeFriendship.isPending}
                  onClick={() => removeFriendship.mutate(entry.friendshipId)}
                >
                  {direction === 'incoming' ? 'Refuser' : 'Annuler'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function FriendsListCard({ entries }: { entries: FriendEntry[] }) {
  const removeFriendship = useRemoveFriendship()

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Mes amis</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pas encore d'amis. Cherche quelqu'un ci-dessus pour lui envoyer une demande.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li
                key={entry.friendshipId}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
              >
                <Link
                  to={`/friends/${entry.userId}`}
                  className="flex items-center gap-2 text-sm font-medium hover:underline"
                >
                  <Avatar url={entry.avatarUrl} displayName={entry.displayName} size="sm" />
                  {entry.displayName}
                </Link>
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Retirer cet ami">
                      <X />
                    </Button>
                  }
                  title="Retirer cet ami ?"
                  description="Vous ne verrez plus ses records et posts dans le feed, et lui non plus les vôtres."
                  confirmLabel="Retirer"
                  onConfirm={async () => {
                    await removeFriendship.mutateAsync(entry.friendshipId)
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
