import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateProgram } from '@/hooks/usePrograms'
import { PROGRAM_FOCUS_LABELS, type ProgramFocus } from '@/lib/programs-api'

const FOCUS_OPTIONS = Object.entries(PROGRAM_FOCUS_LABELS) as [ProgramFocus, string][]

export function ProgramNewPage() {
  const navigate = useNavigate()
  const createProgram = useCreateProgram()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [focus, setFocus] = useState<ProgramFocus>('hypertrophie')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const program = await createProgram.mutateAsync({
      name,
      description: description.trim() === '' ? null : description,
      focus,
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
                placeholder="Ex. Force hiver"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="focus">Focus</Label>
              <Select
                value={focus}
                onValueChange={(value: string) => setFocus(value as ProgramFocus)}
              >
                <SelectTrigger id="focus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOCUS_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
