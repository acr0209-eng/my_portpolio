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
import heroImage from './assets/hero.png';
import postsData from './data/posts.json';
import { auth, db, isFirebaseConfigured, ownerUid } from './lib/firebase.js';

const githubUrl = 'https://github.com/acr0209-eng';
const tistoryUrl = 'https://uni0790.tistory.com';
const emailAddress = 'uni0790@naver.com';

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

const interests = [
  'Infrastructure Security',
  'Cloud Security',
  'Network Security',
  'Industrial Security',
  'Insider Risk',
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
    title: '중앙대학교',
    meta: '산업보안 전공',
    description: '보안 기술, 조직, 정책, 데이터 분석을 함께 학습하며 보안 문제를 넓게 바라보는 관점을 쌓고 있습니다.',
  },
  {
    title: '화이트햇 스쿨 4기',
    meta: '보안 기초와 실무 역량 학습',
    description: '시스템, 네트워크, 웹 보안의 기본기를 익히며 직접 실습하고 기록하는 교육 과정에 참여하고 있습니다.',
  },
];

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
    month: 'long',
    day: 'numeric',
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

const isTistoryUrl = (value) => {
  try {
    return new URL(value).hostname.includes('tistory.com');
  } catch {
    return false;
  }
};

const sortPosts = (items) => [...items].sort(
  (a, b) => getMillis(b.createdAt || b.updatedAt) - getMillis(a.createdAt || a.updatedAt),
);

const legacyPosts = postsData.map((post) => ({
  ...post,
  id: `legacy-${post.id}`,
  category: 'TISTORY ARCHIVE',
  summary: post.desc,
  externalUrl: post.url,
  isLegacy: true,
  published: true,
}));

