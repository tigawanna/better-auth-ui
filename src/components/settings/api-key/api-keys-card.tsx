"use client"

import { useContext, useState } from "react"

import type { AuthLocalization } from "../../../lib/auth-localization"
import { AuthUIContext } from "../../../lib/auth-ui-provider"
import { cn } from "../../../lib/utils"
import type { ApiKey } from "../../../types/api-key"
import { CardContent } from "../../ui/card"
import { SettingsCard } from "../shared/settings-card"
import type { SettingsCardClassNames } from "../shared/settings-card"
import { SettingsCellSkeleton } from "../skeletons/settings-cell-skeleton"
import { APIKeyCell } from "./api-key-cell"
import { ApiKeyDisplayDialog } from "./api-key-display-dialog"
import { ApiKeyNameDialog } from "./api-key-name-dialog"

export interface APIKeysCardProps {
    className?: string
    classNames?: SettingsCardClassNames
    apiKeys?: ApiKey[] | null
    isPending?: boolean
    localization?: AuthLocalization
    skipHook?: boolean
    refetch?: () => Promise<void>
}

export function APIKeysCard({
    className,
    classNames,
    apiKeys,
    isPending,
    localization,
    skipHook,
    refetch
}: APIKeysCardProps) {
    const {
        hooks: { useListApiKeys },
        localization: authLocalization
    } = useContext(AuthUIContext)

    localization = { ...authLocalization, ...localization }

    if (!skipHook) {
        const result = useListApiKeys()
        apiKeys = result.data
        isPending = result.isPending
        refetch = result.refetch
    }

    const [nameDialogOpen, setNameDialogOpen] = useState(false)
    const [displayDialogOpen, setDisplayDialogOpen] = useState(false)
    const [createdApiKey, setCreatedApiKey] = useState("")

    const handleCreateApiKey = (apiKey: string) => {
        setCreatedApiKey(apiKey)
        setDisplayDialogOpen(true)
    }

    return (
        <>
            <SettingsCard
                className={className}
                classNames={classNames}
                actionLabel={localization.create}
                description={localization.apiKeysDescription}
                instructions={localization.apiKeysInstructions}
                isPending={isPending}
                title={localization.apiKeys}
                action={() => setNameDialogOpen(true)}
            >
                {(isPending || (apiKeys && apiKeys.length > 0)) && (
                    <CardContent className={cn("grid gap-4", classNames?.content)}>
                        {isPending ? (
                            <SettingsCellSkeleton classNames={classNames} />
                        ) : (
                            apiKeys?.map((apiKey) => (
                                <APIKeyCell
                                    key={apiKey.id}
                                    classNames={classNames}
                                    apiKey={apiKey}
                                    localization={localization}
                                    refetch={refetch}
                                />
                            ))
                        )}
                    </CardContent>
                )}
            </SettingsCard>

            <ApiKeyNameDialog
                classNames={classNames}
                localization={localization}
                open={nameDialogOpen}
                onOpenChange={setNameDialogOpen}
                onSuccess={handleCreateApiKey}
                refetch={refetch}
            />

            <ApiKeyDisplayDialog
                classNames={classNames}
                apiKey={createdApiKey}
                localization={localization}
                open={displayDialogOpen}
                onOpenChange={setDisplayDialogOpen}
            />
        </>
    )
}
