import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateProgram } from '@/hooks/usePrograms'

export function ProgramNewPage() {
  const navigate = useNavigate()
  const createProgram = useCreateProgram()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const program = await createProgram.mutateAsync({
      name,
      description: description.trim() === '' ? null : description,
    })
    void navigate(`/programs/${program.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nouveau programme</h1>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Informations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nom du programme</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. Bloc hiver — force"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
            {createProgram.isError && (
              <p role="alert" className="text-sm text-destructive">
                Impossible de créer le programme.
              </p>
            )}
            <Button type="submit" disabled={createProgram.isPending}>
              {createProgram.isPending ? 'Création…' : 'Créer le programme'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
