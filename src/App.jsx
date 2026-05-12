import React, { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorOutlineRef = useRef(null);
  const magneticRefs = useRef([]);
  const revealRefs = useRef([]);

  const addMagnetic = (el) => el && !magneticRefs.current.includes(el) && magneticRefs.current.push(el);
  const addReveal = (el) => el && !revealRefs.current.includes(el) && revealRefs.current.push(el);

  useEffect(() => {
    // A. 배경 파티클
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let ps = [];
    const initC = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      ps = Array.from({ length: 45 }, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: Math.random() * 0.2 - 0.1, vy: Math.random() * 0.2 - 0.1
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x > canvas.width) p.x = 0; else if (p.x < 0) p.x = canvas.width;
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    initC(); draw();

    // B. 커서 & 마그네틱
    const move = (e) => {
      const { clientX: x, clientY: y } = e;
      if(cursorDotRef.current) { cursorDotRef.current.style.left = `${x}px`; cursorDotRef.current.style.top = `${y}px`; }
      if(cursorOutlineRef.current) { cursorOutlineRef.current.style.left = `${x}px`; cursorOutlineRef.current.style.top = `${y}px`; }

      magneticRefs.current.forEach(el => {
        const rect = el.getBoundingClientRect();
        const dx = x - (rect.left + rect.width / 2);
        const dy = y - (rect.top + rect.height / 2);
        if (Math.abs(dx) < 150 && Math.abs(dy) < 150) el.style.transform = `translate(${dx * 0.15}px, ${dy * 0.15}px)`;
        else el.style.transform = `translate(0,0)`;
      });
    };
    const h = () => document.body.classList.add('v-hovering');
    const l = () => document.body.classList.remove('v-hovering');

    // C. 리빌
    const obs = new IntersectionObserver((es) => es.forEach(e => e.isIntersecting && e.target.classList.add('visible')), { threshold: 0.15 });
    revealRefs.current.forEach(el => obs.observe(el));

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', (e) => e.target.closest('a, button, .project-card, input') && h());
    window.addEventListener('mouseout', (e) => e.target.closest('a, button, .project-card, input') && l());
    window.addEventListener('resize', initC);
    return () => { window.removeEventListener('mousemove', move); obs.disconnect(); };
  }, []);

  // --- Initial Data ---
  const initialLogs = [
    { id: 1, title: '중앙대학교 산업보안학과 편입', desc: '클라우드 인프라 및 네트워크 보안 아키텍처 전공' },
    { id: 2, title: 'Global Metrics', desc: 'TOEIC 990 / TOEFL 115 달성' },
    { id: 3, title: 'Sepsis Prediction Model', desc: '데이터의 공백 속에서 도출하는 강건한 인프라 예측 모델' }
  ];
  const initialPosts = [
    { id: 201, title: '기업 경영과 보안', url: 'https://uni0790.tistory.com/1', desc: '인프라 신뢰성을 확보하는 의사결정 기록' },
    {
      id: 202,
      title: '삼성바이오로직스 영업비밀 유출 사건 분석',
      url: 'https://uni0790.tistory.com/2',
      desc: '내부자 위협, SOP 자산 가치, 제로 트러스트 관점에서 산업보안 의사결정 포인트를 정리한 분석 기록'
    }
  ];
  const selectedProjects = [
    {
      id: 101,
      title: 'AI 기반 투자 의사결정 실험',
      desc: '정보 아키텍처가 시스템 신뢰도에 미치는 영향 분석'
    },
    {
      id: 102,
      title: 'ICU 패혈증 예측 분석',
      desc: '데이터의 공백 속에서 도출하는 강건한 인프라 예측 모델'
    }
  ];

  const mergeWithInitialPosts = (storedPosts) => {
    if (!Array.isArray(storedPosts)) return initialPosts;

    const initialPostsByUrl = new Map(initialPosts.map(post => [post.url, post]));
    const refreshedStoredPosts = storedPosts.map(post => initialPostsByUrl.get(post.url) || post);
    const storedUrls = new Set(refreshedStoredPosts.map(post => post.url));
    const missingInitialPosts = initialPosts.filter(post => !storedUrls.has(post.url));

    return [...refreshedStoredPosts, ...missingInitialPosts];
  };

  const [logs, setLogs] = useState(() => JSON.parse(localStorage.getItem('tesla_logs')) || initialLogs);
  const [posts, setPosts] = useState(() => mergeWithInitialPosts(JSON.parse(localStorage.getItem('tesla_posts'))));
  const [isAdmin, setIsAdmin] = useState(false);
  const [pass, setPass] = useState("");
  const [newLog, setNewLog] = useState({ title: '', desc: '' });
  const [newPost, setNewPost] = useState({ title: '', url: '', desc: '' });

  useEffect(() => { localStorage.setItem('tesla_logs', JSON.stringify(logs)); localStorage.setItem('tesla_posts', JSON.stringify(posts)); }, [logs, posts]);

  const login = () => (pass === "0790") ? setIsAdmin(true) : alert("Access Denied");

  return (
    <>
      <div id="bg-grain"></div>
      <div id="cursor-dot" ref={cursorDotRef}></div>
      <div id="cursor-outline" ref={cursorOutlineRef}></div>
      <canvas id="bg-canvas" ref={canvasRef}></canvas>
      
      <header className="topbar">
        <div className="container nav">
          <div style={{fontWeight: 900, letterSpacing: '0.25em'}}>LEE JAE WON</div>
          <div style={{display: 'flex', gap: '35px'}}>
            <a href="#about" ref={addMagnetic}>ABOUT</a>
            <a href="#projects" ref={addMagnetic}>PROJECTS</a>
            <a href="#writings" ref={addMagnetic}>WRITINGS</a>
            <a href="#admin" ref={addMagnetic}>ADMIN</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="section hero">
        <svg className="hero-lock-icon reveal-text" ref={addReveal} viewBox="0 0 24 24">
          <path d="M12 17a2 2 0 100-4 2 2 0 000 4z" />
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
        </svg>
        <h1 className="reveal-text" ref={addReveal}>이재원</h1>
        <div className="subtitle reveal-text" ref={addReveal}>CLOUD · NETWORK · INFRASTRUCTURE</div>
        <div className="message reveal-text" ref={addReveal}>
          인프라의 <span style={{color: 'var(--accent)'}}>구조</span>가<br />
          보안의 <span style={{color: 'var(--accent)'}}>경로</span>를 결정한다.
        </div>
      </section>

      {/* About */}
      <section id="about" className="section container">
        <h2 className="center-align reveal-text" ref={addReveal} style={{letterSpacing: '0.3em', fontSize: '0.75rem', marginBottom: '80px', color: 'var(--muted)'}}>ABOUT</h2>
        <div className="project-grid">
          <div className="project-card magnetic-element" ref={addMagnetic}>
            <div style={{color: 'var(--accent)', fontSize: '0.65rem', marginBottom: '15px'}}>INFRASTRUCTURE</div>
            <h3>Cloud & Network</h3>
            <p>가상화 아키텍처 설계 및 트래픽 제어 최적화</p>
          </div>
          <div className="project-card magnetic-element" ref={addMagnetic}>
            <div style={{color: 'var(--accent)', fontSize: '0.65rem', marginBottom: '15px'}}>INTELLIGENCE</div>
            <h3>AI-Driven Security</h3>
            <p>데이터 분석을 활용한 지능형 이상 탐지 시스템</p>
          </div>
          <div className="project-card magnetic-element" ref={addMagnetic}>
            <div style={{color: 'var(--accent)', fontSize: '0.65rem', marginBottom: '15px'}}>EXPERIENCE</div>
            <h3>Industrial Security</h3>
            <p>중앙대학교 산업보안 전공 | 통합 보안 인프라 설계</p>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section id="projects" className="section container">
        <h2 style={{letterSpacing: '0.3em', fontSize: '0.75rem', marginBottom: '80px', color: 'var(--muted)'}} className="reveal-text" ref={addReveal}>SELECTED PROJECTS</h2>
        <div className="project-grid">
          {selectedProjects.map(project => (
            <div key={project.id} className="project-card magnetic-element" ref={addMagnetic}>
              <h3>{project.title}</h3>
              <p>{project.desc}</p>
              {project.url && (
                <a className="explore-btn" href={project.url} target="_blank" rel="noreferrer">
                  EXPLORE →
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Writings */}
      <section id="writings" className="section container">
        <h2 style={{letterSpacing: '0.3em', fontSize: '0.75rem', marginBottom: '80px', color: 'var(--muted)'}} className="reveal-text" ref={addReveal}>WRITINGS</h2>
        <div className="project-grid">
          {posts.map(p => (
            <div key={p.id} className="project-card magnetic-element" ref={addMagnetic}>
              <a href={p.url} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'inherit'}}>
                <div style={{fontSize:'0.65rem', color:'var(--accent)', marginBottom:'12px'}}>TISTORY ARCHIVE</div>
                <h3>{p.title}</h3><p>{p.desc}</p>
                <div className="explore-btn">EXPLORE →</div>
              </a>
              {isAdmin && <button className="btn-delete" style={{position:'absolute', top:'30px', right:'30px'}} onClick={() => setPosts(posts.filter(x => x.id !== p.id))}>X</button>}
            </div>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="section center-align" style={{background: '#080808', border: 'none'}}>
        <div className="container reveal-text" ref={addReveal}>
          <div style={{fontSize: '1.4rem', fontWeight: 300, marginBottom: '20px', opacity: 0.8}}>좋은 보안은 막는 것이 아니라,</div>
          <div style={{fontSize: '2.2rem', fontWeight: 700, color: 'var(--accent)'}}>실수하지 않는 <span style={{color:'#fff'}}>구조</span>를 만드는 것이다.</div>
        </div>
      </section>

      {/* Admin */}
      <section id="admin" className="section container center-align">
        {!isAdmin ? (
          <div className="reveal-text" ref={addReveal}>
            <h2 style={{letterSpacing: '0.3em', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '40px'}}>SYSTEM ACCESS</h2>
            <input type="password" className="log-input" placeholder="PASSCODE" style={{width: '200px', textAlign: 'center'}} value={pass} onChange={e => setPass(e.target.value)} />
            <button className="btn-tesla" style={{marginTop: '20px', display: 'block', margin: '20px auto'}} onClick={login} ref={addMagnetic}>UNLOCK</button>
          </div>
        ) : (
          <div className="reveal-text visible">
            <h2 style={{letterSpacing: '0.3em', fontSize: '0.75rem', marginBottom: '60px', color: 'var(--accent)'}}>ADMIN MODE</h2>
            <div className="project-grid">
              <form className="log-form" onSubmit={e => { e.preventDefault(); setPosts([{id: Date.now(), ...newPost}, ...posts]); setNewPost({title:'', url:'', desc:''}); }}>
                <input className="log-input" placeholder="제목" onChange={e => setNewPost({...newPost, title: e.target.value})} />
                <input className="log-input" placeholder="URL" onChange={e => setNewPost({...newPost, url: e.target.value})} />
                <input className="log-input" placeholder="요약" onChange={e => setNewPost({...newPost, desc: e.target.value})} />
                <button className="btn-tesla" type="submit" ref={addMagnetic}>PUBLISH</button>
              </form>
              <form className="log-form" onSubmit={e => { e.preventDefault(); setLogs([{id: Date.now(), ...newLog}, ...logs]); setNewLog({title:'', desc:''}); }}>
                <input className="log-input" placeholder="활동명" onChange={e => setNewLog({...newLog, title: e.target.value})} />
                <input className="log-input" placeholder="상세내용" onChange={e => setNewLog({...newLog, desc: e.target.value})} />
                <button className="btn-tesla" type="submit" ref={addMagnetic}>LOG</button>
              </form>
            </div>
            <button className="btn-tesla" style={{marginTop: '40px', background: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d'}} onClick={() => setIsAdmin(false)}>LOCK SYSTEM</button>
          </div>
        )}
      </section>

      <footer>
        인프라의 구조로 보안의 경로를 설계합니다.<br/>
        <span style={{fontSize: '0.65rem', marginTop: '15px', display: 'block', opacity: 0.4}}>© 2026 JAEWON LEE. ALL RIGHTS RESERVED.</span>
      </footer>
    </>
  );
}

export default App;
