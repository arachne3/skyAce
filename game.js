$(document).ready(() => {
    // 캔버스 로딩
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
  
    // 제이쿼리 선택자 선언
    const $startMenu = $('#startMenu'); // 시작 메뉴
    const $startBtn = $('#startBtn');   // 게임 시작 버튼
    const $ruleBtn = $('#ruleBtn');     // 게임 방법 버튼
    const $ui = $('#ui');               // 점수/체력/시간 UI
    const $score = $('#score');         // 점수 UI
    const $health = $('#health');       // 체력 UI
    const $time = $('#time');           // 시간 UI
  
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
  
    // 플레이어 이미지와 속성
    const playerImg = new Image();
    playerImg.src = 'images/player.png';
    // 플레이어는 화면 하단 중앙에 위치하고, 크기는 50x50픽셀, 이동속도 설정
    const player = { x: canvas.width/2 - 25, y: canvas.height - 80, w:50, h:50, speed:8 };
  
    // 발사체와 적 비행기 배열
    const bullets = [];
    const enemies = [];
  
    // 3페이즈로 나뉜 보스
    const bossConfigs = [
      { src: 'images/boss1.png', hp: 2000 },
      { src: 'images/boss2.png', hp: 2500 },
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
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      const lines = [
        '-----------------------------------------------',
        '비행기 슈팅 게임 : Sky Ace',
        '===========================',
        '',
        '게임 방법:',
        '-----------------------------------------------',
        '화살표 키로 비행기 이동 ↑, ↓, ←, →',
        '자동 발사로 적 비행기 격추',
        '적 비행기 격추 시 점수 획득',
        '적 비행기와 충돌 시 체력 감소',
        '체력(HP)이 0이 되면 게임 오버',
        '60초마다 보스 등장',
        '보스 격파 시 진행 시간 재개',
        '3분간 살아 남아 보세요!',
        '===========================',
        '',
        '오픈소스 AI 웹 소프트웨어',
        '2021041004 김민혁',
        '-----------------------------------------------'
      ];
      lines.forEach((line,i) => {
        ctx.fillText(line, 50, 100 + i*30);
      })
      // 뒤로가기 (메인메뉴)버튼 구현
      ctx.fillText('뒤로가기: ESC', 50, canvas.height - 50);
      $(document).on('keydown', e => {
        if (e.key === 'Escape') {
          backToMenu();
          $(document).off('keydown'); // 키 이벤트 리스너 제거
        }
      });
    }
  
    // 게임 방법 클릭 이벤트 처리
    $ruleBtn.click(() => {
      instructionsShown = true;
      $startMenu.hide();
      drawInstructions();
    });
    // 게임 시작 버튼 클릭 시 메인화면을 숨기고 ui표시 후 게임 시작
    $startBtn.click(() => {
      $startMenu.hide();
      $ui.show();
      startGame();
    });
  
    // 메인화면으로 돌아가기 기능
    function backToMenu() {
      instructionsShown = false;
      $startMenu.show();
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    // Start game
    function startGame() {
      gameStarted = true;
      elapsed = 0; score = 0; health = 100;
      updateUI();
  
      // Timer
      timerInterval = setInterval(() => {
        timer();
        if (!bossActive) {
          elapsed++;
          if (elapsed >= 180) endGame(); 
          // boss spawn times
          if ([59,119,179].includes(elapsed)) triggerBoss();
        }
      }, 1000);
  
      
      // Enemy spawn
      spawnEnemyInterval = setInterval(() => {
        if (!bossActive && elapsed < 180) spawnEnemy();
      }, 1000);
  
      // Auto shoot
      shootInterval = setInterval(() => {
        if (!bossActive) shoot();
      }, 300);
  
      // Start loop
      requestAnimationFrame(gameLoop);
    }
  
    function endGame() {
      gameOver = true;
      clearInterval(timerInterval);
      clearInterval(spawnEnemyInterval);
      clearInterval(shootInterval);
      alert(`게임 종료! 최종 점수: ${score}`);
      location.reload();
    }
  
    function triggerBoss() {
      bossActive = true;
      // pick config
      const cfg = bossConfigs.shift();
      boss = { img: new Image(), hp: cfg.hp, maxHp: cfg.hp, x:0, y:0, w:canvas.width, h:canvas.height/4 };
      boss.img.src = cfg.src;
      // show warning text
      $('<div class="warning">WARNING</div>').appendTo('body');
    }
  
    function spawnEnemy() {
      const types = [ 'images/enemy1.png', 'images/enemy2.png', 'images/enemy3.png' ];
      const idx = Math.floor(Math.random()*3);
      const img = new Image(); img.src = types[idx];
      enemies.push({ img, x: Math.random()*(canvas.width-40), y:-50, w:40, h:40, speed:2+Math.random()*2 });
    }
  
    function shoot() {
      bullets.push({ x: player.x+player.w/2-5, y: player.y, w:10, h:20, speed:7 });
    }
  
    function updateUI() {
      $score.text(`Score: ${score}`);
      $health.text(`HP: ${health}`);
    }

    function timer(){
        $time.text(`Time: ${elapsed}`);
    }
  
    function update() {
      // player move
      if (keys['ArrowLeft']) player.x -= player.speed;
      if (keys['ArrowRight']) player.x += player.speed;
      if (keys['ArrowUp']) player.y -= player.speed;
      if (keys['ArrowDown']) player.y += player.speed;
      player.x = Math.max(0, Math.min(canvas.width-player.w, player.x));
      player.y = Math.max(0, Math.min(canvas.height-player.h, player.y));
  
      // bullets
      bullets.forEach(b=> b.y-=b.speed);
  
      // enemy move
      enemies.forEach(e=> e.y+=e.speed);
  
      // bullet-enemy collision
      bullets.forEach((b, bi)=>{
        enemies.forEach((e, ei)=>{
          if (b.x<b.x && b.x+b.w>e.x && b.y<b.y && b.y+b.h>e.y) return; // skip invalid
          if (b.x<e.x+e.w && b.x+b.w>e.x && b.y<e.y+e.h && b.y+b.h>e.y) {
            bullets.splice(bi,1); enemies.splice(ei,1);
            score++; updateUI();
          }
        });
      });
  
      // bullet-boss collision
      if (bossActive && boss) {
        bullets.forEach((b, bi)=>{
          if (b.x<b.x && b.x+b.w>boss.x && b.y<b.y && b.y+b.h>boss.y) return;
          if (b.x<boss.x+boss.w && b.x+b.w>boss.x && b.y<boss.y+boss.h && b.y+b.h>boss.y) {
            bullets.splice(bi,1);
            boss.hp--;
            if (boss.hp <= 0) {
              bossActive = false; boss = null;
              $('.warning').remove();
            }
          }
        });
      }
  
      // enemy-player collision
      enemies.forEach((e, ei)=>{
        if (player.x<e.x+e.w && player.x+player.w>e.x && player.y<e.y+e.h && player.y+player.h>e.y) {
          health = 0; updateUI(); endGame();
        }
      });
  
      // clean up offscreen
      bullets.filter(b=> b.y> -b.h);
      enemies.filter(e=> e.y<canvas.height+e.h);
    }
  
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drawBackground();
      // draw player
      ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
      // draw bullets
      bullets.forEach(b=> ctx.fillRect(b.x,b.y,b.w,b.h));
      // draw enemies
      enemies.forEach(e=> ctx.drawImage(e.img,e.x,e.y,e.w,e.h));
      // draw boss
      if (bossActive && boss) ctx.drawImage(boss.img,boss.x,boss.y,boss.w,boss.h);
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
  