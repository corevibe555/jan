import { useCallback, useState } from 'react'
import { IconLoader } from '@tabler/icons-react'
import { useShallow } from 'zustand/shallow'

import { Button } from '@/components/ui/button'
import { useModelLoad } from '@/hooks/useModelLoad'
import { useModelProvider } from '@/hooks/useModelProvider'
import { useServiceHub } from '@/hooks/useServiceHub'
import { useAppState } from '@/hooks/useAppState'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n/react-i18next-compat'

type ModelLoadStopButtonProps = {
  modelId: string | undefined
  providerName: string | undefined
  className?: string
}

export function ModelLoadStopButton({
  modelId,
  providerName,
  className,
}: ModelLoadStopButtonProps) {
  const serviceHub = useServiceHub()
  const { setModelLoadError } = useModelLoad()
  const { getProviderByName } = useModelProvider()
  const { t } = useTranslation()
  const [activeModels, setActiveModels] = useAppState(
    useShallow((state) => [state.activeModels, state.setActiveModels])
  )
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null)

  const provider = providerName ? getProviderByName(providerName) : undefined
  const supportsLoadControl =
    provider &&
    (provider.provider === 'llamacpp' || provider.provider === 'mlx') &&
    Boolean(modelId)

  const refreshActive = useCallback(async () => {
    if (!provider) return
    const models = await serviceHub
      .models()
      .getActiveModels(provider.provider)
    setActiveModels(models || [])
  }, [provider, serviceHub, setActiveModels])

  const handleStart = async () => {
    if (!provider || !modelId) return
    setLoadingModelId(modelId)
    try {
      await serviceHub.models().startModel(provider, modelId)
      await refreshActive()
    } catch (error) {
      setModelLoadError(error as ErrorObject)
    } finally {
      setLoadingModelId(null)
    }
  }

  const handleStop = () => {
    if (!provider || !modelId) return
    serviceHub
      .models()
      .stopModel(modelId, provider.provider)
      .then(() => refreshActive())
      .catch((error) => {
        console.error('Error stopping model:', error)
      })
  }

  if (!supportsLoadControl || !modelId) {
    return null
  }

  const isActive = activeModels.includes(modelId)
  const isLoading = loadingModelId === modelId

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn('flex items-center shrink-0', className)}
    >
      {isLoading ? (
        <Button variant="ghost" size="icon-xs" disabled aria-busy>
          <IconLoader size={16} className="animate-spin text-muted-foreground" />
        </Button>
      ) : isActive ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleStop}
        >
          {t('providers:stop')}
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleStart}
        >
          {t('providers:start')}
        </Button>
      )}
    </div>
  )
}
