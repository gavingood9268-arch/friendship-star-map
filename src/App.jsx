import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CircleNotch,
  Copy,
  Info,
  LinkSimple,
  PaperPlaneTilt,
  LockKey,
  Planet,
  Plus,
  RocketLaunch,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react';

const loadStoredJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const getDeviceId = () => {
  const stored = localStorage.getItem('star-map-device');
  if (stored) return stored;
  const created = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  localStorage.setItem('star-map-device', created);
  return created;
};

const DEVICE_ID = getDeviceId();
const INITIAL_ROOM = new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '';
const INITIAL_SESSION = INITIAL_ROOM ? loadStoredJson(`star-room-${INITIAL_ROOM}`) : null;
const INITIAL_DRAFT = INITIAL_ROOM ? loadStoredJson(`star-draft-${INITIAL_ROOM}`) : null;

const LEVELS = [
  ['1', '认识', '彼此知道，私人投入较少'],
  ['2', '同行', '因共同场景或兴趣相处'],
  ['3', '稳定', '会主动维持，也能互相支持'],
  ['4', '亲密', '能够袒露感受并尊重边界'],
  ['5', '核心', '长期可靠，可以适度托付'],
];

const DIMENSIONS = ['信任', '互惠', '支持', '边界', '理解', '修复'];

