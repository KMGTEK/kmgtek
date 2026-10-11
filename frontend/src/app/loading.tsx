import { FullPageLoader } from '@/components/shared/loading-skeletons';

/** Root Suspense fallback, shown while a segment streams in. */
export default function Loading() {
  return <FullPageLoader />;
}
