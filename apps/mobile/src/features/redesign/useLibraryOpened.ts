import { useEffect, useRef } from 'react';
import { useListPreferences } from './useListPreferences';
import { useAuth } from '../../auth';

export function useLibraryOpened(id: string | null | undefined) {
  const { markOpened } = useListPreferences();
  const { session } = useAuth();
  const owner = session?.user.id;
  const recorded = useRef('');
  useEffect(() => {
    const identity = owner && id ? owner + ':' + id : '';
    if (identity && recorded.current !== identity) { recorded.current = identity; markOpened(id!); }
  }, [owner, id, markOpened]);
}
