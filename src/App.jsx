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
    id: 'trust-secret', dimension: '信任', title: '“你别告诉别人”挑战',
    self: '{name}半夜发来一句：“这事我只敢告诉你。”第二天有人旁敲侧击，我会？',
    other: '我半夜对{name}说：“这事我只敢告诉你。”第二天有人旁敲侧击，{name}会？',
    options: [['直接开启保密模式，有风险也先私下提醒对方', 4], ['装作完全不知道，不让话题继续', 3], ['憋不住时，只找和这件事毫无关系的人匿名聊聊', 2], ['给共同朋友一点“应该不算泄密”的提示', 1], ['先说“你千万别外传”，然后讲了', 0], ['这种剧情还没发生过', null]],
  },
  {
    id: 'trust-cancel', dimension: '信任', title: '放鸽子求生局',
    self: '离见面只剩两小时，我突然去不了了。面对已经准备出门的{name}，我会？',
    other: '离见面只剩两小时，{name}突然来不了了。面对已经准备出门的我，{name}会？',
    options: [['马上说实话、认真道歉，并主动给出新的时间', 4], ['如实说明，等缓过来再约', 3], ['先发一句“临时有事”，晚点再解释', 2], ['编一个听起来比较不讨人嫌的理由', 1], ['假装没看见时间，等对方来问', 0], ['我们还没互相放过鸽子', null]],
  },
  {
    id: 'mutual-contact', dimension: '互惠', title: '聊天框长草以后',
    self: '我和{name}的聊天框安静了半个月。某天刷到一个对方一定会笑的视频，我会？',
    other: '我和{name}的聊天框安静了半个月。{name}刷到一个我一定会笑的视频，会？',
    options: [['立刻甩过来，顺手问一句最近怎么样', 4], ['先收藏，找个不突兀的时候发来', 3], ['等对方先开口，但一开口就能接上', 2], ['想了想还是算了，怕显得突然', 1], ['只有需要帮忙时才会重新出现', 0], ['我们的聊天框从没长过草', null]],
  },
  {
    id: 'mutual-help', dimension: '互惠', title: '“救命，明早要交”',
    self: '晚上十一点，{name}突然发来“救命”，但我也已经累到只剩3%的电。我会？',
    other: '晚上十一点，我突然向{name}喊“救命”，但{name}也已经累到只剩3%的电。{name}会？',
    options: [['先搞清最急的部分，能帮就帮，不能也一起找办法', 4], ['明确告诉对方我还能帮到几点、帮到哪', 3], ['先安慰几句，等明天再看情况', 2], ['嘴上说“马上”，然后越拖越不敢回', 1], ['开启飞行模式，当作没看见', 0], ['还没触发过深夜求救事件', null]],
  },
  {
    id: 'support-fail', dimension: '支持', title: '努力翻车现场',
    self: '{name}准备很久的事失败了，只发来一句：“算了，当我没说。”我会？',
    other: '我准备很久的事失败了，只对{name}说：“算了，当我没说。”{name}会？',
    options: [['先陪着，不急着修理情绪，再问想听安慰还是办法', 4], ['认真听完，过几天还会记得回来问', 3], ['发一大段加油打气，希望对方快点振作', 2], ['立刻复盘：我早就觉得这个地方有问题', 1], ['拿别人的成功作比较，试图“刺激一下”', 0], ['还没一起经历过这种翻车', null]],
  },
  {
    id: 'support-news', dimension: '支持', title: '喜讯广播站',
    self: '{name}连发八个感叹号，说终于拿到了特别想要的机会。我第一反应会是？',
    other: '我连发八个感叹号，说终于拿到了特别想要的机会。{name}第一反应会是？',
    options: [['比本人还激动，追问细节并认真庆祝', 4], ['真心替对方开心，让对方把故事讲完', 3], ['回一句“牛啊”，然后继续忙自己的', 2], ['顺势讲起自己最近更厉害的一件事', 1], ['先提醒别高兴太早，免得之后失望', 0], ['我们还没播报过这种喜讯', null]],
  },
  {
    id: 'boundary-space', dimension: '边界', title: '社交电量只剩1%',
    self: '{name}说：“我今天电量见底，不想聊天，但不是针对你。”我会？',
    other: '我对{name}说：“我今天电量见底，不想聊天，但不是针对你。”{name}会？',
    options: [['回一句“收到，好好充电”，然后真的留出空间', 4], ['确认对方安全后就不再追问', 3], ['心里有点失落，但不会把情绪丢给对方', 2], ['再劝几次，觉得说出来才会好一点', 1], ['开始连环追问：你是不是对我有意见', 0], ['我们还没遇过低电量模式', null]],
  },
  {
    id: 'boundary-no', dimension: '边界', title: '这次真的不行',
    self: '我很想让{name}陪我去，但{name}只说：“这次真的不行。”我会？',
    other: '{name}很想让我陪着去，但我只说：“这次真的不行。”{name}会？',
    options: [['接受这个“不”，不逼对方提交理由证明', 4], ['会失望，但仍然尊重决定', 3], ['问一次是不是有什么顾虑，然后收住', 2], ['再磨几轮：就这一次嘛，真的不行吗', 1], ['冷下来，让对方为拒绝我感到内疚', 0], ['还没有遇到过这种拒绝', null]],
  },
  {
    id: 'understand-mood', dimension: '理解', title: '一句“没事”但不像没事',
    self: '{name}回我“没事哈哈”，但这个“哈哈”明显和平时不一样。我会？',
    other: '我回{name}“没事哈哈”，但这个“哈哈”明显和平时不一样。{name}会？',
    options: [['轻轻点破：“感觉不像没事，想说时我在”', 4], ['先表达关心，再把开口权留给对方', 3], ['注意到了，但会等对方自己说', 2], ['根据蛛丝马迹直接推理并给解决方案', 1], ['认定对方在闹情绪，逼着现在说清楚', 0], ['我分辨不出不同版本的“哈哈”', null]],
  },
  {
    id: 'understand-view', dimension: '理解', title: '谁也说服不了谁',
    self: '我和{name}聊到一个重要话题，越聊越发现：我们真的站在两边。我会？',
    other: '我和{name}聊到一个重要话题，越聊越发现：我们真的站在两边。{name}会？',
    options: [['先弄懂对方为什么这样想，再说自己的不同', 4], ['坦率表达，但允许这局没有赢家', 3], ['赶紧换话题，别让气氛坏掉', 2], ['继续加码论据，直到对方认输', 1], ['从观点上升到“你这个人就是有问题”', 0], ['我们还没聊到过这么分叉的话题', null]],
  },
  {
    id: 'repair-hurt', dimension: '修复', title: '“你那句话有点扎我”',
    self: '{name}突然认真地说：“你刚才那句话有点扎我。”我会？',
    other: '我突然认真地对{name}说：“你刚才那句话有点扎我。”{name}会？',
    options: [['先听清扎在哪里，认真道歉，再商量怎么补回来', 4], ['承认造成了伤害，也解释当时真正想表达什么', 3], ['马上说对不起，希望这页能快点翻过去', 2], ['先躲开，觉得等对方不生气就好了', 1], ['脱口而出：“你是不是太敏感了？”', 0], ['我们还没这样直接说过不舒服', null]],
  },
  {
    id: 'repair-heat', dimension: '修复', title: '争吵CPU过热',
    self: '我和{name}越说越快，已经开始翻旧账，脑子也快烧了。我会？',
    other: '我和{name}越说越快，已经开始翻旧账，脑子也快烧了。{name}会？',
    options: [['喊暂停，并说清楚什么时候回来把这件事讲完', 4], ['主动降速，只谈眼前这一件事', 3], ['突然安静或离开，但不说还会不会回来聊', 2], ['继续输出，非得当场分出输赢', 1], ['说狠话、威胁绝交，或者把聊天发给别人看', 0], ['我们的CPU还没一起过热过', null]],
  },
];

