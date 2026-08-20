import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import './App.css';
import postsData from './data/posts.json';
import knowledgeData from './data/knowledge.json';
import { auth, db, isFirebaseConfigured, ownerUid } from './lib/firebase.js';

const githubUrl = 'https://github.com/acr0209-eng';
const tistoryUrl = 'https://uni0790.tistory.com';
const portfolioNotionUrl = 'https://app.notion.com/p/e1a3f93e21d58237bafe817d9035530d';

const emptyDraft = {
  title: '',
  slug: '',
  category: 'SECURITY NOTE',
  summary: '',
  body: '',
  coverImage: '',
  externalUrl: '',
  tags: '',
  published: true,
};

const focusTracks = [
  {
    number: '01',
    title: 'Infrastructure',
    label: '구조를 이해하기',
    description: 'Linux와 운영체제, 네트워크의 동작 원리를 실습으로 연결합니다.',
  },
  {
    number: '02',
    title: 'Cloud Security',
    label: '권한을 설계하기',
    description: '클라우드 환경의 접근 제어와 안전한 운영 구조를 탐구합니다.',
  },
  {
    number: '03',
    title: 'Human Factors',
    label: '우회를 줄이기',
    description: '사람의 행동과 업무 맥락을 고려해 실제로 지켜지는 보안을 고민합니다.',
  },
  {
    number: '04',
    title: 'Insider Risk',
    label: '맥락을 읽기',
    description: '자산 가치, 권한, 조직 책임을 함께 보며 내부자 위험을 분석합니다.',
  },
];

const learningItems = [
  'C',
  'Linux',
  'Operating Systems',
  'Network',
  'Secure Coding',
  'Web Security',
];

const experienceItems = [
  {
    period: 'NOW',
    title: '화이트햇 스쿨 4기',
    meta: 'Security Training',
    description: '시스템, 네트워크, 웹 보안의 기본기를 익히며 직접 실습하고 기록하는 교육 과정에 참여하고 있습니다.',
  },
  {
    period: 'ONGOING',
    title: '중앙대학교',
    meta: 'Industrial Security',
    description: '보안 기술, 조직, 정책, 데이터 분석을 함께 학습하며 보안 문제를 넓게 바라보는 관점을 쌓고 있습니다.',
  },
];

const principles = [
  '동작 원리를 먼저 이해합니다.',
  '작게라도 직접 구현합니다.',
  '기술과 조직의 맥락을 함께 봅니다.',
  '배운 것을 글로 남겨 다시 검증합니다.',
];

const notionPosts = postsData.map((post) => ({
  ...post,
  id: `notion-${post.id}`,
  createdAt: post.date,
  isNotion: true,
  published: true,
}));

const knowledgeItems = knowledgeData.domains.flatMap((domain) =>
  domain.items.map((item) => ({
    ...item,
    domainId: domain.id,
    domainTitle: domain.title,
    domainKorean: domain.korean,
  })),
);

const slugify = (value) => value
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^\p{L}\p{N}-]+/gu, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const getMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatDate = (value) => {
  const millis = getMillis(value);
  if (!millis) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(millis));
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const sortPosts = (items) => [...items].sort(
  (a, b) => getMillis(b.createdAt || b.updatedAt) - getMillis(a.createdAt || a.updatedAt),
);

