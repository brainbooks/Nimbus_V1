import { useCallback, useMemo, useState } from "react";

// Tracks browser-to-server upload progress. The backend continues the transfer
// to Telegram after the request body reaches 100%, so completion is marked only
// when the API response arrives.
export default function useUploadProgress() {
  const [items, setItems] = useState({});

  const update = useCallback((id, progress, sent = 0, total = 0) => {
    const percent = Math.max(0, Math.min(100, Math.round(progress || 0)));
    setItems((current) => ({
      ...current,
      [id]: { id, percent, sent, total, finished: false },
    }));
  }, []);

  const finish = useCallback((id, total = 0) => {
    setItems((current) => ({
      ...current,
      [id]: {
        ...(current[id] || { id, sent: total, total }),
        percent: 100,
        sent: total || current[id]?.total || current[id]?.sent || 0,
        total: total || current[id]?.total || 0,
        finished: true,
      },
    }));
  }, []);

  const clear = useCallback((id) => {
    setItems((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const overallProgress = useMemo(() => {
    const values = Object.values(items);
    if (!values.length) return 0;
    const totalBytes = values.reduce((sum, item) => sum + (item.total || 0), 0);
    if (totalBytes > 0) {
      const sentBytes = values.reduce((sum, item) => sum + Math.min(item.sent || 0, item.total || 0), 0);
      return Math.round((sentBytes / totalBytes) * 100);
    }
    return Math.round(values.reduce((sum, item) => sum + item.percent, 0) / values.length);
  }, [items]);

  return { items, update, finish, clear, overallProgress };
}