function App() {
  const canvasRef = useRef(null);
  const revealRefs = useRef([]);

  const [hash, setHash] = useState(window.location.hash || '#home');
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

  const addReveal = (el) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#home');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const observer = typeof IntersectionObserver === 'function' && !prefersReducedMotion
      ? new IntersectionObserver(
        (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible')),
        { threshold: 0.15 },
      )
      : null;

    revealRefs.current.forEach((el) => {
      if (prefersReducedMotion || !observer) el.classList.add('visible');
      else observer.observe(el);
    });

    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion) {
      return () => observer?.disconnect();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return () => observer?.disconnect();
    }

    let particles = [];
    let frameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: 34 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.random() * 0.12 - 0.06,
        vy: Math.random() * 0.12 - 0.06,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x > canvas.width) particle.x = 0;
        else if (particle.x < 0) particle.x = canvas.width;
        if (particle.y > canvas.height) particle.y = 0;
        else if (particle.y < 0) particle.y = canvas.height;
        ctx.fillStyle = 'rgba(59,130,246,0.16)';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      });
      frameId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

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

  const displayedPosts = useMemo(() => [...publicPosts, ...legacyPosts], [publicPosts]);
  const isAdminRoute = hash === '#admin';
  const canUseAdmin = isFirebaseConfigured && Boolean(ownerUid);
  const postSlug = hash.startsWith('#post/') ? decodeURIComponent(hash.slice(6)) : null;
  const selectedPost = postSlug
    ? publicPosts.find((post) => post.slug === postSlug || post.id === postSlug)
    : null;

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
    <>
      <div id="bg-grain" />
      <canvas id="bg-canvas" ref={canvasRef} />
      {content}
    </>
  );

  if (postSlug) {
    return renderShell(
      <>
        <header className="topbar">
          <div className="container nav">
            <a className="brand-link" href="#home">LEE JAE WON</a>
            <a href="#writings">BACK TO WRITINGS</a>
          </div>
        </header>
        <main className="article-page container">
          {!selectedPost ? (
            <div className="empty-state">
              <h1>글을 찾을 수 없습니다.</h1>
              <a className="explore-btn" href="#writings">목록으로 돌아가기</a>
            </div>
          ) : (
            <article className="article-card">
              <div className="article-meta">
                {selectedPost.category || 'WRITING'} · {formatDate(selectedPost.createdAt || selectedPost.updatedAt)}
              </div>
              <h1>{selectedPost.title}</h1>
              <p className="article-summary">{selectedPost.summary}</p>
              {selectedPost.coverImage && <img className="article-cover" src={selectedPost.coverImage} alt="" />}
              <div className="markdown-body">
                <ReactMarkdown>{selectedPost.body || ''}</ReactMarkdown>
              </div>
              {selectedPost.tags?.length > 0 && (
                <div className="tag-list">{selectedPost.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              )}
            </article>
          )}
        </main>
      </>,
    );
  }

  if (isAdminRoute) {
    return renderShell(
      <>
        <header className="topbar">
          <div className="container nav">
            <a className="brand-link" href="#home">LEE JAE WON</a>
            <a href="#home">HOME</a>
          </div>
        </header>
        <main className="admin-page container">
          <h1>PORTFOLIO CMS</h1>
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
              <input className="log-input" type="email" placeholder="관리자 이메일" value={email} onChange={(event) => setEmail(event.target.value)} disabled={!canUseAdmin} required />
              <input className="log-input" type="password" placeholder="비밀번호" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!canUseAdmin} required />
              <button className="btn-tesla" type="submit" disabled={!canUseAdmin}>LOGIN</button>
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
                  <input className="log-input" placeholder="제목" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
                  <input className="log-input" placeholder="slug (비우면 제목으로 자동 생성)" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
                  <input className="log-input" placeholder="분류" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
                  <textarea className="log-input cms-summary" placeholder="목록에 표시할 요약" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} required />
                  <input className="log-input" placeholder="대표 이미지 URL (선택)" value={draft.coverImage} onChange={(event) => setDraft({ ...draft, coverImage: event.target.value })} />
                  <input className="log-input" placeholder="외부 글 URL (선택) 예: https://uni0790.tistory.com/4" value={draft.externalUrl} onChange={(event) => setDraft({ ...draft, externalUrl: event.target.value })} />
                  <input className="log-input" placeholder="태그: 보안, 데이터, 프로젝트" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} />
                  <textarea className="log-input cms-body-input" placeholder="Markdown으로 본문을 작성하세요." value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} required={!draft.externalUrl.trim()} />
                  <label className="publish-toggle">
                    <input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} />
                    공개 글로 게시
                  </label>
                  <div className="editor-actions">
                    <button className="btn-tesla" type="submit" disabled={saving}>{saving ? 'SAVING...' : editingId ? 'UPDATE' : 'PUBLISH'}</button>
                    {editingId && <button className="secondary-button" type="button" onClick={resetEditor}>취소</button>}
                  </div>
                  {statusMessage && <p className="status-message">{statusMessage}</p>}
                </form>
                <div className="markdown-preview">
                  <div className="preview-label">MARKDOWN PREVIEW</div>
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
                      <div className="manager-meta">
                        {post.published ? 'PUBLIC' : 'PRIVATE'} · {post.externalUrl ? 'EXTERNAL' : 'ARTICLE'} · {post.category || 'WRITING'}
                      </div>
                      <h3>{post.title}</h3>
                      <p>{post.summary}</p>
                    </div>
                    <div className="manager-actions">
                      <button className="secondary-button" type="button" onClick={() => handleEdit(post)}>수정</button>
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
      <header className="topbar">
        <div className="container nav">
          <a className="brand-link" href="#home">LEE JAE WON</a>
          <div className="nav-links">
            <a href="#about">ABOUT</a>
            <a href="#experience">EXPERIENCE</a>
            <a href="#writings">WRITINGS</a>
            <a href="#contact">CONTACT</a>
            <a href="#admin">ADMIN</a>
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="section hero">
          <div className="container hero-grid">
            <div className="hero-copy reveal-text" ref={addReveal}>
              <p className="eyebrow">Industrial Security Portfolio</p>
              <h1>이재원</h1>
              <p className="hero-subtitle">INDUSTRIAL SECURITY · SECURITY PORTFOLIO</p>
              <p className="hero-profile">
                중앙대학교 산업보안 전공<br />
                보안 학습과 프로젝트 기록
              </p>
              <p className="hero-message">
                기술과 조직의 맥락을 함께 이해하며<br />
                실수하지 않는 보안 구조를 설계하는 과정을 기록합니다.
              </p>
              <div className="hero-actions">
                <a className="btn-tesla" href="#writings">VIEW WRITINGS</a>
                <a className="secondary-button" href={githubUrl} target="_blank" rel="noreferrer">GITHUB ↗</a>
                <a className="secondary-button" href={tistoryUrl} target="_blank" rel="noreferrer">TISTORY ↗</a>
              </div>
            </div>
            <div className="hero-visual reveal-text" ref={addReveal} aria-hidden="true">
              <img src={heroImage} alt="" />
            </div>
          </div>
        </section>

        <section id="about" className="section container">
          <div className="section-heading-row">
            <h2 className="section-label reveal-text" ref={addReveal}>ABOUT</h2>
            <p className="section-note">보안 기술을 배우고, 글로 정리하고, 작은 프로젝트로 검증하는 포트폴리오입니다.</p>
          </div>
          <div className="about-layout">
            <article className="profile-panel reveal-text" ref={addReveal}>
              <p className="eyebrow">Profile</p>
              <h3>기술과 조직 사이의 보안 문제를 배우고 있습니다.</h3>
              <p>
                중앙대학교에서 산업보안을 전공하며 인프라, 클라우드, 네트워크 보안에 관심을 두고 있습니다.
                아직 완성된 전문가라기보다, 배운 내용을 직접 실습하고 기록하며 성장하는 과정에 있습니다.
              </p>
              <dl className="profile-facts">
                <div>
                  <dt>School</dt>
                  <dd>중앙대학교 산업보안 전공</dd>
                </div>
                <div>
                  <dt>Focus</dt>
                  <dd>보안 실습 및 프로젝트 기록</dd>
                </div>
              </dl>
            </article>
            <div className="stack-panel reveal-text" ref={addReveal}>
              <div>
                <p className="eyebrow">Interests</p>
                <div className="pill-list">
                  {interests.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
              <div>
                <p className="eyebrow">Currently Learning</p>
                <div className="pill-list">
                  {learningItems.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="section container">
          <h2 className="section-label reveal-text" ref={addReveal}>EXPERIENCE</h2>
          <div className="timeline-list">
            {experienceItems.map((item) => (
              <article className="timeline-item reveal-text" key={item.title} ref={addReveal}>
                <div>
                  <p className="timeline-meta">{item.meta}</p>
                  <h3>{item.title}</h3>
                </div>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="writings" className="section container">
          <div className="section-heading-row">
            <div>
              <h2 className="section-label reveal-text" ref={addReveal}>WRITINGS</h2>
              <p className="section-note">학습 내용, 보안 사례 분석, 프로젝트 기록을 모아두는 공간입니다.</p>
            </div>
            <a className="write-link" href="#admin">WRITE / MANAGE</a>
          </div>
          {loadingPosts && <div className="empty-state">글을 불러오는 중입니다.</div>}
          {firebaseError && <div className="setup-notice">{firebaseError}</div>}
          <div className="writing-list">
            {displayedPosts.map((post) => {
              const externalUrl = post.externalUrl || '';
              const postDate = formatDate(post.createdAt || post.updatedAt);
              const label = externalUrl
                ? isTistoryUrl(externalUrl) ? 'READ ON TISTORY →' : 'READ EXTERNAL →'
                : 'READ ARTICLE →';
              return (
                <article
                  key={post.id}
                  className={`writing-card${externalUrl ? ' is-external' : ''}`}
                  role={externalUrl ? 'link' : undefined}
                  tabIndex={externalUrl ? 0 : undefined}
                  onClick={externalUrl ? () => window.open(externalUrl, '_blank', 'noopener,noreferrer') : undefined}
                  onKeyDown={externalUrl ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      window.open(externalUrl, '_blank', 'noopener,noreferrer');
                    }
                  } : undefined}
                >
                  <div className="writing-meta-row">
                    <span>{post.category || 'WRITING'}</span>
                    <span>{postDate || (post.isLegacy ? 'TISTORY' : 'ARTICLE')}</span>
                    <span>{externalUrl ? 'EXTERNAL ↗' : 'INTERNAL →'}</span>
                  </div>
                  <div className="writing-main">
                    <h3>{post.title}</h3>
                    <p>{post.summary || post.desc}</p>
                    {post.tags?.length > 0 && (
                      <div className="tag-list">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                    )}
                  </div>
                  {externalUrl ? (
                    <a className="explore-btn" href={externalUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{label}</a>
                  ) : (
                    <a className="explore-btn" href={`#post/${encodeURIComponent(post.slug || post.id)}`}>{label}</a>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section id="contact" className="section contact-section">
          <div className="container contact-panel reveal-text" ref={addReveal}>
            <p className="eyebrow">Let's Connect</p>
            <h2>보안과 인프라에 관한 학습과 기록을 꾸준히 이어가고 있습니다.</h2>
            <a className="contact-email" href={`mailto:${emailAddress}`}>{emailAddress}</a>
            <div className="contact-links">
              <a href={`mailto:${emailAddress}`}>EMAIL</a>
              <a href={githubUrl} target="_blank" rel="noreferrer">GITHUB ↗</a>
              <a href={tistoryUrl} target="_blank" rel="noreferrer">TISTORY ↗</a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <span>© 2026 JAEWON LEE. ALL RIGHTS RESERVED.</span>
      </footer>
    </>,
  );
}

export default App;