const coreQuestions = [
  {
    id: 'trust-secret', dimension: '信任', title: '秘密保管局',
    self: '{name}告诉我一件不想让别人知道的事，我通常会？',
    other: '我告诉{name}一件不想让别人知道的事，{name}通常会？',
    options: [['按约定保密，也确认哪些能说', 4], ['默认不向任何人提起', 3], ['匿名向可靠的人求助', 2], ['会暗示给共同认识的人', 1], ['当成谈资或冲突武器', 0], ['没遇到过 / 不确定', null]],
  },
  {
    id: 'trust-cancel', dimension: '信任', title: '放鸽子说明书',
    self: '我临时不能赴约时，面对{name}，我通常会？',
    other: '{name}临时不能赴约时，通常会怎样告诉我？',
    options: [['尽早说明，并主动重新安排', 4], ['如实说明，之后再约', 3], ['先含糊取消，之后解释', 2], ['编一个更好接受的理由', 1], ['直接消失或继续否认', 0], ['没遇到过 / 不确定', null]],
  },
  {
    id: 'mutual-contact', dimension: '互惠', title: '谁先发消息',
    self: '我和{name}一阵子没联系时，我通常会？',
    other: '我和{name}一阵子没联系时，{name}通常会？',
    options: [['想起对方就自然联系', 4], ['过一阵会主动问候', 3], ['多半等待，但会认真回应', 2], ['通常只简单回复', 1], ['只有需要时才联系', 0], ['说不清 / 不适用', null]],
  },
  {
    id: 'mutual-help', dimension: '互惠', title: '临时求援',
    self: '{name}临时需要帮助，而我也有安排时，我通常会？',
    other: '我临时需要帮助，而{name}也有安排时，{name}通常会？',
    options: [['弄清需要，协调或找替代办法', 4], ['做得到就帮，做不到会说明', 3], ['表达关心，但不一定行动', 2], ['含糊答应，之后拖延', 1], ['故意回避或消失', 0], ['没遇到过 / 不确定', null]],
  },
  {
    id: 'support-fail', dimension: '支持', title: '失利现场',
    self: '{name}的重要尝试失败后，我通常会？',
    other: '我的重要尝试失败后，{name}通常会？',
    options: [['先听，再问想要哪种支持', 4], ['认真安慰，之后再关心', 3], ['鼓励一下，很快转开话题', 2], ['马上分析哪里做错了', 1], ['轻视、比较或嘲笑', 0], ['没遇到过 / 不确定', null]],
  },
  {
    id: 'support-news', dimension: '支持', title: '好消息放大器',
    self: '{name}兴奋地分享好消息时，我通常会？',
    other: '我兴奋地分享好消息时，{name}通常会？',
    options: [['真诚高兴，追问并一起庆祝', 4], ['认真回应，肯定它的意义', 3], ['礼貌祝贺，很快转开话题', 2], ['立刻讲自己的更大成就', 1], ['泼冷水或贬低', 0], ['没遇到过 / 不确定', null]],
  },
  {
    id: 'boundary-space', dimension: '边界', title: '暂时静音',
    self: '{name}说“今天不太想聊”，我通常会？',
    other: '我说“今天不太想聊”时，{name}通常会？',
    options: [['接受并留出空间', 4], ['问一句，得到拒绝后停止', 3], ['有点失落，但不会追问', 2], ['再劝几次，怕对方憋着', 1], ['生气、冷脸或连续追问', 0], ['没遇到过 / 不确定', null]],
  },
  {
    id: 'boundary-no', dimension: '边界', title: '拒绝不是背叛',
    self: '{name}拒绝我的请求或邀请时，我通常会？',
    other: '我拒绝{name}的请求或邀请时，{name}通常会？',
    options: [['接受拒绝，不要求证明理由', 4], ['会失望，但尊重决定', 3], ['问一次原因，不再继续', 2], ['反复讨价还价', 1], ['内疚、冷战或报复', 0], ['没遇到过 / 不确定', null]],
  },
  {
    id: 'understand-mood', dimension: '理解', title: '情绪天气预报',
    self: '我发现{name}状态和平时不一样时，我通常会？',
    other: '{name}发现我状态和平时不一样时，{name}通常会？',
    options: [['温和询问，让对方选择', 4], ['表达关心，留出空间', 3], ['先观察，等对方开口', 2], ['猜原因并直接给建议', 1], ['贴标签或强迫解释', 0], ['没有注意过 / 不确定', null]],
  },
  {
    id: 'understand-view', dimension: '理解', title: '观点不在同一颗星',
    self: '我和{name}在重要观点上不一致时，我通常会？',
    other: '我和{name}在重要观点上不一致时，{name}通常会？',
    options: [['先理解，再说明不同', 4], ['坦率表达并尊重分歧', 3], ['为了不冲突而换话题', 2], ['不断证明自己更有道理', 1], ['嘲笑或上升到人格', 0], ['没遇到过 / 不确定', null]],
  },
  {
    id: 'repair-hurt', dimension: '修复', title: '踩到尾巴之后',
    self: '{name}说“你刚才让我不舒服”时，我通常会？',
    other: '我说“你刚才让我不舒服”时，{name}通常会？',
    options: [['听完整、具体道歉并补救', 4], ['认真道歉，也说明原意', 3], ['很快说对不起，希望翻篇', 2], ['暂时回避，等对方消气', 1], ['说对方敏感或反咬一口', 0], ['没遇到过 / 不确定', null]],
  },
  {
    id: 'repair-heat', dimension: '修复', title: '争执过热保护',
    self: '我和{name}的争执越来越激烈时，我通常会？',
    other: '我和{name}的争执越来越激烈时，{name}通常会？',
    options: [['暂停，并约定回来沟通', 4], ['放慢语气，聚焦当前问题', 3], ['沉默离开，不说明何时谈', 2], ['继续争到对方不再回应', 1], ['辱骂、威胁或公开内容', 0], ['没有明显争执 / 不确定', null]],
  },
];

const bonusQuestions = [
  ['信任', '不太好听的真话', '我担心{name}正在做伤害自己的决定时，我会？'],
  ['互惠', '谁来定计划', '我和{name}安排见面或一起玩时，我会？'],
  ['支持', '现实压力包', '{name}最近忙乱、生病或压力很大时，我会？'],
  ['边界', '发出去之前', '我想分享涉及{name}的照片或聊天时，我会？'],
  ['理解', '被记住的小事', '涉及{name}的偏好、雷区和重要日子时，我会？'],
  ['修复', '道歉后的下一集', '我和{name}谈妥一个矛盾之后，我会？'],
].map(([dimension, title, self], index) => ({
  id: `bonus-${index}`, dimension, title, self,
  other: self.replace('我会？', '{name}会？').replace('我和{name}', '{name}和我'),
  options: [['会主动照顾彼此的需要', 4], ['多数时候能做到', 3], ['需要提醒才会注意', 2], ['常按自己的习惯处理', 1], ['明知介意仍会忽略', 0], ['没遇到过 / 不确定', null]],
}));

