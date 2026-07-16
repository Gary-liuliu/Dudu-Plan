import AsyncStorage from '@react-native-async-storage/async-storage';

const ownerSyncStorageKey = '@dudu-plan/owner-sync/v1';

export interface OwnerSyncMetadata {
  version: 1;
  syncStartedAt: string;
  includedSessionIds: string[];
  handledNotificationEventIds: string[];
}

export async function loadOrCreateOwnerSyncMetadata(
  activeSessionIds: string[],
): Promise<OwnerSyncMetadata> {
  try {
    const storedValue = await AsyncStorage.getItem(ownerSyncStorageKey);
    if (storedValue) {
      const value = JSON.parse(storedValue) as Partial<OwnerSyncMetadata>;
      if (typeof value.syncStartedAt === 'string') {
        return {
          version: 1,
          syncStartedAt: value.syncStartedAt,
          includedSessionIds: Array.isArray(value.includedSessionIds)
            ? value.includedSessionIds.filter((id): id is string => typeof id === 'string')
            : [],
          handledNotificationEventIds: Array.isArray(value.handledNotificationEventIds)
            ? value.handledNotificationEventIds.filter(
                (id): id is string => typeof id === 'string',
              )
            : [],
        };
      }
    }
  } catch {
    // Invalid metadata is replaced so local workout data remains usable.
  }

  const metadata: OwnerSyncMetadata = {
    version: 1,
    syncStartedAt: new Date().toISOString(),
    includedSessionIds: activeSessionIds,
    handledNotificationEventIds: [],
  };
  await saveOwnerSyncMetadata(metadata);
  return metadata;
}

export async function saveOwnerSyncMetadata(metadata: OwnerSyncMetadata): Promise<void> {
  await AsyncStorage.setItem(ownerSyncStorageKey, JSON.stringify({
    ...metadata,
    handledNotificationEventIds: metadata.handledNotificationEventIds.slice(-200),
  }));
}
