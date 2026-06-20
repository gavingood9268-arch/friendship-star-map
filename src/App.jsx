import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Check, Copy, Crown, GameController, Info, LockKey,
  PaperPlaneTilt, Play, ShareNetwork, Sparkle, UsersThree,
} from '@phosphor-icons/react';

const AVATARS = [
  '/assets/avatar-lin.png', '/assets/avatar-zhou.png', '/assets/avatar-tao.png',
  '/assets/avatar-yu.png', '/assets/avatar-qiao.png',
];
const ACCENTS = ['#36d9ff', '#ff8a28', '#ff3d95', '#b8f337', '#b986ff'];
const REACTIONS = [
  { text: '就是TA', src: '/assets/reaction-ta.png' },
  { text: '稳了', src: '/assets/reaction-steady.png' },
  { text: '太懂了', src: '/assets/reaction-understand.png' },
  { text: '别看我', src: '/assets/reaction-dontlook.png' },
];
const DEVICE_ID = (() => {
  const saved = localStorage.getItem('party-device-id');
  if (saved) return saved;
  const next = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  localStorage.setItem('party-device-id', next);
  return next;
})();
const INITIAL_ROOM = new URLSearchParams(location.search).get('room')?.toUpperCase() || '';
const loadSession = (code) => {
  try { return JSON.parse(localStorage.getItem(`party-room-${code}`) || 'null'); } catch { return null; }
};

function Avatar({ player, size = 'normal', selected = false, onClick }) {
  const avatar = AVATARS[player.avatar % AVATARS.length];
  const body = (
    <>
      <span className="avatar-ring" style={{ '--accent': ACCENTS[player.avatar % ACCENTS.length] }}>
        <img src={avatar} alt={`${player.name}的头像`} />
        {player.host && <Crown className="host-crown" weight="fill" />}
        {player.ready && <span className="ready-dot"><Check weight="bold" /></span>}
      </span>
      <b>{player.name}</b>
      {player.score !== undefined && <small>{player.score} 默契值</small>}
    </>
  );
  return onClick ? <button className={`player-avatar ${size} ${selected ? 'selected' : ''}`} onClick={onClick}>{body}</button> : <div className={`player-avatar ${size}`}>{body}</div>;
}