const replaceName = (text, name) => text.replaceAll('{name}', name || '对方');

const buildSummary = (answerMap, currentLevel, expectedLevel) => ({
  currentLevel,
  expectedLevel,
  dimensions: DIMENSIONS.map((dimension) => {
    const related = [...coreQuestions, ...bonusQuestions].filter((question) => question.dimension === dimension);
    const collect = (perspective) => related
      .map((question) => answerMap[`${question.id}-${perspective}`])
      .filter((value) => typeof value === 'number');
    const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    return { dimension, self: average(collect('self')), other: average(collect('other')) };
  }),
});

function ProgressBar({ value, tone = 'cyan' }) {
  return <div className={`progress-track ${tone}`}><span style={{ width: `${Math.max(4, value)}%` }} /></div>;
}

export function App() {
  const [screen, setScreen] = useState(INITIAL_SESSION ? (INITIAL_DRAFT?.screen || 'room') : 'lobby');
  const [myName, setMyName] = useState('');
  const [otherName, setOtherName] = useState('阿哲');
  const [roomCode, setRoomCode] = useState(INITIAL_ROOM);
  const [session, setSession] = useState(INITIAL_SESSION);
  const [room, setRoom] = useState(null);
  const [roomError, setRoomError] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customAnswerText, setCustomAnswerText] = useState('');
  const websocketRef = useRef(null);
  const [currentLevel, setCurrentLevel] = useState(INITIAL_DRAFT?.currentLevel || '3');
  const [expectedLevel, setExpectedLevel] = useState(INITIAL_DRAFT?.expectedLevel || '4');
  const [questionIndex, setQuestionIndex] = useState(INITIAL_DRAFT?.questionIndex || 0);
  const [perspective, setPerspective] = useState(INITIAL_DRAFT?.perspective || 'self');
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState(INITIAL_DRAFT?.answers || {});
  const [mode, setMode] = useState(INITIAL_DRAFT?.mode || 'core');
  const [infoOpen, setInfoOpen] = useState(false);
  const questions = mode === 'core' ? coreQuestions : bonusQuestions;
  const question = questions[questionIndex];
  const me = room?.participants.find((participant) => participant.id === session?.participantId);
  const partner = room?.participants.find((participant) => participant.id !== session?.participantId);
  const incomingQuestion = room?.customQuestions?.find((item) => item.to === me?.id && !item.answer);
  const outgoingQuestions = room?.customQuestions?.filter((item) => item.from === me?.id) || [];
  const lastOutgoing = outgoingQuestions.at(-1);
  const inviteUrl = roomCode ? `${window.location.origin}${window.location.pathname}?room=${roomCode}` : '';

  useEffect(() => {
    if (!session || !roomCode) return;
    localStorage.setItem(`star-room-${roomCode}`, JSON.stringify(session));
    sessionStorage.setItem(`star-room-${roomCode}`, JSON.stringify(session));
  }, [roomCode, session]);

  useEffect(() => {
    if (!session || !roomCode) return;
    localStorage.setItem(`star-draft-${roomCode}`, JSON.stringify({
      screen: ['assess', 'waiting', 'results'].includes(screen) ? screen : undefined,
      currentLevel, expectedLevel, questionIndex, perspective, answers, mode,
    }));
  }, [answers, currentLevel, expectedLevel, mode, perspective, questionIndex, roomCode, screen, session]);

  useEffect(() => {
    if (!session || !roomCode) return undefined;
    let disposed = false;
    let retryTimer;
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws?room=${roomCode}&participant=${session.participantId}&token=${session.token}`);
      websocketRef.current = socket;
      socket.onopen = () => setRoomError('');
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'room') setRoom(message.room);
      };
      socket.onerror = () => setRoomError('实时连接中断，正在尝试恢复');
      socket.onclose = () => {
        if (!disposed) retryTimer = window.setTimeout(connect, 1500);
      };
    };
    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      websocketRef.current?.close();
    };
  }, [roomCode, session]);

  useEffect(() => {
    if (!room || !session) return;
    const current = room.participants.find((participant) => participant.id === session.participantId);
    const counterpart = room.participants.find((participant) => participant.id !== session.participantId);
    if (current) setOtherName(current.otherName);
    if (counterpart) setMyName(counterpart.otherName);
    if (room.status === 'active' && screen === 'room') setScreen('levels');
    if (room.revealReady && screen === 'waiting') setScreen('results');
  }, [room, screen, session]);

  useEffect(() => {
    if (!question) return;
    const key = `${question.id}-${perspective}`;
    if (!Object.prototype.hasOwnProperty.call(answers, key)) {
      setSelected(null);
      return;
    }
    const storedIndex = question.options.findIndex(([, score]) => score === answers[key]);
    setSelected(storedIndex >= 0 ? storedIndex : null);
  }, [answers, perspective, question]);

  const completedRounds = useMemo(() => {
    const prefix = mode === 'core' ? '' : 'bonus-';
    return questions.filter((q) => answers[`${q.id}-self`] !== undefined && answers[`${q.id}-other`] !== undefined && q.id.startsWith(prefix)).length;
  }, [answers, mode, questions]);
  const myProgress = Math.round((completedRounds / questions.length) * 100);
  const partnerProgress = partner?.progress ?? 0;

  const createOrJoinRoom = async () => {
    if (!otherName.trim()) return;
    setRoomError('');
    try {
      const endpoint = roomCode ? `/api/rooms/${roomCode}/join` : '/api/rooms';
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otherName, deviceId: DEVICE_ID }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '暂时无法进入房间');
      const nextCode = data.room.code;
      const nextSession = { participantId: data.participantId, token: data.token };
      localStorage.setItem(`star-room-${nextCode}`, JSON.stringify(nextSession));
      sessionStorage.setItem(`star-room-${nextCode}`, JSON.stringify(nextSession));
      window.history.replaceState({}, '', `${window.location.pathname}?room=${nextCode}`);
      setRoomCode(nextCode);
      setSession(nextSession);
      setRoom(data.room);
      setScreen('room');
    } catch (error) {
      setRoomError(error.message);
    }
  };

  const postAction = async (action) => {
    if (!session || !roomCode) return false;
    const response = await fetch(`/api/rooms/${roomCode}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...action, participantId: session.participantId, token: session.token }),
    });
    const data = await response.json();
    if (response.ok) setRoom(data.room);
    else setRoomError(data.error || '操作失败');
    return response.ok;
  };

  const confirmRoom = () => postAction({ type: 'ready' });

  const copyInvite = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
    } else {
      const field = document.createElement('textarea');
      field.value = inviteUrl;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1600);
  };

  const sendCustomQuestion = async () => {
    if (!customText.trim()) return;
    const sent = await postAction({ type: 'custom_question', text: customText });
    if (sent) {
      setCustomText('');
      setCustomOpen(false);
    }
  };

  const answerCustomQuestion = async (choice) => {
    if (!incomingQuestion) return;
    if (choice === 'answer' && !customAnswerText.trim()) return;
    const answered = await postAction({ type: 'custom_answer', questionId: incomingQuestion.id, choice, text: customAnswerText });
    if (answered) {
      setCustomAnswerText('');
      setScreen('assess');
    }
  };

  const beginQuestions = () => {
    setMode('core');
    setQuestionIndex(0);
    setPerspective('self');
    setSelected(null);
    setScreen('assess');
    postAction({ type: 'progress', progress: 0 });
  };

  const confirmAnswer = () => {
    if (selected === null) return;
    const key = `${question.id}-${perspective}`;
    const [, selectedScore] = question.options[selected];
    const nextAnswers = { ...answers, [key]: selectedScore };
    setAnswers(nextAnswers);
    setSelected(null);
    if (perspective === 'self') {
      setPerspective('other');
      return;
    }
    setPerspective('self');
    const nextCompleted = questionIndex + 1;
    postAction({ type: 'progress', progress: Math.round((nextCompleted / questions.length) * 100) });
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
    } else if (mode === 'core') {
      const summary = buildSummary(nextAnswers, currentLevel, expectedLevel);
      postAction({ type: 'submit', consent: true, summary });
      setScreen('waiting');
    } else {
      const summary = buildSummary(nextAnswers, currentLevel, expectedLevel);
      postAction({ type: 'submit', consent: true, summary });
      setScreen('results');
    }
  };

  const goBack = () => {
    if (perspective === 'other') {
      setPerspective('self');
      return;
    }
    if (questionIndex > 0) {
      setQuestionIndex(questionIndex - 1);
      setPerspective('other');
      return;
    }
    setScreen('levels');
  };

  const reopenAnswers = async () => {
    await postAction({ type: 'reopen', progress: Math.min(99, myProgress) });
    setMode('core');
    setQuestionIndex(coreQuestions.length - 1);
    setPerspective('other');
    setScreen('assess');
  };

  const startBonus = () => {
    setMode('bonus');
    setQuestionIndex(0);
    setPerspective('self');
    setSelected(null);
    setScreen('assess');
  };

  const dimensionScores = useMemo(() => DIMENSIONS.map((dimension) => {
    const related = [...coreQuestions, ...bonusQuestions].filter((q) => q.dimension === dimension);
    const own = related.map((q) => answers[`${q.id}-self`]).filter((v) => typeof v === 'number');
    const other = related.map((q) => answers[`${q.id}-other`]).filter((v) => typeof v === 'number');
    const avg = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 2.5;
    return { dimension, own: avg(own), other: avg(other) };
  }), [answers]);

  const partnerSummary = partner?.summary;
  const sharedLevel = useMemo(() => {
    const myExperience = dimensionScores.map((item) => item.other).filter((value) => typeof value === 'number');
    const partnerExperience = partnerSummary?.dimensions?.map((item) => item.other).filter((value) => typeof value === 'number') || [];
    const values = [...myExperience, ...partnerExperience];
    if (!values.length) return 3;
    return Math.min(5, Math.max(1, 1 + values.reduce((sum, value) => sum + value, 0) / values.length));
  }, [dimensionScores, partnerSummary]);
  const sharedTierIndex = Math.min(4, Math.max(0, Math.floor(sharedLevel) - 1));
  const sharedTier = LEVELS[sharedTierIndex];
  const nextTier = LEVELS[Math.min(4, sharedTierIndex + 1)];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          {screen !== 'lobby' ? <button className="icon-button" onClick={() => setScreen('lobby')} aria-label="返回大厅"><ArrowLeft /></button> : <span />}
          <div className="brand"><Sparkle weight="fill" /><span>双人星图</span></div>
          <button className="icon-button" onClick={() => setInfoOpen(true)} aria-label="查看说明"><Info /></button>
        </header>

        {screen === 'lobby' && (
          <section className="screen lobby-screen">
            <div className="eyebrow"><LockKey /> 仅双方可见</div>
            <div className="hero-copy">
              <h1>{roomCode ? '加入这次探索' : '邀请一个人'}<br />共同绘制星图</h1>
              <p>{roomCode ? `房间 ${roomCode} 正在等你。` : '创建后会得到一条邀请链接，可以直接发到微信。'}双方分别回答，提交前不显示彼此答案。</p>
            </div>
            <div className="orbit-stage" aria-hidden="true">
              <Planet className="planet cyan" weight="duotone" />
              <span className="orbit-line" />
              <Planet className="planet violet" weight="duotone" />
            </div>
            <div className="name-panel">
              <div className="name-step active"><span>1</span><div><b>你怎么称呼对方？</b><small>这个名字会进入每一道题</small></div></div>
              <label>我眼中的对方<input value={otherName} onChange={(e) => setOtherName(e.target.value)} maxLength={12} placeholder="例如：阿哲" /></label>
              <div className="name-step"><span>2</span><div><b>{roomCode ? '确认后进入双人房间' : '把邀请链接发给对方'}</b><small>对方会在自己的设备填写对你的称呼</small></div></div>
            </div>
            {roomError && <p className="error-message">{roomError}</p>}
            <button className="primary-button" onClick={createOrJoinRoom} disabled={!otherName.trim()}><UsersThree weight="fill" /> {roomCode ? '加入双人房间' : '创建双人房间'}</button>
            <p className="fine-print">无需注册 · 不公开排名 · 随时可以退出</p>
          </section>
        )}

        {screen === 'room' && (
          <section className="screen room-screen">
            <div className="eyebrow"><LinkSimple /> 房间 {roomCode}</div>
            <div className="hero-copy room-copy">
              <h1>{partner ? '两颗星已经相遇' : `正在等待${otherName}`}</h1>
              <p>{partner ? '双方都确认称呼后，探索会同时开始。' : '把链接发给对方；微信里直接点开就能加入。'}</p>
            </div>
            <div className="room-planets">
              <div><Planet className="planet cyan" weight="duotone" /><b>{myName || '等待对方命名'}</b><span>{me?.ready ? '已确认' : '等待确认'}</span></div>
              <span className={partner ? 'connection active' : 'connection'} />
              <div><Planet className="planet violet" weight="duotone" /><b>{otherName}</b><span>{partner ? (partner.ready ? '已确认' : '已加入') : '等待加入'}</span></div>
            </div>
            {!partner && <div className="invite-panel"><small>微信邀请链接</small><p>{inviteUrl}</p><button className="secondary-button" onClick={copyInvite}><Copy /> {inviteCopied ? '已复制' : '复制邀请链接'}</button></div>}
            {partner && <div className="room-ready-note"><LockKey /> 你填写的是“{otherName}”，对方填写的是“{myName}”</div>}
            {roomError && <p className="error-message">{roomError}</p>}
            <button className="primary-button" onClick={confirmRoom} disabled={!partner || me?.ready}><Check weight="bold" /> {me?.ready ? '等待对方确认' : '确认称呼，准备开始'}</button>
            <p className="fine-print">只同步状态和进度 · 答案提交前仅自己可见</p>
          </section>
        )}

        {screen === 'levels' && (
          <section className="screen levels-screen">
            <div className="room-status"><Check weight="bold" /> {myName}与{otherName}已确认称呼</div>
            <div className="chapter-heading"><span>01</span><div><h2>我们现在在哪一层？</h2><p>选择最接近你真实感受的一项</p></div></div>
            <div className="level-list">
              {LEVELS.map(([level, title, desc]) => <button key={level} className={currentLevel === level ? 'selected' : ''} onClick={() => setCurrentLevel(level)}><b>Lv.{level} {title}</b><small>{desc}</small>{currentLevel === level && <Check weight="bold" />}</button>)}
            </div>
            <div className="chapter-heading compact"><span>02</span><div><h2>我期待走到哪里？</h2><p>期待是愿望，不是对{otherName}的要求</p></div></div>
            <div className="expect-row">
              {LEVELS.map(([level]) => <button key={level} className={expectedLevel === level ? 'selected' : ''} onClick={() => setExpectedLevel(level)}>Lv.{level}</button>)}
            </div>
            <button className="primary-button" onClick={beginQuestions}><RocketLaunch weight="fill" /> 进入12个核心关卡</button>
          </section>
        )}

        {screen === 'assess' && question && (
          <section className="screen assess-screen">
            <div className="player-progress">
              <div><div className="player-title"><Planet weight="duotone" /> <b>{myName}</b><span>{completedRounds}/{questions.length}</span></div><ProgressBar value={myProgress} /></div>
              <div><div className="player-title partner"><Planet weight="duotone" /> <b>{otherName}</b><span>{Math.round(partnerProgress * questions.length / 100)}/{questions.length}</span></div><ProgressBar value={partnerProgress} tone="violet" /></div>
            </div>
            <p className="privacy-note"><LockKey /> 只同步进度，不显示彼此答案</p>
            <div className="side-quest-toolbar">
              {incomingQuestion ? <button className="incoming-quest" onClick={() => setScreen('side')}><Sparkle weight="fill" /><span><b>{otherName}投来一道支线题</b><small>完成当前题后也可以回答</small></span></button> : <span>{lastOutgoing ? (lastOutgoing.answer ? `${otherName}已回应你的支线题` : `支线题已投递给${otherName}`) : '可以随时投递一道自己的问题'}</span>}
              <button className="add-question-button" onClick={() => setCustomOpen(true)} disabled={outgoingQuestions.length >= 3}><Plus weight="bold" /> 加一题</button>
            </div>
            <div className="stage-strip">
              <span className="done"><Check /> 目前等级</span><span className="done"><Check /> 期待等级</span><span className="active"><Sparkle /> {mode === 'core' ? '核心关卡' : '隐藏关卡'}</span>
            </div>
            <div className="question-meta"><span>第 {questionIndex + 1} 关 · {question.dimension}</span><b>{question.title}</b></div>
            <div className="perspective-switch" role="tablist">
              <button className={perspective === 'self' ? 'active' : ''} disabled={perspective !== 'self'}>我的自评</button>
              <button className={perspective === 'other' ? 'active' : ''} disabled={perspective !== 'other'}>我眼中的{otherName}</button>
            </div>
            <h2 className="question-copy">{replaceName(question[perspective], otherName)}</h2>
            <div className="option-list">
              {question.options.map(([label, score], index) => <button key={label} className={selected === index ? 'selected' : ''} onClick={() => setSelected(index)}><span className="choice-dot">{selected === index && <Check weight="bold" />}</span><span>{replaceName(label, otherName)}</span>{score === null && <small>不计分</small>}</button>)}
            </div>
            <div className="answer-actions">
              <button className="secondary-button" onClick={goBack}><ArrowLeft weight="bold" /> 上一步</button>
              <button className="primary-button sticky" onClick={confirmAnswer} disabled={selected === null}><RocketLaunch weight="fill" /> {perspective === 'self' ? `接着回答${otherName}` : '确认这一关'}</button>
            </div>
          </section>
        )}

        {screen === 'side' && incomingQuestion && (
          <section className="screen side-question-screen">
            <div className="eyebrow"><Sparkle weight="fill" /> {otherName}投递的支线题</div>
            <div className="side-question-planet"><PaperPlaneTilt weight="duotone" /></div>
            <p className="side-label">这道题不参与六维评分</p>
            <h1>{incomingQuestion.text}</h1>
            <label className="answer-label">我想这样回答<textarea value={customAnswerText} onChange={(event) => setCustomAnswerText(event.target.value)} maxLength={200} placeholder={`写给${otherName}，最多200字`} /></label>
            <button className="primary-button" onClick={() => answerCustomQuestion('answer')} disabled={!customAnswerText.trim()}><PaperPlaneTilt weight="fill" /> 发出回答</button>
            <button className="secondary-button" onClick={() => answerCustomQuestion('later')}>完成后再聊</button>
            <button className="text-button" onClick={() => answerCustomQuestion('skip')}>暂时不回答</button>
            <p className="fine-print">跳过不会扣分，也不会影响星图结果</p>
          </section>
        )}

        {screen === 'waiting' && (
          <section className="screen waiting-screen">
            <CircleNotch className="waiting-planet" weight="duotone" />
            <div className="eyebrow"><Sparkle /> 你的核心星图已完成</div>
            <h1>在轨道上等一等{otherName}</h1>
            <p>{otherName}完成后会自动解锁。这里不会催促，也不会提前显示{otherName}的答案。</p>
            <div className="waiting-progress"><b>{myName}</b><ProgressBar value={100} /><span>已完成</span></div>
            <div className="waiting-progress"><b>{otherName}</b><ProgressBar value={partnerProgress} tone="violet" /><span>{Math.round(partnerProgress * 12 / 100)} / 12</span></div>
            {incomingQuestion && <button className="primary-button" onClick={() => setScreen('side')}><Sparkle weight="fill" /> 回答{otherName}的支线题</button>}
            <button className="secondary-button" onClick={reopenAnswers}><ArrowLeft weight="bold" /> 返回修改我的答案</button>
            <button className="text-button" onClick={() => setScreen('lobby')}>退出房间</button>
          </section>
        )}

        {screen === 'results' && (
          <section className="screen results-screen">
            <div className="eyebrow"><Sparkle weight="fill" /> 双方星图已解锁</div>
            <h1>你们眼中的这段友谊</h1>
            <p className="result-intro">差异不是扣分，而是值得交换的具体感受。</p>
            <div className="shared-level-card">
              <small>共同关系进度</small>
              <b>Lv.{sharedLevel.toFixed(1)}</b>
              <span>{sharedTier[1]}{sharedTierIndex < 4 ? ` → ${nextTier[1]}` : ''}</span>
              <p>根据双方六维行为体验换算，仅表示游戏进度</p>
            </div>
            <div className="level-compare">
              <div><small>我认为目前</small><b>Lv.{currentLevel}.0</b><span>{LEVELS.find((l) => l[0] === currentLevel)?.[1]}</span></div>
              <div><small>我期待</small><b>Lv.{expectedLevel}.0</b><span>{LEVELS.find((l) => l[0] === expectedLevel)?.[1]}</span></div>
              <div><small>{otherName}认为目前</small><b>{partnerSummary?.currentLevel ? `Lv.${partnerSummary.currentLevel}.0` : '—'}</b><span>{LEVELS.find((level) => level[0] === partnerSummary?.currentLevel)?.[1] || '等待'}</span></div>
            </div>
            <div className="score-section">
              <div className="section-title"><h2>六维感受</h2><span>{mode === 'bonus' ? '完整星图' : '标准清晰度'}</span></div>
              {dimensionScores.map(({ dimension, own }) => {
                const received = partnerSummary?.dimensions?.find((item) => item.dimension === dimension)?.other;
                return <div className="score-row" key={dimension}><b>{dimension}</b><div><small>我对自己</small><ProgressBar value={own / 4 * 100} /></div><div><small>{otherName}眼中的我</small><ProgressBar value={(received ?? 2.5) / 4 * 100} tone="violet" /></div></div>;
              })}
            </div>
            <div className="insight"><Sparkle weight="fill" /><div><b>最值得聊聊：边界</b><p>你们对“留出空间”的感受不太一样，可以交换一个具体例子。</p></div></div>
            {mode === 'core' && <button className="primary-button" onClick={startBonus}><Planet weight="duotone" /> 探索6个隐藏关卡</button>}
            {mode === 'bonus' && <div className="completion-note"><Check weight="bold" /> 完整星图已生成</div>}
            <button className="secondary-button" onClick={() => setScreen('lobby')}>重新开始</button>
          </section>
        )}

        {infoOpen && <div className="modal-backdrop" onClick={() => setInfoOpen(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><h2>这不是心理诊断</h2><p>双人星图用于整理感受和开启沟通。结果不判断谁好谁坏，也不会公开排名。</p><button className="primary-button" onClick={() => setInfoOpen(false)}>我知道了</button></div></div>}
        {customOpen && <div className="modal-backdrop" onClick={() => setCustomOpen(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="eyebrow"><Sparkle weight="fill" /> 星际加问</div><h2>给{otherName}投递一道支线题</h2><p>它不会计入心理学评分。{otherName}可以回答、稍后聊或跳过。</p><textarea value={customText} onChange={(event) => setCustomText(event.target.value)} maxLength={80} placeholder={`例如：你最希望我改掉的一个小习惯是什么？`} /><div className="character-count">{customText.length}/80 · 还可发送{Math.max(0, 3 - outgoingQuestions.length)}题</div><button className="primary-button" onClick={sendCustomQuestion} disabled={!customText.trim()}><PaperPlaneTilt weight="fill" /> 实时投递给{otherName}</button></div></div>}
      </div>
    </main>
  );
}
