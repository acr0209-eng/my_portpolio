import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { sendExposureEvent } from './lib/exposureWatch.js'

const mergeKnowledgeDomains = (baseDomains = [], currentDomains = []) => {
  const domainMap = new Map(
    baseDomains.map((domain) => [domain.id, { ...domain, items: [...(domain.items || [])] }]),
  )

  currentDomains.forEach((domain) => {
    const existingDomain = domainMap.get(domain.id)
    if (!existingDomain) {
      domainMap.set(domain.id, { ...domain, items: [...(domain.items || [])] })
      return
    }

    const itemMap = new Map((existingDomain.items || []).map((item) => [item.id, item]))
    ;(domain.items || []).forEach((item) => {
      itemMap.set(item.id, { ...(itemMap.get(item.id) || {}), ...item })
    })

    domainMap.set(domain.id, {
      ...existingDomain,
      ...domain,
      items: [...itemMap.values()],
    })
  })

  return [...domainMap.values()]
}

const installCurrentContentOverlay = () => {
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' ? input : input?.url
    if (!requestUrl?.endsWith('knowledge-content.json')) {
      return originalFetch(input, init)
    }

    const currentUrl = requestUrl.replace(/knowledge-content\.json$/, 'knowledge-content-current.json')
    const [legacyResponse, currentResponse] = await Promise.all([
      originalFetch(input, init),
      originalFetch(currentUrl, init).catch(() => null),
    ])

    if (!legacyResponse.ok) return legacyResponse

    const legacyData = await legacyResponse.json()
    const currentData = currentResponse?.ok
      ? await currentResponse.json()
      : { notes: {} }

    return new Response(
      JSON.stringify({
        ...legacyData,
        updatedAt: currentData.updatedAt || legacyData.updatedAt,
        notes: {
          ...(legacyData.notes || {}),
          ...(currentData.notes || {}),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    )
  }
}

const syncDynamicStudyLabels = (knowledgeData) => {
  const root = document.getElementById('root')
  if (!root) return () => {}

  const updateLabels = () => {
    const totalItems = knowledgeData.totalItems
    const totalDomains = knowledgeData.domains.length

    const studyLink = document.querySelector('.hero-actions .text-link[href="#knowledge"]')
    const expectedStudyLabel = `STUDY ${totalItems} →`
    if (studyLink && studyLink.textContent !== expectedStudyLabel) {
      studyLink.textContent = expectedStudyLabel
    }

    const knowledgeIntro = document.querySelector('#knowledge .section-heading > p')
    const expectedIntro = `Notion 공부 기록 ${totalItems}개를 ${totalDomains}개 분야로 정리했습니다.`
    if (knowledgeIntro && knowledgeIntro.textContent !== expectedIntro) {
      knowledgeIntro.textContent = expectedIntro
    }
  }

  updateLabels()
  const observer = new MutationObserver(updateLabels)
  observer.observe(root, { childList: true, subtree: true })
  return () => observer.disconnect()
}

const bootstrap = async () => {
  const [{ default: knowledgeData }, { default: currentKnowledgeData }] = await Promise.all([
    import('./data/knowledge.json'),
    import('./data/knowledge-current.json'),
  ])

  knowledgeData.domains = mergeKnowledgeDomains(
    knowledgeData.domains,
    currentKnowledgeData.domains,
  ).map((domain, index) => ({
    ...domain,
    number: String(index + 1).padStart(2, '0'),
  }))

  knowledgeData.totalItems = knowledgeData.domains.reduce(
    (total, domain) => total + (domain.items?.length || 0),
    0,
  )
  knowledgeData.updatedAt = currentKnowledgeData.updatedAt || knowledgeData.updatedAt

  installCurrentContentOverlay()
  const { default: App } = await import('./App.jsx')

  sendExposureEvent()

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  syncDynamicStudyLabels(knowledgeData)
}

bootstrap().catch((error) => {
  console.error('Portfolio bootstrap failed:', error)
})