function App() {
  const revealRefs = useRef([]);
  const [hash, setHash] = useState(window.location.hash || '#home');
  const [activeFilter, setActiveFilter] = useState('전체');
  const [activeDomain, setActiveDomain] = useState('all');
  const [activeKnowledgeType, setActiveKnowledgeType] = useState('ALL');
  const [publicPosts, setPublicPosts] = useState([]);
  const [adminPosts, setAdminPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(isFirebaseConfigured);
  const [firebaseError, setFirebaseError] = useState('');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedKnowledgeContent, setSelectedKnowledgeContent] = useState(null);
  const [knowledgeContentLoading, setKnowledgeContentLoading] = useState(false);
  const [knowledgeContentError, setKnowledgeContentError] = useState('');

  const addReveal = (element) => {
    if (element && !revealRefs.current.includes(element)) revealRefs.current.push(element);
  };

  useEffect(() => {
    const onHashChange = () => {
      const nextHash = window.location.hash || '#home';
      setHash(nextHash);
      if (nextHash.startsWith('#post/') || nextHash.startsWith('#note/') || nextHash === '#admin') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const observer = typeof IntersectionObserver === 'function' && !prefersReducedMotion
      ? new IntersectionObserver(
        (entries) => entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        }),
        { threshold: 0.12 },
      )
      : null;

    revealRefs.current.forEach((element) => {
      if (prefersReducedMotion || !observer) element.classList.add('visible');
      else observer.observe(element);
    });

    return () => observer?.disconnect();
  }, [hash, activeFilter, activeDomain, activeKnowledgeType, loadingPosts]);

  useEffect(() => {
    if (!db) {
      setLoadingPosts(false);
      return undefined;
    }
    const publicQuery = query(collection(db, 'posts'), where('published', '==', true));
    return onSnapshot(
      publicQuery,
      (snapshot) => {
        setPublicPosts(sortPosts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
        setLoadingPosts(false);
        setFirebaseError('');
      },
      (error) => {
        setFirebaseError(`글을 불러오지 못했습니다. ${error.message}`);
        setLoadingPosts(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser && ownerUid && nextUser.uid !== ownerUid) {
        await signOut(auth);
        setAuthError('이 계정은 관리자 계정이 아닙니다.');
        setUser(null);
      } else {
        setUser(nextUser);
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!db || !user || user.uid !== ownerUid) {
      setAdminPosts([]);
      return undefined;
    }
    return onSnapshot(
      collection(db, 'posts'),
      (snapshot) => setAdminPosts(sortPosts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))),
      (error) => setStatusMessage(`관리자 글 목록 오류: ${error.message}`),
    );
  }, [user]);

  const displayedPosts = useMemo(() => {
    const seen = new Set();
    return sortPosts([...publicPosts, ...notionPosts]).filter((post) => {
      const key = post.slug || post.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [publicPosts]);

  const categories = useMemo(
    () => ['전체', ...new Set(displayedPosts.map((post) => post.category).filter(Boolean))],
    [displayedPosts],
  );
  const filteredPosts = activeFilter === '전체'
    ? displayedPosts
    : displayedPosts.filter((post) => post.category === activeFilter);
  const featuredPost = displayedPosts.find((post) => post.featured) || displayedPosts[0];
  const archivePosts = activeFilter === '전체'
    ? filteredPosts.filter((post) => post.id !== featuredPost?.id)
    : filteredPosts;
  const selectedDomain = knowledgeData.domains.find((domain) => domain.id === activeDomain);
  const visibleKnowledgeItems = selectedDomain
    ? selectedDomain.items.filter((item) => activeKnowledgeType === 'ALL' || item.type === activeKnowledgeType)
    : [];

  const isAdminRoute = hash === '#admin';
  const canUseAdmin = isFirebaseConfigured && Boolean(ownerUid);
  const postSlug = hash.startsWith('#post/') ? decodeURIComponent(hash.slice(6)) : null;
  const knowledgeSlug = hash.startsWith('#note/') ? decodeURIComponent(hash.slice(6)) : null;
  const selectedPost = postSlug
    ? displayedPosts.find((post) => post.slug === postSlug || post.id === postSlug)
    : null;
  const selectedKnowledgeItem = knowledgeSlug
    ? knowledgeItems.find((item) => item.slug === knowledgeSlug || item.id === knowledgeSlug)
    : null;

  useEffect(() => {
    if (!knowledgeSlug || !selectedKnowledgeItem?.hasContent) {
      setSelectedKnowledgeContent(null);
      setKnowledgeContentLoading(false);
      setKnowledgeContentError('');
      return undefined;
    }

    const controller = new AbortController();
    setSelectedKnowledgeContent(null);
    setKnowledgeContentLoading(true);
    setKnowledgeContentError('');

    fetch(`${import.meta.env.BASE_URL}knowledge-content.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const note = data.notes?.[knowledgeSlug];
        if (!note) throw new Error('본문 데이터가 없습니다.');
        setSelectedKnowledgeContent(note);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setKnowledgeContentError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setKnowledgeContentLoading(false);
      });

    return () => controller.abort();
  }, [knowledgeSlug, selectedKnowledgeItem]);

  const scrollToKnowledge = (selector = '#knowledge') => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.querySelector(selector)?.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError('');
    if (!auth || !ownerUid) {
      setAuthError('Firebase 설정과 관리자 UID를 먼저 등록해야 합니다.');
      return;
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user.uid !== ownerUid) {
        await signOut(auth);
        setAuthError('이 계정은 관리자 계정이 아닙니다.');
      }
    } catch (error) {
      setAuthError(`로그인 실패: ${error.message}`);
    }
  };

  const resetEditor = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setStatusMessage('');
  };

  const handleEdit = (post) => {
    setEditingId(post.id);
    setDraft({
      title: post.title || '',
      slug: post.slug || '',
      category: post.category || 'SECURITY NOTE',
      summary: post.summary || '',
      body: post.body || '',
      coverImage: post.coverImage || '',
      externalUrl: post.externalUrl || '',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      published: post.published !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!db || !user || user.uid !== ownerUid) return;

    const resolvedSlug = slugify(draft.slug || draft.title);
    const externalUrl = draft.externalUrl.trim();
    if (!draft.title.trim() || !draft.summary.trim() || !resolvedSlug) {
      setStatusMessage('제목과 요약을 입력해 주세요. 제목으로 slug를 만들 수 없으면 slug도 입력해 주세요.');
      return;
    }
    if (!externalUrl && !draft.body.trim()) {
      setStatusMessage('외부 글 URL이 없으면 본문을 입력해 주세요.');
      return;
    }
    if (externalUrl && !isHttpUrl(externalUrl)) {
      setStatusMessage('외부 글 URL은 http:// 또는 https://로 시작해야 합니다.');
      return;
    }

    setSaving(true);
    setStatusMessage('');
    const payload = {
      title: draft.title.trim(),
      slug: resolvedSlug,
      category: draft.category.trim() || 'SECURITY NOTE',
      summary: draft.summary.trim(),
      body: draft.body.trim(),
      coverImage: draft.coverImage.trim(),
      externalUrl,
      tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      published: Boolean(draft.published),
      ownerUid: user.uid,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'posts', editingId), payload);
        setStatusMessage('글을 수정했습니다.');
      } else {
        await addDoc(collection(db, 'posts'), { ...payload, createdAt: serverTimestamp() });
        setStatusMessage('새 글을 저장했습니다.');
      }
      setDraft(emptyDraft);
      setEditingId(null);
    } catch (error) {
      setStatusMessage(`저장 실패: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post) => {
    if (!db || !user || user.uid !== ownerUid) return;
    if (!window.confirm(`"${post.title}" 글을 삭제할까요?`)) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      if (editingId === post.id) resetEditor();
      setStatusMessage('글을 삭제했습니다.');
    } catch (error) {
      setStatusMessage(`삭제 실패: ${error.message}`);
    }
  };

  const renderShell = (content) => (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      {content}
    </div>
  );

  const renderHeader = (backLink) => (
    <header className="topbar">
      <div className="wide-container nav">
        <a className="brand-link" href="#home" aria-label="이재원 포트폴리오 홈">
          <span className="brand-mark">JW</span>
          <span className="brand-copy">
            <strong>JAEWON LEE</strong>
            <small>INDUSTRIAL SECURITY</small>
          </span>
        </a>
        {backLink ? (
          <a className="nav-back" href={backLink.href}>{backLink.label} <span>↗</span></a>
        ) : (
          <nav className="nav-links" aria-label="주요 메뉴">
            <a href="#about">ABOUT</a>
            <a href="#work">WORK</a>
            <a href="#knowledge">KNOWLEDGE</a>
            <a href="#focus">FOCUS</a>
            <a href="#experience">JOURNEY</a>
          </nav>
        )}
      </div>
    </header>
  );

  if (knowledgeSlug) {
    return renderShell(
      <>
        {renderHeader({ href: '#knowledge', label: 'BACK TO ATLAS' })}
        <main id="main-content" className="article-page knowledge-article-page">
          {!selectedKnowledgeItem ? (
            <div className="container empty-page">
              <p className="section-kicker">404 / NOTE NOT FOUND</p>
              <h1>학습 기록을 찾을 수 없습니다.</h1>
              <a className="primary-button" href="#knowledge">Knowledge Atlas로 돌아가기</a>
            </div>
          ) : (
            <>
              <section className="article-hero knowledge-article-hero">
                <div className="container">
                  <div className="article-breadcrumb">
                    <span>{selectedKnowledgeItem.type}</span>
                    <span>{selectedKnowledgeItem.domainTitle}</span>
                  </div>
                  <h1>{selectedKnowledgeItem.title}</h1>
                  <p className="article-summary">{selectedKnowledgeItem.summary}</p>
                  <div className="article-facts">
                    <div><span>DATE</span><strong>{selectedKnowledgeItem.date.replaceAll('-', '.')}</strong></div>
                    <div><span>TYPE</span><strong>{selectedKnowledgeItem.type}</strong></div>
                    <div><span>DOMAIN</span><strong>{selectedKnowledgeItem.domainKorean}</strong></div>
                  </div>
                </div>
              </section>
              <section className="article-body-section">
                <div className="article-layout container">
                  <aside className="article-aside">
                    <p className="micro-label">KNOWLEDGE NOTE</p>
                    <p>{selectedKnowledgeItem.hasContent ? 'FULL STUDY NOTE' : 'NOTION INDEX'}</p>
                    <div className="tag-list">
                      <span>{selectedKnowledgeItem.type}</span>
                      <span>{selectedKnowledgeItem.domainTitle}</span>
                    </div>
                  </aside>
                  <article className="article-content">
                    <div className="markdown-body knowledge-markdown-body">
                      {knowledgeContentLoading && <p className="content-status">Notion 학습 내용을 불러오는 중입니다…</p>}
                      {knowledgeContentError && (
                        <p className="content-status content-status-error">본문을 불러오지 못했습니다. 아래 Notion 원문을 이용해 주세요.</p>
                      )}
                      {selectedKnowledgeContent?.body && <ReactMarkdown>{selectedKnowledgeContent.body}</ReactMarkdown>}
                      {!selectedKnowledgeItem.hasContent && (
                        <>
                          <h2>기록 개요</h2>
                          <p>{selectedKnowledgeItem.summary}</p>
                          <p>프로젝트·실습·보고서 원문은 아래 Notion 출처에서 확인할 수 있습니다.</p>
                        </>
                      )}
                    </div>
                    <div className="source-panel">
                      <div>
                        <p className="micro-label">SOURCE / NOTION</p>
                        <h2>원문과 전체 아카이브</h2>
                      </div>
                      <div className="source-actions">
                        <a className="primary-button" href={selectedKnowledgeItem.notionUrl} target="_blank" rel="noreferrer">Notion 원문 보기 ↗</a>
                        <a className="outline-button" href="#knowledge">Atlas로 돌아가기</a>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </>
          )}
        </main>
      </>,
    );
  }

  if (postSlug) {
    return renderShell(
      <>
        {renderHeader({ href: '#work', label: 'BACK TO WORK' })}
        <main id="main-content" className="article-page">
          {!selectedPost ? (
            <div className="container empty-page">
              <p className="section-kicker">404 / CASE NOT FOUND</p>
              <h1>기록을 찾을 수 없습니다.</h1>
              <a className="primary-button" href="#work">작업 목록으로 돌아가기</a>
            </div>
          ) : (
            <>
              <section className="article-hero">
                <div className="container">
                  <div className="article-breadcrumb">
                    <span>{selectedPost.category || 'WRITING'}</span>
                    <span>{selectedPost.isNotion ? 'NOTION ARCHIVE' : 'PORTFOLIO NOTE'}</span>
                  </div>
                  <h1>{selectedPost.title}</h1>
                  <p className="article-summary">{selectedPost.summary}</p>
                  <div className="article-facts">
                    <div><span>DATE</span><strong>{formatDate(selectedPost.createdAt || selectedPost.updatedAt) || 'ONGOING'}</strong></div>
                    <div><span>TYPE</span><strong>{selectedPost.category || 'WRITING'}</strong></div>
                    <div><span>TOPICS</span><strong>{selectedPost.tags?.length || 0}</strong></div>
                  </div>
                </div>
              </section>
              <section className="article-body-section">
                <div className="article-layout container">
                  <aside className="article-aside">
                    <p className="micro-label">CASE INDEX</p>
                    <p>{String(displayedPosts.findIndex((post) => post.id === selectedPost.id) + 1).padStart(2, '0')} / {String(displayedPosts.length).padStart(2, '0')}</p>
                    {selectedPost.tags?.length > 0 && (
                      <div className="tag-list">
                        {selectedPost.tags.map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                    )}
                  </aside>
                  <article className="article-content">
                    {selectedPost.coverImage && <img className="article-cover" src={selectedPost.coverImage} alt="" />}
                    <div className="markdown-body">
                      <ReactMarkdown>{selectedPost.body || '이 기록은 외부 원문에서 확인할 수 있습니다.'}</ReactMarkdown>
                    </div>
                    <div className="source-panel">
                      <div>
                        <p className="micro-label">KEEP EXPLORING</p>
                        <h2>전체 기록과 원문 보기</h2>
                      </div>
                      <div className="source-actions">
                        {(selectedPost.sourceUrl || selectedPost.externalUrl) && (
                          <a className="primary-button" href={selectedPost.sourceUrl || selectedPost.externalUrl} target="_blank" rel="noreferrer">원문 보기 ↗</a>
                        )}
                        {selectedPost.notionUrl && (
                          <a className="outline-button" href={selectedPost.notionUrl} target="_blank" rel="noreferrer">Notion 출처 ↗</a>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </>
          )}
        </main>
      </>,
    );
  }

  if (isAdminRoute) {
    return renderShell(
      <>
        {renderHeader({ href: '#home', label: 'BACK HOME' })}
        <main id="main-content" className="admin-page container">
          <p className="section-kicker">PRIVATE / CONTENT SYSTEM</p>
          <h1>Portfolio CMS</h1>
          <p className="admin-intro">Firebase 계정으로 로그인한 관리자만 글을 작성, 수정, 삭제할 수 있습니다.</p>

          {!canUseAdmin && (
            <div className="setup-notice" id="firebaseSetupHelp">
              Firebase 설정이 아직 비어 있습니다. <code>.env</code>에 Firebase Web App 값과 관리자 UID를 입력해 주세요.
            </div>
          )}

          {canUseAdmin && authLoading ? (
            <div className="empty-state">로그인 상태를 확인하는 중입니다.</div>
          ) : !user ? (
            <form className="admin-login" onSubmit={handleLogin} aria-describedby={!canUseAdmin ? 'firebaseSetupHelp' : undefined}>
              <label>
                <span>EMAIL</span>
                <input className="form-input" type="email" placeholder="관리자 이메일" value={email} onChange={(event) => setEmail(event.target.value)} disabled={!canUseAdmin} required />
              </label>
              <label>
                <span>PASSWORD</span>
                <input className="form-input" type="password" placeholder="비밀번호" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!canUseAdmin} required />
              </label>
              <button className="primary-button" type="submit" disabled={!canUseAdmin}>LOGIN</button>
              {!canUseAdmin && <p className="form-error">Firebase 설정을 추가한 뒤 로그인할 수 있습니다.</p>}
              {authError && <p className="form-error">{authError}</p>}
            </form>
          ) : (
            <div className="cms-layout">
              <section className="editor-panel">
                <div className="cms-heading-row">
                  <h2>{editingId ? '글 수정' : '새 글 작성'}</h2>
                  <button className="text-button" type="button" onClick={() => signOut(auth)}>로그아웃</button>
                </div>
                <form className="cms-form" onSubmit={handleSave}>
                  <input className="form-input" placeholder="제목" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
                  <input className="form-input" placeholder="slug (비우면 제목으로 자동 생성)" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
                  <input className="form-input" placeholder="분류" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
                  <textarea className="form-input cms-summary" placeholder="목록에 표시할 요약" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} required />
                  <input className="form-input" placeholder="대표 이미지 URL (선택)" value={draft.coverImage} onChange={(event) => setDraft({ ...draft, coverImage: event.target.value })} />
                  <input className="form-input" placeholder="외부 글 URL (선택)" value={draft.externalUrl} onChange={(event) => setDraft({ ...draft, externalUrl: event.target.value })} />
                  <input className="form-input" placeholder="태그: 보안, 데이터, 프로젝트" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} />
                  <textarea className="form-input cms-body-input" placeholder="Markdown으로 본문을 작성하세요." value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} required={!draft.externalUrl.trim()} />
                  <label className="publish-toggle">
                    <input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} />
                    공개 글로 게시
                  </label>
                  <div className="editor-actions">
                    <button className="primary-button" type="submit" disabled={saving}>{saving ? 'SAVING...' : editingId ? 'UPDATE' : 'PUBLISH'}</button>
                    {editingId && <button className="outline-button" type="button" onClick={resetEditor}>취소</button>}
                  </div>
                  {statusMessage && <p className="status-message">{statusMessage}</p>}
                </form>
                <div className="markdown-preview">
                  <p className="micro-label">MARKDOWN PREVIEW</p>
                  <ReactMarkdown>{draft.body || '*본문 미리보기가 여기에 표시됩니다.*'}</ReactMarkdown>
                </div>
              </section>

              <section className="post-manager">
                <h2>저장된 글</h2>
                {adminPosts.length === 0 ? (
                  <div className="empty-state">아직 Firebase에 저장된 글이 없습니다.</div>
                ) : adminPosts.map((post) => (
                  <div className="manager-card" key={post.id}>
                    <div>
                      <p className="micro-label">{post.published ? 'PUBLIC' : 'PRIVATE'} / {post.category || 'WRITING'}</p>
                      <h3>{post.title}</h3>
                      <p>{post.summary}</p>
                    </div>
                    <div className="manager-actions">
                      <button className="outline-button" type="button" onClick={() => handleEdit(post)}>수정</button>
                      <button className="danger-button" type="button" onClick={() => handleDelete(post)}>삭제</button>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}
        </main>
      </>,
    );
  }

  return renderShell(
    <>
      {renderHeader()}
      <main id="main-content">
        <section id="home" className="hero-section">
          <div className="wide-container hero-layout">
            <div className="hero-copy reveal" ref={addReveal}>
              <div className="hero-status">
                <span className="status-dot" />
                LEARNING MODE / ACTIVE
              </div>
              <h1>
                기술과 조직 사이에서,
                <span>우회되지 않는 보안</span>을 탐구합니다.
              </h1>
              <p className="hero-lead">
                산업보안을 전공하며 인프라·클라우드·네트워크 보안을 배우고,
                직접 실습한 과정과 판단의 근거를 기록합니다.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#work">SELECTED WORK <span>↓</span></a>
                <a className="text-link" href={githubUrl} target="_blank" rel="noreferrer">GITHUB ↗</a>
              </div>
            </div>

            <div className="hero-instrument reveal" ref={addReveal}>
              <div className="instrument-header">
                <span>FIELD NOTE / 2026</span>
                <span>SEOUL, KR</span>
              </div>
              <div className="radar-wrap" aria-hidden="true">
                <div className="radar">
                  <span className="radar-axis radar-axis-x" />
                  <span className="radar-axis radar-axis-y" />
                  <span className="radar-ring radar-ring-one" />
                  <span className="radar-ring radar-ring-two" />
                  <span className="radar-pulse" />
                </div>
                <div className="radar-label label-one">PEOPLE</div>
                <div className="radar-label label-two">SYSTEM</div>
                <div className="radar-label label-three">POLICY</div>
              </div>
              <div className="instrument-readout">
                <div><span>FOCUS</span><strong>INDUSTRIAL SECURITY</strong></div>
                <div><span>METHOD</span><strong>LEARN · BUILD · WRITE</strong></div>
              </div>
            </div>
          </div>
          <div className="hero-strip" aria-label="관심 분야">
            <span>INFRASTRUCTURE SECURITY</span>
            <i />
            <span>CLOUD SECURITY</span>
            <i />
            <span>HUMAN FACTORS</span>
            <i />
            <span>INSIDER RISK</span>
          </div>
        </section>

        <section id="about" className="section about-section">
          <div className="container">
            <div className="section-intro reveal" ref={addReveal}>
              <p className="section-kicker">01 / ABOUT</p>
              <h2>보안은 기술만의 문제가<br />아니라고 믿습니다.</h2>
            </div>
            <div className="about-grid">
              <div className="about-statement reveal" ref={addReveal}>
                <p>
                  중앙대학교에서 산업보안을 전공하며 기술, 조직, 정책이 만나는 지점을 공부하고 있습니다.
                  아직 완성된 전문가라기보다, 배운 내용을 손으로 확인하고 글로 설명할 수 있는 사람으로 성장하는 중입니다.
                </p>
                <div className="profile-note">
                  <span className="profile-monogram">이재원</span>
                  <div>
                    <strong>Industrial Security Student</strong>
                    <small>Chung-Ang University</small>
                  </div>
                </div>
              </div>
              <ol className="principle-list reveal" ref={addReveal}>
                {principles.map((principle, index) => (
                  <li key={principle}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{principle}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="work" className="section work-section">
          <div className="container">
            <div className="section-heading reveal" ref={addReveal}>
              <div>
                <p className="section-kicker">02 / SELECTED WORK</p>
                <h2>Case files & field notes</h2>
              </div>
              <p>Notion에서 관리하던 공개 프로젝트와 학습 기록을 포트폴리오 안에서 읽을 수 있도록 정리했습니다.</p>
            </div>

            <div className="filter-bar" role="group" aria-label="글 분류">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={activeFilter === category ? 'active' : ''}
                  onClick={() => setActiveFilter(category)}
                  aria-pressed={activeFilter === category}
                >
                  {category}
                  <sup>{category === '전체' ? displayedPosts.length : displayedPosts.filter((post) => post.category === category).length}</sup>
                </button>
              ))}
            </div>

            {loadingPosts && <div className="empty-state">새 기록을 불러오는 중입니다.</div>}
            {firebaseError && <div className="setup-notice">{firebaseError}</div>}

            {activeFilter === '전체' && featuredPost && (
              <article className="featured-case reveal" ref={addReveal}>
                <div className="featured-visual">
                  <div className="ui-study-card ui-study-before">
                    <span>BEFORE</span>
                    <div className="fake-window">
                      <i /><i /><i />
                      <strong>보안 경고</strong>
                      <small>복잡한 절차와 불분명한 선택지</small>
                    </div>
                  </div>
                  <div className="ui-study-card ui-study-after">
                    <span>AFTER</span>
                    <div className="fake-window">
                      <i /><i /><i />
                      <strong>안전한 다음 단계</strong>
                      <small>맥락을 설명하는 명확한 흐름</small>
                    </div>
                  </div>
                  <span className="study-axis">HUMAN FACTOR / SECURITY CONTROL</span>
                </div>
                <div className="featured-copy">
                  <p className="case-meta">FEATURED / {featuredPost.category}</p>
                  <h3>{featuredPost.title}</h3>
                  <p>{featuredPost.summary}</p>
                  <div className="tag-list">
                    {featuredPost.tags?.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <a className="case-link" href={`#post/${encodeURIComponent(featuredPost.slug || featuredPost.id)}`}>
                    CASE STUDY <span>↗</span>
                  </a>
                </div>
              </article>
            )}

            <div className="case-grid">
              {archivePosts.map((post, index) => (
                <article className="case-card reveal" data-category={post.category} key={post.id} ref={addReveal}>
                  <div className="case-card-top">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span>{post.isNotion ? 'NOTION ARCHIVE' : 'FIELD NOTE'}</span>
                  </div>
                  <div>
                    <p className="case-meta">{post.category || 'WRITING'}</p>
                    <h3>{post.title}</h3>
                    <p className="case-summary">{post.summary}</p>
                  </div>
                  <div className="case-card-bottom">
                    <div className="tag-list">
                      {post.tags?.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                    <a className="case-link" href={`#post/${encodeURIComponent(post.slug || post.id)}`} aria-label={`${post.title} 읽기`}>↗</a>
                  </div>
                </article>
              ))}
            </div>
            {archivePosts.length === 0 && <div className="empty-state">이 분류의 기록은 아직 없습니다.</div>}
          </div>
        </section>

        <section id="knowledge" className="section knowledge-section">
          <div className="container">
            <div className="section-heading reveal" ref={addReveal}>
              <div>
                <p className="section-kicker">03 / KNOWLEDGE ATLAS</p>
                <h2>Notion, mapped by domain</h2>
              </div>
              <p>
                Notion의 주요 학습 영역을 6개 도메인과 6개 기록 형식으로 다시 분류했습니다.
                프로젝트만이 아니라 강의 노트, 실습, 보고서, 분석 기록까지 한 흐름에서 볼 수 있습니다.
              </p>
            </div>

            <div className="atlas-summary reveal" ref={addReveal}>
              <div>
                <strong>{knowledgeData.totalItems}</strong>
                <span>MAPPED NOTES</span>
              </div>
              <div>
                <strong>{knowledgeData.domains.length}</strong>
                <span>SECURITY DOMAINS</span>
              </div>
              <div>
                <strong>{knowledgeData.contentTypes.length}</strong>
                <span>CONTENT TYPES</span>
              </div>
              <div className="atlas-legend">
                {knowledgeData.contentTypes.map((type) => <span key={type}>{type}</span>)}
              </div>
            </div>

            {activeDomain === 'all' ? (
              <div className="domain-grid">
                {knowledgeData.domains.map((domain) => (
                  <button
                    className="domain-card reveal"
                    type="button"
                    key={domain.id}
                    ref={addReveal}
                    onClick={() => {
                      setActiveDomain(domain.id);
                      setActiveKnowledgeType('ALL');
                      scrollToKnowledge('.atlas-detail');
                    }}
                  >
                    <div className="domain-card-top">
                      <span>{domain.number}</span>
                      <strong>{String(domain.items.length).padStart(2, '0')}</strong>
                    </div>
                    <p className="domain-korean">{domain.korean}</p>
                    <h3>{domain.title}</h3>
                    <p className="domain-description">{domain.description}</p>
                    <div className="domain-keywords">
                      {domain.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
                    </div>
                    <div className="domain-preview">
                      {domain.items.slice(0, 3).map((item) => (
                        <span key={item.title}>{item.title}</span>
                      ))}
                    </div>
                    <span className="domain-open">OPEN COLLECTION ↗</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="atlas-detail">
                <div className="atlas-detail-header">
                  <button
                    className="atlas-back"
                    type="button"
                    onClick={() => {
                      setActiveDomain('all');
                      setActiveKnowledgeType('ALL');
                      scrollToKnowledge();
                    }}
                  >
                    ← ALL DOMAINS
                  </button>
                  <div>
                    <p className="section-kicker">{selectedDomain.number} / {selectedDomain.korean}</p>
                    <h3>{selectedDomain.title}</h3>
                    <p>{selectedDomain.description}</p>
                  </div>
                  <strong>{selectedDomain.items.length}</strong>
                </div>

                <div className="type-filter" role="group" aria-label="기록 형식">
                  <button
                    type="button"
                    className={activeKnowledgeType === 'ALL' ? 'active' : ''}
                    onClick={() => setActiveKnowledgeType('ALL')}
                  >
                    ALL <sup>{selectedDomain.items.length}</sup>
                  </button>
                  {knowledgeData.contentTypes
                    .filter((type) => selectedDomain.items.some((item) => item.type === type))
                    .map((type) => (
                      <button
                        type="button"
                        key={type}
                        className={activeKnowledgeType === type ? 'active' : ''}
                        onClick={() => setActiveKnowledgeType(type)}
                      >
                        {type} <sup>{selectedDomain.items.filter((item) => item.type === type).length}</sup>
                      </button>
                    ))}
                </div>

                <div className="knowledge-note-list">
                  {visibleKnowledgeItems.map((item, index) => (
                    <a
                      key={item.id}
                      className="knowledge-note"
                      href={`#note/${item.slug}`}
                      aria-label={`${item.title} 상세 보기`}
                    >
                      <span className="note-index">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <span className="note-type">{item.type}</span>
                        <h4>{item.title}</h4>
                      </div>
                      <div className="note-meta">
                        <time dateTime={item.date}>{item.date.replaceAll('-', '.')}</time>
                        <span className="note-open">READ ↗</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="focus" className="section focus-section">
          <div className="container">
            <div className="section-intro light reveal" ref={addReveal}>
              <p className="section-kicker">04 / FOCUS</p>
              <h2>What I’m building toward</h2>
            </div>
            <div className="focus-grid">
              {focusTracks.map((track) => (
                <article className="focus-card reveal" key={track.number} ref={addReveal}>
                  <div className="focus-number">{track.number}</div>
                  <p className="focus-label">{track.label}</p>
                  <h3>{track.title}</h3>
                  <p>{track.description}</p>
                </article>
              ))}
            </div>
            <div className="learning-ribbon reveal" ref={addReveal}>
              <p>CURRENTLY LEARNING</p>
              <div>
                {learningItems.map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="section journey-section">
          <div className="container">
            <div className="section-heading reveal" ref={addReveal}>
              <div>
                <p className="section-kicker">05 / JOURNEY</p>
                <h2>Learning in public</h2>
              </div>
              <p>교육과 전공 수업에서 배운 개념을 실습, 프로젝트, 글로 연결하고 있습니다.</p>
            </div>
            <div className="journey-list">
              {experienceItems.map((item, index) => (
                <article className="journey-item reveal" key={item.title} ref={addReveal}>
                  <span className="journey-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="journey-when">{item.period}</div>
                  <div className="journey-title">
                    <p>{item.meta}</p>
                    <h3>{item.title}</h3>
                  </div>
                  <p className="journey-description">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section">
          <div className="container contact-card reveal" ref={addReveal}>
            <div>
              <p className="section-kicker">06 / CONNECT</p>
              <h2>기록은 계속<br />업데이트됩니다.</h2>
            </div>
            <div className="contact-copy">
              <p>새로운 실습, 보안 사례 분석, 프로젝트 과정을 GitHub와 Tistory에 꾸준히 남기고 있습니다.</p>
              <div className="contact-links">
                <a href={githubUrl} target="_blank" rel="noreferrer">GITHUB <span>↗</span></a>
                <a href={tistoryUrl} target="_blank" rel="noreferrer">TISTORY <span>↗</span></a>
                <a href={portfolioNotionUrl} target="_blank" rel="noreferrer">NOTION <span>↗</span></a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wide-container">
          <div className="footer-brand">
            <span className="brand-mark">JW</span>
            <p>기술과 조직의 맥락을 함께 이해하는 보안을 공부합니다.</p>
          </div>
          <div className="footer-meta">
            <span>© 2026 JAEWON LEE</span>
            <a href="#admin" aria-label="관리자 페이지">ADMIN</a>
            <a href="#home">BACK TO TOP ↑</a>
          </div>
        </div>
      </footer>
    </>,
  );
}

export default App;