const replaceName = (text, name) => text.replaceAll('{name}', name || '对方');

const buildSummary = (answerMap, currentLevel, expectedLevel) => ({
  currentLevel,
  expectedLevel,
  dimensions: DIMENSIONS.map((dimension) => {
    const related = coreQuestions.filter((question) => question.dimension === dimension);
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
  const [infoOpen, setInfoOpen] = useState(false);
  const questions = coreQuestions;
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
      screen: ['assess', 'levels', 'waiting', 'results'].includes(screen) ? screen : undefined,
      currentLevel, expectedLevel, questionIndex, perspective, answers,
    }));
  }, [answers, currentLevel, expectedLevel, perspective, questionIndex, roomCode, screen, session]);

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
    if (room.status === 'active' && screen === 'room') setScreen('assess');
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
    return questions.filter((q) => answers[`${q.id}-self`] !== undefined && answers[`${q.id}-other`] !== undefined).length;
  }, [answers, questions]);
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

  const submitReflection = () => {
    const summary = buildSummary(answers, currentLevel, expectedLevel);
    postAction({ type: 'submit', consent: true, summary });
    setScreen('waiting');
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
    } else {
      setScreen('levels');
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
    setScreen('room');
  };

  const reopenAnswers = async () => {
    await postAction({ type: 'reopen', progress: Math.min(99, myProgress) });
    setQuestionIndex(coreQuestions.length - 1);
    setPerspective('other');
    setScreen('assess');
  };

  const dimensionScores = useMemo(() => DIMENSIONS.map((dimension) => {
    const related = coreQuestions.filter((q) => q.dimension === dimension);
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
            <div className="room-status"><Check weight="bold" /> 12个情境已完成 · 最后再看等级</div>
            <div className="chapter-heading"><span>13</span><div><h2>此刻，我觉得我们在哪一层？</h2><p>现在再选，答案不会影响前面的情境题</p></div></div>
            <div className="level-list">
              {LEVELS.map(([level, title, desc]) => <button key={level} className={currentLevel === level ? 'selected' : ''} onClick={() => setCurrentLevel(level)}><b>Lv.{level} {title}</b><small>{desc}</small>{currentLevel === level && <Check weight="bold" />}</button>)}
            </div>
            <div className="chapter-heading compact"><span>愿望</span><div><h2>我希望以后走到哪里？</h2><p>这是我的愿望，不是给{otherName}布置的任务</p></div></div>
            <div className="expect-row">
              {LEVELS.map(([level]) => <button key={level} className={expectedLevel === level ? 'selected' : ''} onClick={() => setExpectedLevel(level)}>Lv.{level}</button>)}
            </div>
            <div className="answer-actions">
              <button className="secondary-button" onClick={() => { setQuestionIndex(coreQuestions.length - 1); setPerspective('other'); setScreen('assess'); }}><ArrowLeft weight="bold" /> 返回修改</button>
              <button className="primary-button" onClick={submitReflection}><RocketLaunch weight="fill" /> 锁定感受，等待揭晓</button>
            </div>
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
              <span className="active"><Sparkle /> 情境闯关</span><span>最后评级</span><span>共同星图</span>
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
              <div className="section-title"><h2>六维感受</h2><span>12关共同星图</span></div>
              {dimensionScores.map(({ dimension, own }) => {
                const received = partnerSummary?.dimensions?.find((item) => item.dimension === dimension)?.other;
                return <div className="score-row" key={dimension}><b>{dimension}</b><div><small>我对自己</small><ProgressBar value={own / 4 * 100} /></div><div><small>{otherName}眼中的我</small><ProgressBar value={(received ?? 2.5) / 4 * 100} tone="violet" /></div></div>;
              })}
            </div>
            <div className="insight"><Sparkle weight="fill" /><div><b>最值得聊聊：边界</b><p>你们对“留出空间”的感受不太一样，可以交换一个具体例子。</p></div></div>
            <div className="completion-note"><Check weight="bold" /> 共同星图已生成</div>
            <button className="secondary-button" onClick={() => setScreen('lobby')}>重新开始</button>
          </section>
        )}

        {infoOpen && <div className="modal-backdrop" onClick={() => setInfoOpen(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><h2>这不是心理诊断</h2><p>双人星图用于整理感受和开启沟通。结果不判断谁好谁坏，也不会公开排名。</p><button className="primary-button" onClick={() => setInfoOpen(false)}>我知道了</button></div></div>}
        {customOpen && <div className="modal-backdrop" onClick={() => setCustomOpen(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="eyebrow"><Sparkle weight="fill" /> 星际加问</div><h2>给{otherName}投递一道支线题</h2><p>它不会计入心理学评分。{otherName}可以回答、稍后聊或跳过。</p><textarea value={customText} onChange={(event) => setCustomText(event.target.value)} maxLength={80} placeholder={`例如：你最希望我改掉的一个小习惯是什么？`} /><div className="character-count">{customText.length}/80 · 还可发送{Math.max(0, 3 - outgoingQuestions.length)}题</div><button className="primary-button" onClick={sendCustomQuestion} disabled={!customText.trim()}><PaperPlaneTilt weight="fill" /> 实时投递给{otherName}</button></div></div>}
      </div>
    </main>
  );
}