export function App() {
  const [roomCode, setRoomCode] = useState(INITIAL_ROOM);
  const [session, setSession] = useState(() => INITIAL_ROOM ? loadSession(INITIAL_ROOM) : null);
  const [room, setRoom] = useState(null);
  const [screen, setScreen] = useState(session ? 'room' : 'home');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState(INITIAL_ROOM);
  const [avatar, setAvatar] = useState(Math.floor(Math.random() * AVATARS.length));
  const [selected, setSelected] = useState(null);
  const [chatText, setChatText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const socketRef = useRef(null);
  const me = room?.participants.find((item) => item.id === session?.participantId);
  const inviteUrl = roomCode ? `${location.origin}${location.pathname}?room=${roomCode}` : '';

  useEffect(() => {
    if (!session || !roomCode) return undefined;
    let disposed = false;
    let retry;
    const connect = () => {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${location.host}/ws?room=${roomCode}&participant=${session.participantId}&token=${session.token}`);
      socketRef.current = socket;
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'room') setRoom(message.room);
      };
      socket.onopen = () => setError('');
      socket.onerror = () => setError('实时连接正在恢复');
      socket.onclose = () => { if (!disposed) retry = setTimeout(connect, 1500); };
    };
    connect();
    return () => { disposed = true; clearTimeout(retry); socketRef.current?.close(); };
  }, [roomCode, session]);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'waiting') setScreen('room');
    if (room.status === 'playing' || room.status === 'reveal') setScreen('game');
    if (room.status === 'finished') setScreen('results');
  }, [room?.status]);

  useEffect(() => { setSelected(null); }, [room?.phase, room?.roundIndex]);

  const enterRoom = async (kind) => {
    if (!name.trim()) return setError('先给自己取个游戏名');
    const code = joinCode.trim().toUpperCase();
    if (kind === 'join' && !/^[A-F0-9]{6}$/.test(code)) return setError('房间码是6位字符');
    setError('');
    try {
      const url = kind === 'create' ? '/api/game-rooms' : `/api/game-rooms/${code}/join`;
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, avatar, deviceId: DEVICE_ID }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '暂时进不去');
      const nextSession = { participantId: data.participantId, token: data.token };
      localStorage.setItem(`party-room-${data.room.code}`, JSON.stringify(nextSession));
      history.replaceState({}, '', `${location.pathname}?room=${data.room.code}`);
      setRoomCode(data.room.code); setSession(nextSession); setRoom(data.room); setScreen('room');
    } catch (caught) { setError(caught.message); }
  };

  const act = async (action) => {
    if (!session) return false;
    const response = await fetch(`/api/game-rooms/${roomCode}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...action, participantId: session.participantId, token: session.token }),
    });
    const data = await response.json();
    if (response.ok) setRoom(data.room); else setError(data.error || '操作失败');
    return response.ok;
  };

  const lockAnswer = async () => {
    if (selected === null || room.viewerSubmitted) return;
    const type = room.phase === 'guess' ? 'guess' : 'answer';
    if (await act({ type, value: selected })) setSelected(null);
  };
  const sendChat = async (text = chatText) => {
    if (!text.trim()) return;
    if (await act({ type: 'chat', text })) setChatText('');
  };
  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };

  const sortedPlayers = useMemo(() => [...(room?.participants || [])].sort((a, b) => b.score - a.score), [room?.participants]);
  const question = room?.currentQuestion;
  const phaseLabel = room?.phase === 'guess' ? '猜猜多数人选了什么' : room?.phase === 'reveal' ? '答案揭晓' : question?.type === 'point' ? '点一个最符合的人' : '先选你自己的答案';
  const choices = question?.type === 'point' ? room?.participants || [] : question?.options?.map((label, index) => ({ id: index, label })) || [];

  return (
    <main className="party-app">
      <div className="stage-bg" />
      <div className="party-frame">
        {screen === 'home' && (
          <section className="home-screen">
            <div className="show-badge"><UsersThree weight="fill" /> 3–8人实时开玩</div>
            <button className="rules-button" onClick={() => setRulesOpen(true)}><Info /> 规则</button>
            <div className="logo-lockup"><Sparkle weight="fill" /><h1>默契大挑战</h1><p>不准开麦，只许偷偷选</p></div>
            <div className="home-cast">{AVATARS.map((src, index) => <img key={src} src={src} alt="玩家示例头像" style={{ '--i': index }} />)}</div>
            <div className="entry-panel">
              <label>你的游戏名<input value={name} onChange={(event) => setName(event.target.value)} maxLength={8} placeholder="例如：桃桃乌龙" /></label>
              <div className="avatar-picker">{AVATARS.map((src, index) => <button key={src} className={avatar === index ? 'selected' : ''} onClick={() => setAvatar(index)}><img src={src} alt={`头像${index + 1}`} /></button>)}</div>
              <button className="primary-cta" onClick={() => enterRoom('create')}><Play weight="fill" /> 创建房间</button>
              <div className="join-row"><input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={6} placeholder="输入6位房间码" /><button onClick={() => enterRoom('join')}><ArrowRight weight="bold" /></button></div>
              {error && <p className="error-text">{error}</p>}
              <small className="trust-line"><LockKey /> 不用登录 · 微信直接玩 · 全程打字</small>
            </div>
          </section>
        )}

        {screen === 'room' && room && (
          <section className="room-screen">
            <div className="top-showbar"><span><UsersThree weight="fill" /> {room.participants.length}/8</span><b>默契大挑战</b><button onClick={() => setRulesOpen(true)}><Info /></button></div>
            <div className="room-code"><small>房间码</small><strong>{room.code}</strong><button onClick={copyInvite}><Copy /> {copied ? '已复制' : '复制邀请'}</button></div>
            <h2>选手正在入场</h2><p>至少3人，全员准备后房主开局</p>
            <div className="lobby-cast">{room.participants.map((player) => <Avatar key={player.id} player={player} />)}{Array.from({ length: Math.max(0, 3 - room.participants.length) }).map((_, index) => <div className="empty-seat" key={index}><UsersThree /><span>等待加入</span></div>)}</div>
            <div className="room-actions">
              <button className="secondary-cta" onClick={copyInvite}><ShareNetwork /> 发到微信群</button>
              {!me?.ready && <button className="primary-cta" onClick={() => act({ type: 'ready' })}><Check weight="bold" /> 我准备好了</button>}
              {me?.ready && !me?.host && <div className="waiting-pill"><Check /> 已准备，等房主开场</div>}
              {me?.host && <button className="primary-cta" disabled={room.participants.length < 3 || !room.participants.every((p) => p.ready)} onClick={() => act({ type: 'start' })}><GameController weight="fill" /> 开始10轮挑战</button>}
            </div>
            {error && <p className="error-text">{error}</p>}
          </section>
        )}

        {screen === 'game' && room && question && (
          <section className="game-screen">
            <div className="game-brand"><Sparkle weight="fill" /><b>默契大挑战</b><button onClick={() => setRulesOpen(true)}>规则</button></div>
            <div className="score-strip">{room.participants.map((player) => <Avatar key={player.id} player={player} size="mini" />)}</div>
            <div className="round-chip">第 <b>{room.roundIndex + 1}</b> / {room.totalRounds} 题</div>
            <div className="question-board"><small>{phaseLabel}</small><h1>{question.prompt}</h1><span>{room.answerCount}人已作答</span></div>
            <div className={`choice-grid ${question.type === 'point' ? 'people' : ''}`}>
              {choices.map((choice) => question.type === 'point' ? (
                <Avatar key={choice.id} player={choice} selected={selected === choice.id} onClick={() => !room.viewerSubmitted && setSelected(choice.id)} />
              ) : (
                <button key={choice.id} className={selected === choice.id ? 'selected' : ''} disabled={room.viewerSubmitted || room.phase === 'reveal'} onClick={() => setSelected(choice.id)}><span>{String.fromCharCode(65 + choice.id)}</span>{choice.label}</button>
              ))}
            </div>

            {room.phase !== 'reveal' ? <button className="lock-button" disabled={selected === null || room.viewerSubmitted} onClick={lockAnswer}>{room.viewerSubmitted ? <><Check /> 已锁定，等大家</> : <><LockKey weight="fill" /> 锁定答案</>}</button> : (
              <div className="reveal-panel"><Sparkle weight="fill" /><b>{room.reveal.title}</b><p>{room.reveal.subtitle}</p>{me?.host ? <button onClick={() => act({ type: 'next' })}>{room.roundIndex + 1 === room.totalRounds ? '查看最终排行' : '下一题'} <ArrowRight /></button> : <span>等房主进入下一题</span>}</div>
            )}

            <div className="chat-panel">
              <div className="quick-reactions">{REACTIONS.map((reaction) => <button key={reaction.text} onClick={() => sendChat(reaction.text)} aria-label={`发送${reaction.text}`}><img src={reaction.src} alt={reaction.text} /></button>)}</div>
              <div className="chat-feed">{room.chat.slice(-4).map((item) => <p key={item.id}><b>{item.name}</b><span>{item.text}</span></p>)}</div>
              <div className="chat-compose"><input value={chatText} onChange={(event) => setChatText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendChat()} maxLength={60} placeholder="说点什么…" /><button onClick={() => sendChat()}><PaperPlaneTilt weight="fill" /> 发送</button></div>
            </div>
          </section>
        )}

        {screen === 'results' && room && (
          <section className="results-screen">
            <Sparkle className="result-spark" weight="fill" /><small>本局挑战完成</small><h1>默契王者诞生</h1>
            <div className="podium">{sortedPlayers.map((player, index) => <div className={`rank-row rank-${index + 1}`} key={player.id}><b>{index + 1}</b><Avatar player={player} size="mini" /><strong>{player.score} 分</strong><span>{index === 0 ? '人群读心王' : index === 1 ? '默契雷达' : index === 2 ? '稳定发挥' : '气氛担当'}</span></div>)}</div>
            <button className="primary-cta" onClick={() => { history.replaceState({}, '', location.pathname); setRoom(null); setSession(null); setRoomCode(''); setScreen('home'); }}><GameController /> 再开一局</button>
          </section>
        )}

        {rulesOpen && <div className="modal-backdrop" onClick={() => setRulesOpen(false)}><div className="rules-modal" onClick={(event) => event.stopPropagation()}><h2>怎么玩</h2><p><b>1.</b> 秘密选择自己的答案，或者点出最符合的人。</p><p><b>2.</b> 猜多数人会怎么选，猜中默契值 +1。</p><p><b>3.</b> 全程只打字和点选，不需要开麦。</p><button className="primary-cta" onClick={() => setRulesOpen(false)}>懂了，开玩</button></div></div>}
      </div>
    </main>
  );
}
