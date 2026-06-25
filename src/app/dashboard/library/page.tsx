import { Suspense } from 'react'
import LibraryContent from './LibraryContent'

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  )
}
