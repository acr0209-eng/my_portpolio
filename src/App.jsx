import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import projectsData from './data/projects.json';
import { auth, db, isFirebaseConfigured, ownerUid } from './lib/firebase.js';

const emptyDraft = {
  title: '',
  slug: '',
  category: 'SECURITY NOTE',
  summary: '',
  body: '',
  coverImage: '',
  tags: '',
  published: true,
};

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

const sortPosts = (items) => [...items].sort(
  (a, b) => getMillis(b.createdAt || b.updatedAt) - getMillis(a.createdAt || a.updatedAt),
);

const legacyPosts = postsData.map((post) => ({
  ...post,
  id: `legacy-${post.id}`,
  category: 'TISTORY ARCHIVE',
  summary: post.desc,
  sourceUrl: post.url,
  isLegacy: true,
  published: true,
}));

function App() {
  const canvasRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorOutlineRef = useRef(null);
  const magneticRefs = useRef([]);
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

  const addMagnetic = (el) => {
    if (el && !magneticRefs.current.includes(el)) magneticRefs.current.push(el);
  };
  const addReveal = (el) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#home');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let frameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: 45 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.random() * 0.2 - 0.1,
        vy: Math.random() * 0.2 - 0.1,
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
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
      frameId = requestAnimationFrame(draw);
    };

    const move = (event) => {
      const { clientX: x, clientY: y } = event;
      if (cursorDotRef.current) {
        cursorDotRef.current.style.left = `${x}px`;
        cursorDotRef.current.style.top = `${y}px`;
      }
      if (cursorOutlineRef.current) {
        cursorOutlineRef.current.style.left = `${x}px`;
        cursorOutlineRef.current.style.top = `${y}px`;
      }
      magneticRefs.current.forEach((el) => {
        if (!el?.isConnected) return;
        const rect = el.getBoundingClientRect();
        const dx = x - (rect.left + rect.width / 2);
        const dy = y - (rect.top + rect.height / 2);
        el.style.transform = Math.abs(dx) < 150 && Math.abs(dy) < 150
          ? `translate(${dx * 0.15}px, ${dy * 0.15}px)`
          : 'translate(0,0)';
      });
    };

    const over = (event) => {
      if (event.target.closest('a, button, .project-card, input, textarea, select')) {
        document.body.classList.add('v-hovering');
      }
    };
    const out = (event) => {
      if (event.target.closest('a, button, .project-card, input, textarea, select')) {
        document.body.classList.remove('v-hovering');
      }
    };

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible')),
      { threshold: 0.15 },
    );
    revealRefs.current.forEach((el) => observer.observe(el));

    resize();
    draw();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', over);
    window.addEventListener('mouseout', out);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over);
      window.removeEventListener('mouseout', out);
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
        setFirebaseError(`글을 불러오지 못했습니다: ${error.message}`);
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
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      published: post.published !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!db || !user || user.uid !== ownerUid) return;
    const resolvedSlug = slugify(draft.slug || draft.title);
    if (!draft.title.trim() || !resolvedSlug || !draft.summary.trim() || !draft.body.trim()) {
      setStatusMessage('제목, slug, 요약, 본문을 모두 입력해 주세요.');
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
    if (!window.confirm(`“${post.title}” 글을 삭제할까요?`)) return;
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
      <div id="cursor-dot" ref={cursorDotRef} />
      <div id="cursor-outline" ref={cursorOutlineRef} />
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
            <a href="#writings">← BACK TO WRITINGS</a>
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
              <div className="article-meta">{selectedPost.category || 'WRITING'} · {formatDate(selectedPost.createdAt)}</div>
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
          <p className="admin-intro">Firebase 계정으로 로그인한 관리자만 글을 작성·수정·삭제할 수 있습니다.</p>

          {!isFirebaseConfigured || !ownerUid ? (
            <div className="setup-notice">
              Firebase 설정이 아직 비어 있습니다. <code>.env</code>에 Firebase Web App 값과 관리자 UID를 입력해 주세요.
            </div>
          ) : authLoading ? (
            <div className="empty-state">로그인 상태를 확인하는 중입니다.</div>
          ) : !user ? (
            <form className="admin-login" onSubmit={handleLogin}>
              <input className="log-input" type="email" placeholder="관리자 이메일" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <input className="log-input" type="password" placeholder="비밀번호" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button className="btn-tesla" type="submit">LOGIN</button>
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
                  <input className="log-input" placeholder="태그: 보안, 데이터, 프로젝트" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} />
                  <textarea className="log-input cms-body-input" placeholder="Markdown으로 본문을 작성하세요." value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} required />
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
                      <div className="manager-meta">{post.published ? 'PUBLIC' : 'PRIVATE'} · {post.category || 'WRITING'}</div>
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
            <a href="#about" ref={addMagnetic}>ABOUT</a>
            <a href="#projects" ref={addMagnetic}>PROJECTS</a>
            <a href="#writings" ref={addMagnetic}>WRITINGS</a>
            <a href="#admin" ref={addMagnetic}>ADMIN</a>
          </div>
        </div>
      </header>

      <section id="home" className="section hero">
        <svg className="hero-lock-icon reveal-text" ref={addReveal} viewBox="0 0 24 24">
          <path d="M12 17a2 2 0 100-4 2 2 0 000 4z" />
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
        </svg>
        <h1 className="reveal-text" ref={addReveal}>이재원</h1>
        <div className="subtitle reveal-text" ref={addReveal}>CLOUD · NETWORK · INFRASTRUCTURE</div>
        <div className="message reveal-text" ref={addReveal}>
          인프라의 <span style={{ color: 'var(--accent)' }}>구조</span>가<br />
          보안의 <span style={{ color: 'var(--accent)' }}>경로</span>를 결정한다.
        </div>
      </section>

      <section id="about" className="section container">
        <h2 className="section-label center-align reveal-text" ref={addReveal}>ABOUT</h2>
        <div className="project-grid">
          <div className="project-card magnetic-element" ref={addMagnetic}>
            <div className="card-kicker">INFRASTRUCTURE</div><h3>Cloud & Network</h3><p>가상화 아키텍처 설계 및 트래픽 제어 최적화</p>
          </div>
          <div className="project-card magnetic-element" ref={addMagnetic}>
            <div className="card-kicker">INTELLIGENCE</div><h3>AI-Driven Security</h3><p>데이터 분석을 활용한 지능형 이상 탐지 시스템</p>
          </div>
          <div className="project-card magnetic-element" ref={addMagnetic}>
            <div className="card-kicker">EXPERIENCE</div><h3>Industrial Security</h3><p>중앙대학교 산업보안 전공 | 통합 보안 인프라 설계</p>
          </div>
        </div>
      </section>

      <section id="projects" className="section container">
        <h2 className="section-label reveal-text" ref={addReveal}>SELECTED PROJECTS</h2>
        <div className="project-grid">
          {projectsData.map((project) => (
            <div key={project.id} className="project-card magnetic-element" ref={addMagnetic}>
              <h3>{project.title}</h3><p>{project.desc}</p>
              {project.url && <a className="explore-btn" href={project.url} target="_blank" rel="noreferrer">EXPLORE →</a>}
            </div>
          ))}
        </div>
      </section>

      <section id="writings" className="section container">
        <div className="section-heading-row">
          <h2 className="section-label reveal-text" ref={addReveal}>WRITINGS</h2>
          <a className="write-link" href="#admin">WRITE / MANAGE</a>
        </div>
        {loadingPosts && <div className="empty-state">글을 불러오는 중입니다.</div>}
        {firebaseError && <div className="setup-notice">{firebaseError}</div>}
        <div className="project-grid">
          {displayedPosts.map((post) => (
            <article key={post.id} className="project-card writing-card magnetic-element" ref={addMagnetic}>
              <div className="card-kicker">{post.category || 'WRITING'}</div>
              <h3>{post.title}</h3>
              <p>{post.summary || post.desc}</p>
              {post.isLegacy ? (
                <a className="explore-btn" href={post.sourceUrl} target="_blank" rel="noreferrer">READ ON TISTORY →</a>
              ) : (
                <a className="explore-btn" href={`#post/${encodeURIComponent(post.slug || post.id)}`}>READ ARTICLE →</a>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="section center-align philosophy-section">
        <div className="container reveal-text" ref={addReveal}>
          <div className="philosophy-small">좋은 보안은 막는 것이 아니라,</div>
          <div className="philosophy-large">실수하지 않는 <span>구조</span>를 만드는 것이다.</div>
        </div>
      </section>

      <footer>
        인프라의 구조로 보안의 경로를 설계합니다.<br />
        <span>© 2026 JAEWON LEE. ALL RIGHTS RESERVED.</span>
      </footer>
    </>,
  );
}

export default App;
