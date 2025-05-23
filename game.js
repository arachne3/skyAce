$(document).ready(() => {
  // 캔버스 로딩
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // ─────────────── Audio ───────────────
  const bgm        = $('#bgm')[0];
  const menuBgm    = $('#menu-bgm')[0];
  const shootSound = $('#shoot-sound')[0];

  // 볼륨 설정 (0.0 ~ 1.0)
  bgm.volume        = 0.15;
  menuBgm.volume    = 0.15;
  shootSound.volume = 0.7;

  // 페이지 로드 후 최초 마우스 이동 시 메뉴 BGM 재생
  $(document).one('click', () => {
    menuBgm.loop = true;
    menuBgm.play();
  });

  // 제이쿼리 선택자 선언
  const $startMenu = $('#startMenu'); // 시작 메뉴
  const $startBtn = $('#startBtn');   // 게임 시작 버튼
  const $ruleBtn = $('#ruleBtn');     // 게임 방법 버튼
  const $instructions = $('#instructions'); // 게임 방법 화면
  const $topmenu = $('#topmenu'); // 상단 메뉴
  const $ui = $('#ui');               // 점수/체력/시간 UI
  const $score = $('#score');         // 점수 UI
  const $health = $('#health');       // 체력 UI
  const $time = $('#time');           // 시간 UI
  const $level = $('#level');         // 레벨 UI

  // Game variables
  let gameStarted = false;        //게임 시작 상태
  let gameOver = false;           //게임 종료 상태
  let instructionsShown = false;  //게임 방법 화면이 떠있는지
  let elapsed = 0;                //경과 시간
  let score = 0;                  //점수
  let health = 100;               //체력
  let bossActive = false;         //보스 상태
  let boss = null;                //현재 보스 객체
  let timerInterval;              //타이머
  let spawnEnemyInterval;         //적 비행기 스폰
  let shootInterval;              //총알 발사
  let enemyShootInterval;         //적 비행기 총알 발사
  // 보스 전용 플래그 & 타이밍
  let bossEntering     = false;  // 보스 등장 애니메이션 중인지
  let bossEnterStart   = 0;      // 애니메이션 시작 시간
  let bossEnterDur     = 1000;   // 애니메이션 지속 시간(ms)

  // 보스 체력 표시
  let bossHpDisplay    = 0;      // 화면에 렌더링할 보스 체력
  let bossHpInterval;            // bossHpDisplay 갱신용 setInterval

  // 보스 발사체 & 오염 영역
  let bossBullets      = [];     // 보스가 쏘는 미사일 배열
  let contaminationZones = [];    // 오염 구역 배열

  // 피격 플래시 관리 변수
  let hitFlash = false;
  let flashTimeout;

  // 플레이어 이미지와 속성
  const playerImg = new Image();
  playerImg.src = 'images/player.png';
  // 플레이어는 화면 하단 중앙에 위치하고, 크기는 50x50픽셀, 이동속도 설정
  const player = { x: canvas.width/2 - 25, y: canvas.height - 80, w:50, h:50, speed:8, level:1 };
  // 플레이어 발사체 이미지
  const bulletImg = new Image();
  bulletImg.src = 'images/bullet.png';
  // 적 발사체 이미지
  const enemyBulletImg = new Image();
  enemyBulletImg.src = 'images/enemyBullet.png';
  // 보스 직선 미사일 이미지
  const bossMissileImg = new Image();
  bossMissileImg.src = 'images/bossMissile.png';

  // 발사체와 적 비행기 ,적 발사체 배열
  let bullets = [];
  let enemies = [];
  let enemyBullets = [];

  // 3페이즈로 나뉜 보스
  const bossConfigs = [
    { src: 'images/boss1.png', hp: 300 },
    { src: 'images/boss2.png', hp: 1000 },
    { src: 'images/boss3.png', hp: 3000 }
  ];

  // 키 입력 저장 상태
  let keys = {};

  // 우주 배경 이미지
  const bgImage = new Image(); bgImage.src = 'images/space.jpg';
  let bgY = 0;
  // Y축을 1씩 증가시키며 반복적으로 배경을 로드
  function drawBackground() {
    bgY = (bgY + 1) % canvas.height; //범위 초과하지 않도록
    ctx.drawImage(bgImage, 0, bgY - canvas.height, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, bgY, canvas.width, canvas.height);
  }

  // 게임 방법 텍스트 그리기
  function drawInstructions() {
    $instructions.removeClass('hidden');
    $(window).on('keydown.instructions', e => {
      if (e.key === 'Escape') {
        hideInstructions();
      }
    });
  }

  // 게임 방법 클릭 이벤트 처리
  $ruleBtn.click(() => {
    instructionsShown = true;
    $startMenu.hide();
    $topmenu.hide();
    drawInstructions();
  });

  // 게임 시작 버튼 클릭 시 메인화면을 숨기고 ui표시 후 게임 시작
  $startBtn.click(() => {
    // 게임 BGM 재생
    bgm.loop = true;
    bgm.play();

    $topmenu.hide();

    // 메뉴 BGM 정지
    menuBgm.pause();
    menuBgm.currentTime = 0;
    menuBgm.muted = true; // 음소거 

    $startMenu.hide();
    $ui.show();
    startGame();
  });

  function hideInstructions() {
    // 1) 오버레이 숨기기
    $instructions.addClass('hidden');
    // 2) ESC 핸들러 해제
    $(window).off('keydown.instructions');
    // 3) 메인 메뉴로 복귀
    backToMenu();
  }
  
  // 메인화면으로 돌아가기 기능
  function backToMenu() {
    instructionsShown = false;
    $startMenu.show();
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }
   $(window).on('keydown.instructions', e => {
  if (e.key === 'Escape') hideInstructions();
});

  // 피격 발생 시 호출
  function triggerFlash() {
    hitFlash = true;
    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => {
      hitFlash = false;
    }, 100);
  }

  // 게임 시작 세팅
  function startGame() {
    bgm.play();          // 게임 시작하면서 BGM 재생
    gameStarted = true;
    elapsed = 0; score = 0; health = 100; player.level=1;
    updateUI();
    timer();

    // Timer
    timerInterval = setInterval(() => {
      checkscore();
      timer();
      if (!bossActive) {
        elapsed++;
        if (elapsed >= 100) {
          timer();
          endGame(); 
          return;
        } 
        // boss spawn times
        if ([30,60,90].includes(elapsed)) triggerBoss();
      }
      timer();                    // ④ 그 외엔 매 틱 UI 갱신
      checkscore(); 
    }, 1000);

    
    // 적 잡몹 스폰 로직
    (function scheduleSpawn() {
      if (!bossActive && elapsed < 100) spawnEnemy();
      const delay = 400 + Math.random() * 200;  // 0.4~0.6초 사이
      spawnEnemyInterval = setTimeout(scheduleSpawn, delay);
    })();

    // 총알 발사 주기 0.3초
    shootInterval = setInterval(() => {
      shoot();
    }, 300);
    //모든 적이 총알 발사
    enemyShootInterval = setInterval(() => {
      if (!bossActive) {
      enemies.forEach(e => shootEnemy(e));
      }
    }, 1000);

    // Start loop
    requestAnimationFrame(gameLoop);
  }

  function endGame() {
    bgm.pause();         // 게임 종료 시 BGM 정지
    bgm.currentTime = 0; // 처음 위치로 되돌리기
    menuBgm.pause(); // 메뉴 BGM 정지
    menuBgm.currentTime = 0; // 처음 위치로 되돌리기
    shootSound.pause(); // 총알 발사 소리 정지
    shootSound.currentTime = 0; // 처음 위치로 되돌리기
    gameOver = true;
    clearInterval(timerInterval);
    clearInterval(spawnEnemyInterval);
    clearInterval(shootInterval);
    clearInterval(enemyShootInterval);
    alert(`게임 종료! 최종 점수: ${score}`);
    location.reload();
  }

  
function triggerBoss() {
bossActive = true;
// ① 기존 타이머·스폰 중지
clearInterval(timerInterval);
clearTimeout(spawnEnemyInterval);

 // ① WARNING 엘리먼트 생성
const $w = $('<div class="warning">WARNING</div>').appendTo('body');
              // blink 애니메이션이 끝나면 자동으로 제거
              let blink = 0;
              const wi = setInterval(() => {
                $w.toggle();
                if (++blink >= 6) {
                  clearInterval(wi);
                  $w.remove();

    // ③ 보스 객체 준비 (화면 위 숨김)
    const cfg = bossConfigs.shift();
    boss = {
      img: new Image(), 
      hp: cfg.hp, maxHp: cfg.hp,
      x: canvas.width/4, y: -canvas.height/2,
      w: canvas.width/2, h: canvas.height/2
    };
    boss.img.src = cfg.src;

    // ④ 보스 HP 표시용 변수 초기화
    bossHpDisplay = boss.hp;
    bossHpInterval = setInterval(() => {
      bossHpDisplay = boss.hp;
    }, 500);

    // ⑤ 보스 등장 애니메이션 & 패턴 시작
    bossEntering   = true;
    bossEnterStart = performance.now();
    // 패턴은 보스가 완전히 내려온 뒤 startGame() 내부에서 재개됩니다
  }
}, 500);
}

  // 보스 제거
  function clearBoss() {
    clearInterval(timerInterval);           // 메인 타이머
    clearTimeout(spawnEnemyInterval);       // 적 스폰 (timeout)
    clearInterval(shootInterval);           // 플레이어 자동발사
    clearInterval(enemyShootInterval);      // 적 자동발사
    clearInterval(bossHomingInterval);      // 보스 미사일
    clearInterval(bossMissileInterval);     // 보스 직선 미사일
    clearInterval(bossZoneInterval);        // 보스 오염 구역
    clearInterval(bossHpInterval);          // 보스 HP 표시
    gameStarted = true;
    updateUI();
    timer();
    
    // Timer
    timerInterval = setInterval(() => {
      timer();
      if (!bossActive) {
        elapsed++;
        if (elapsed >= 100) {
          timer();
          endGame(); 
          return;
        }
        // boss spawn times
        if ([30,60,90].includes(elapsed)) triggerBoss();
      }
      timer();                    // ④ 그 외엔 매 틱 UI 갱신
      checkscore();
    }, 1000);
    updateUI();

    
    // 적 잡몹 스폰 로직
    (function scheduleSpawn() {
      if (!bossActive && elapsed < 100) spawnEnemy();
      const delay = 400 + Math.random() * 200;  // 0.4~0.6초 사이
      spawnEnemyInterval = setTimeout(scheduleSpawn, delay);
    })();
    updateUI();

    // 총알 발사 주기 0.3초
    shootInterval = setInterval(() => {
      shoot();
    }, 300);
    //모든 적이 총알 발사
    enemyShootInterval = setInterval(() => {
      if (!bossActive) {
      enemies.forEach(e => shootEnemy(e));
      }
    }, 1000);
    updateUI();

    // Start loop
    requestAnimationFrame(gameLoop);
  }


  function spawnEnemy() {
    const types = [ 'images/enemy1.png', 'images/enemy2.png', 'images/enemy3.png' ];
    const idx = Math.floor(Math.random()*3); // 세 가지 적 중 랜덤스폰
    const img = new Image(); 
    img.src = types[idx];
    const damage=[20,15,10][idx];
    const baseSpeed = 3+ Math.random()*2; // 적들마다 랜덤 이동속도 설정
    let x,y,dx,dy;
    switch(idx){    // 스폰 패턴 결정정
      case 0:       // 상단 스폰
      x= Math.random() * (canvas.width-40);
      y=-40;
      dx=0;         //x축 변화량
      dy=baseSpeed; //y축 변화량
      break;
    case 1:         // 대각 스폰
    if(Math.random()<0.5){//왼쪽 대각 스폰
      x=-20;
      y=Math.random()*(canvas.height-40);
      dx=baseSpeed;
      dy=baseSpeed;
    }
    else{//우측 대각 스폰
      x=canvas.width+20;
      y=Math.random()*(canvas.height-40);
      dx=-baseSpeed;
      dy=baseSpeed;
    }
    break;
    case 2:         // 사이드 스폰(오른쪽, 왼쪽)
    if(Math.random()<0.5){    // 왼쪽 스폰
      x=-40;
      y=Math.random()*(canvas.height-40);
      dx=baseSpeed;
      dy=0;
    } 
    else{                     //오른쪽 스폰
      x=canvas.width;
      y=Math.random()*(canvas.height-40);
      dx=-baseSpeed;
      dy=0;
    }
    break;
    }
    enemies.push({ img,x,y,w:40,h:40,dx,dy,damage});
  }

  // 플레이어 총알 
function shoot() {
  shootSound.currentTime = 0;
  shootSound.play();
  const speed = 7;
  const cx    = player.x + player.w/2;
  const cy    = player.y;
  const bulletwidth = 15;
  const bulletheight = 20;
  // 1) 중앙 발사
  bullets.push({
    x: cx-5, y: cy, w: bulletwidth, h: bulletheight,
    dx: 0, dy: -speed,
    img: bulletImg
  });

  // 2) 왼쪽 대각선
  if (player.level >= 2) {
    bullets.push({
      x: cx-5, y: cy,
      w: bulletwidth, h: bulletheight,
      dx: -speed/Math.SQRT2, dy: -speed/Math.SQRT2,
      img: bulletImg
    });
  }

  // 3) 오른쪽 대각선
  if (player.level >= 3) {
    bullets.push({
      x: cx-5, y: cy,
      w: bulletwidth, h: bulletheight,
      dx:  speed/Math.SQRT2, dy: -speed/Math.SQRT2,
      img: bulletImg
    });
  }

  // 4) 레벨4 이상의 “추가 직선” — 좌우로 분산
  if (player.level >= 4) {
    // 중앙 왼쪽
    bullets.push({
      x: cx-5 - 12, y: cy,
      w: bulletwidth, h: bulletheight,
      dx: 0, dy: -speed,
      img: bulletImg
    });
  }
  if( player.level >= 5) {
    // 중앙 오른쪽
    bullets.push({
      x: cx-5 + 12, y: cy,
      w: bulletwidth, h: bulletheight,
      dx: 0, dy: -speed,
      img: bulletImg
    });
  }
}

  // 적 비행기 총알
function shootEnemy(e) {
  const speed =6;
  // 적의 중심 좌표
  const ex = e.x + e.w/2;
  const ey = e.y + e.h/2;
  // 적의 중심 좌표로부터 아래로 발사
  enemyBullets.push({
    x: ex-5,
    y: ey-5,
    w: 10, h: 10,
    dx: 0, dy: speed,
    img: enemyBulletImg
  });
}

function spawnHomingMissile() {
  const speed = 3, dmg = 10, start = performance.now();
  bossBullets.push({
    x: boss.x + boss.w/2 - 5,
    y: boss.y + boss.h,
    w: 10, h: 10,

    // 기본 직진 속도 (아래 방향)
    dx: 0,
    dy: speed,

    speed,       // 나중에 재계산용
    dmg,
    start,       // 발사 시각
    homing: true // homing 모드 플래그
  });
}

// 2) 2초마다 발사, boss.width 랜덤 위치, speed=10 직진
function spawnStraightMissile() {
const speed = 7, dmg = 15;
const x = boss.x + Math.random()*boss.w;
bossBullets.push({
  x: x-10, 
  y: boss.y, 
  w: 20, h: 20,
  dx: 0, dy: speed,
  img: bossMissileImg,
  dmg,
  homing: false
});
}

// 3) 5초마다 100×100 영역 오염, 4초간 지속, 초당 10 피해
function spawnContaminationZone() {
const now = performance.now();
const size = 100;
const x = player.x+player.w/2 - size/2;
const y = player.y+player.h/2 - size/2;
contaminationZones.push({
  x, y,
  w: size, h: size,
  start: now,
  duration: 4000,
  lastDamage: now
});
}



  // UI표시
  function updateUI() {
    $score.text(`Score: ${score}`);
    $health.text(`HP: ${health}`);
    $level.text(`Level: ${player.level}`);
  }
  // 타이머 표시
  function timer(){
      $time.text(`Time: ${elapsed}`);
  }
  // 점수 체크
  function checkscore(){
    if(score>=30 && score<60){
      player.level=2;
    }
    else if(score>=60 && score<90){
      player.level=3;
    }
    else if(score>=90 && score<120){
      player.level=4;
    }
    else if(score>=120){
      player.level=5;
    }
  }

  // 플레이어의 방향키 움직임과 위치 처리
  function update() {
    if (bossEntering) {
      const t = performance.now() - bossEnterStart;
      boss.y = -boss.h + boss.h * Math.min(t / bossEnterDur, 1);
      if (t >= bossEnterDur) {
        bossEntering = false;
        // ❶ 보스 등장 완료 시 패턴 시작
        bossHomingInterval    = setInterval(spawnHomingMissile,   1000);
        bossMissileInterval   = setInterval(spawnStraightMissile, 1500);
        bossZoneInterval      = setInterval(spawnContaminationZone,5000);
      }
      return; // 등장 중에는 그 외 로직 스킵
    }
  // 현재 속도 결정 (Ctrl 누르면 절반)
  const moveSpeed = keys['Control'] ? player.speed / 2 : player.speed;

    // player movement with dynamic speed
    if (keys['ArrowLeft'])  player.x -= moveSpeed;
    if (keys['ArrowRight']) player.x += moveSpeed;
    if (keys['ArrowUp'])    player.y -= moveSpeed;
    if (keys['ArrowDown'])  player.y += moveSpeed;
    // 플레이어가 화면 밖으로 나가지 않도록
    player.x = Math.max(0, Math.min(canvas.width-player.w, player.x));
    player.y = Math.max(0, Math.min(canvas.height-player.h, player.y));

    // bullets
    bullets.forEach(b => {
      b.x += b.dx;
      b.y += b.dy;
    });

    // enemy move
    enemies.forEach(e => {
      e.x += e.dx;
      e.y += e.dy;
    });

    // bullet-enemy collision
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (
        b.x < e.x + e.w &&
        b.x + b.w > e.x &&
        b.y < e.y + e.h &&
        b.y + b.h > e.y
      ) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score++;
        updateUI();
        break;  // 한 발에 여러 적이 맞지 않도록
      }
    }
  }

    // (5) 적 발사체 이동
    enemyBullets.forEach(b => {
      b.x += b.dx;
      b.y += b.dy;
    });

    // (6) 적 발사체 – 플레이어 충돌 검사
    for (let i = enemyBullets.length-1; i >= 0; i--) {
      const b = enemyBullets[i];
      if (
        b.x < player.x + player.w &&
        b.x + b.w > player.x &&
        b.y < player.y + player.h &&
        b.y + b.h > player.y
      ) {
        // 충돌 시 데미지
        health -= 10;
        updateUI();
        triggerFlash();
        enemyBullets.splice(i, 1);
        if (health <= 0) return endGame();
      }
    }

    // (7) 화면 밖 enemyBullets 제거
    enemyBullets = enemyBullets.filter(b =>
      b.x + b.w > 0 && b.x < canvas.width &&
      b.y + b.h > 0 && b.y < canvas.height
    );
    // (8) 보스 발사체 이동 & 추적 로직
    const now = performance.now();
    const homingDuration = 1000; // 1초간 추적

    bossBullets.forEach((b, i) => {
      if (b.homing) {
        if (now - b.start <= homingDuration) {
          // 플레이어 방향으로 재계산
          const dx = (player.x + player.w/2) - b.x;
          const dy = (player.y + player.h/2) - b.y;
          const len = Math.hypot(dx, dy) || 1;
          b.dx = dx/len * b.speed;
          b.dy = dy/len * b.speed;
        } else {
          // 1초 지나면 homing 해제
          b.homing = false;
          // (한 번만 실행되도록 start 시간 초기화하거나 homing 플래그만 사용)
        }
      }

      // 움직임
      b.x += b.dx;
      b.y += b.dy;

      // 화면 벗어나면 제거
      if (b.y > canvas.height || b.x < -b.w || b.x > canvas.width + b.w) {
        bossBullets.splice(i, 1);
      }
    });

    // (9) 보스 발사체 vs 플레이어 충돌
    for (let i = bossBullets.length-1; i >= 0; i--) {
      const b = bossBullets[i];
      if (
        b.x < player.x + player.w &&
        b.x + b.w > player.x &&
        b.y < player.y + player.h &&
        b.y + b.h > player.y
      ) {
        health -= b.dmg;
        updateUI();
        triggerFlash();
        bossBullets.splice(i, 1);
        if (health <= 0) return endGame();
      }
    }

    // (10) 오염 구역 처리
    contaminationZones.forEach((z, i) => {
      // 만료 체크
      if (now - z.start > z.duration) {
        contaminationZones.splice(i, 1);
        return;
      }
      // 플레이어가 영역 안에 있으면 초당 5 데미지
      const cx = player.x + player.w/2;
      const cy = player.y + player.h/2;
      if (
        cx >= z.x && cx <= z.x + z.w &&
        cy >= z.y && cy <= z.y + z.h
      ) {
        // 한 번 당겨칠 때마다 너무 자주 깎이지 않도록
        if (now - z.lastDamage >= 1000) {
          health -= 5;
          z.lastDamage = now;
          updateUI();
          triggerFlash();
          if (health <= 0) return endGame();
        }
      }
    });
    
    checkscore();
    // bullet-boss collision
    if (bossActive && boss) {
      bullets.forEach((b, bi)=>{
        if (b.x < boss.x + boss.w &&
        b.x + b.w > boss.x &&
        b.y < boss.y + boss.h &&
        b.y + b.h > boss.y) {
          bullets.splice(bi,1);
          boss.hp=boss.hp-player.level;
          if (boss.hp < boss.maxHp/3) {
            Math.random() < 0.5 ? spawnHomingMissile() : spawnStraightMissile();
          }
          if (boss.hp <= 0) {
            bossActive = false; boss = null;
            updateUI();
            // 2) 화면 중앙에 CLEAR! 띄우기
              const $c = $('<div class="clear">CLEAR!</div>').appendTo('body');
              // blink 애니메이션이 끝나면 자동으로 제거
              let blink = 0;
              const ci = setInterval(() => {
                $c.toggle();
                if (++blink >= 6) {
                  clearInterval(ci);
                  $c.remove();
                }
              }, 500);
              health = Math.min(health + 50, 100); // 체력 회복
              updateUI();
            clearBoss();
          }
        }
      });
    }


    // enemy-player collision
    enemies.forEach((e, ei)=>{
      if (
        player.x<e.x+e.w && player.x+player.w>e.x &&
        player.y<e.y+e.h && player.y+player.h>e.y
      ) {
        health -= e.damage
        updateUI();
        triggerFlash();
        enemies.splice(ei,1); 
        if(health<=0) endGame();
      }
    });

    // clean up offscreen
    bullets = bullets.filter(b => b.y + b.h > 0 && b.y < canvas.height);
    enemies = enemies.filter(e=> e.y<canvas.height+e.h);
  }

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawBackground();
    ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

    // 플레이어 발사체
    bullets.forEach(b => ctx.drawImage(b.img, b.x, b.y, b.w, b.h));
    // 적 발사체
    enemyBullets.forEach(b => ctx.drawImage(b.img, b.x, b.y, b.w, b.h));
    // 보스 발사체
    bossBullets.forEach(b => {
      ctx.drawImage(b.img || enemyBulletImg, b.x, b.y, b.w, b.h);
    });

    // 적, 보스 그리기
    enemies.forEach(e => ctx.drawImage(e.img, e.x, e.y, e.w, e.h));
    if (bossActive && boss) ctx.drawImage(boss.img, boss.x, boss.y, boss.w, boss.h);

    if (bossActive && boss) {
      // HP Bar
      const barW = canvas.width * 0.6;
      const barH = 12;
      const barX = (canvas.width - barW)/2;
      const barY = 10;
      ctx.fillStyle = '#444';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = 'red';
      ctx.fillRect(barX, barY, barW * (bossHpDisplay / boss.maxHp), barH);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(
        bossHpDisplay,
        barX + barW/2 - ctx.measureText(String(bossHpDisplay)).width/2,
        barY + barH - 2
      );

      // 오염 구역 표시
      ctx.fillStyle = 'rgba(255,0,0,0.3)';
      contaminationZones.forEach(z => {
        ctx.fillRect(z.x, z.y, z.w, z.h);
      });
    }
    if (hitFlash) {
      ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function gameLoop() {
    if (gameStarted && !gameOver && !instructionsShown) {
      update(); draw();
    }
    requestAnimationFrame(gameLoop);
  }

  // input handling
  $(window).on('keydown', e => keys[e.key] = true);
  $(window).on('keyup', e => keys[e.key] = false);
});
