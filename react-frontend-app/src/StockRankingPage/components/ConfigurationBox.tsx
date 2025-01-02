import { useState } from 'react'
import { rankingBoxesApi } from '../services/rankingBoxes'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Plus, Minus, Columns } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type ConfigurationBoxProps = {
  columnCount: number
  onColumnCountChange: (count: number) => void
  onRankingBoxCreated?: () => void
}

export function ConfigurationBox({ 
  columnCount, 
  onColumnCountChange,
  onRankingBoxCreated 
}: ConfigurationBoxProps) {
  const [title, setTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string>()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      setIsCreating(true)
      setError(undefined)
      await rankingBoxesApi.createRankingBox(title.trim())
      setTitle('')
      onRankingBoxCreated?.()
    } catch (err) {
      setError('Failed to create ranking box')
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }

  const incrementColumns = () => {
    if (columnCount < 6) {
      onColumnCountChange(columnCount + 1)
    }
  }

  const decrementColumns = () => {
    if (columnCount > 1) {
      onColumnCountChange(columnCount - 1)
    }
  }

  return (
    <Card className="h-full bg-card">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Columns className="h-4 w-4" />
            {columnCount}
          </span>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={decrementColumns}
              disabled={columnCount <= 1}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="w-24">
              <Slider 
                value={[columnCount]}
                min={1}
                max={6}
                step={1}
                onValueChange={([value]) => onColumnCountChange(value)}
                className="cursor-pointer"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={incrementColumns}
              disabled={columnCount >= 6}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-1 items-center gap-2">
          <Input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter ranking box title"
            className="h-9"
            disabled={isCreating}
          />
          <Button 
            type="submit"
            size="sm"
            disabled={isCreating || !title.trim()}
            className="h-9"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Box
          </Button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-0">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}