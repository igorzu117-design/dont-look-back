const menuUI = document.getElementById('menuUI');
const gameOverUI = document.getElementById('gameOverUI');
const winUI = document.getElementById('winUI');
const pauseUI = document.getElementById('pauseUI');
const cutsceneUI = document.getElementById('cutsceneUI');
const cutsceneText = document.getElementById('cutsceneText');
const extremeTimerUI = document.getElementById('extremeTimerUI');
const settingsUI = document.getElementById('settingsUI');
const soundToggle = document.getElementById('soundToggle');
const thirdPersonToggle = document.getElementById('thirdPersonToggle');

// Настройки
let settings = { sound: true, thirdPerson: false };

// Настройки логики игры
let gameState = 'menu';
let cols, rows;
let cellSize3D = 10; // Размер одной клетки в 3D пространстве
let grid = [];
let currentDifficulty = '';

// Объекты логики
let player = { x: 0, y: 0, targetX: 0, targetY: 0, speed: 0.15, angle: Math.PI, targetAngle: Math.PI, moving: false, isTurning: false };
let entity = { active: false, x: 0, y: 0, targetX: 0, targetY: 0, speed: 0.05, moving: false, path: [] };
let exitCell = { x: 0, y: 0 };
let extremeLane = 0;
let obstacles = [];
let extremeTimeLeft = 120;
let lastTimerUpdate = 0;

// --- НАСТРОЙКА THREE.JS ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Чёрное небо

// Туман для атмосферы хоррора
scene.fog = new THREE.Fog(0x000000, 5, 40);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('gameContainer').appendChild(renderer.domElement);

// Группы 3D объектов
let mazeGroup = new THREE.Group();
scene.add(mazeGroup);

// Освещение (игрок - источник света)
const playerLight = new THREE.PointLight(0xffffff, 1.5, 45);
scene.add(playerLight);

// Модель Сущности
const entityMesh = new THREE.Group();
const entityMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Чёрная пустота

// Тело
const torso = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 2), entityMat);
torso.position.y = 3;
entityMesh.add(torso);

// Голова
const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), entityMat);
head.position.y = 7;
entityMesh.add(head);

const createLimb = (w1, w2, h, x, y) => {
    const limb = new THREE.Group();
    const part1 = new THREE.Mesh(new THREE.CylinderGeometry(w1, w1, h), entityMat);
    const part2 = new THREE.Mesh(new THREE.CylinderGeometry(w2, w2, h), entityMat);
    part1.position.y = -h / 2;
    part2.position.y = -h * 1.5;
    limb.add(part1);
    limb.add(part2);
    limb.position.set(x, y, 0);
    return limb;
};

// Левая рука (плечо и предплечье)
const eLArm = createLimb(0.5, 0.4, 3, -2, 6); entityMesh.add(eLArm);
// Правая рука (плечо и предплечье)
const eRArm = createLimb(0.5, 0.4, 3, 2, 6); entityMesh.add(eRArm);
// Левая нога (бедро и голень)
const eLLeg = createLimb(0.6, 0.5, 3, -1, 0); entityMesh.add(eLLeg);
// Правая нога (бедро и голень)
const eRLeg = createLimb(0.6, 0.5, 3, 1, 0); entityMesh.add(eRLeg);

const entityLight = new THREE.PointLight(0xff0000, 4, 60); // Красное свечение
entityLight.position.y = 5;
entityMesh.add(entityLight);
scene.add(entityMesh);

// Модель Игрока (Белый, в 2 раза меньше Сущности)
const playerMesh = new THREE.Group();
const playerMat = new THREE.MeshPhongMaterial({ color: 0xffffff }); // Белый цвет

const torsoP = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1), playerMat);
torsoP.position.y = 1.5;
playerMesh.add(torsoP);

const headP = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), playerMat);
headP.position.y = 3.5;
playerMesh.add(headP);

const createLimbP = (w1, w2, h, x, y) => {
    const limb = new THREE.Group();
    const part1 = new THREE.Mesh(new THREE.CylinderGeometry(w1 / 2, w1 / 2, h / 2), playerMat);
    const part2 = new THREE.Mesh(new THREE.CylinderGeometry(w2 / 2, w2 / 2, h / 2), playerMat);
    part1.position.y = -h / 4;
    part2.position.y = -h * 0.75;
    limb.add(part1);
    limb.add(part2);
    limb.position.set(x / 2, y / 2, 0);
    return limb;
};

const pLArm = createLimbP(0.5, 0.4, 3, -2, 6); playerMesh.add(pLArm); // Руки
const pRArm = createLimbP(0.5, 0.4, 3, 2, 6); playerMesh.add(pRArm);
const pLLeg = createLimbP(0.6, 0.5, 3, -1, 0); playerMesh.add(pLLeg); // Ноги
const pRLeg = createLimbP(0.6, 0.5, 3, 1, 0); playerMesh.add(pRLeg);

scene.add(playerMesh);
playerMesh.visible = false;

// Модель Выхода
const exitGeo = new THREE.BoxGeometry(8, 1, 8);
const exitMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const exitMesh = new THREE.Mesh(exitGeo, exitMat);
const exitLight = new THREE.PointLight(0x00ff00, 2, 30);
exitLight.position.y = 2;
exitMesh.add(exitLight);
scene.add(exitMesh);

// Изменение размера экрана
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Управление
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };

// Маппинг кириллицы
const keyMap = {
    'ц': 'w', 'ф': 'a', 'ы': 's', 'в': 'd',
    'Ц': 'w', 'Ф': 'a', 'Ы': 's', 'В': 'd'
};

window.addEventListener('keydown', e => {
    let k = e.key;
    if (keyMap[k]) k = keyMap[k];
    let kl = k.toLowerCase();

    if (keys.hasOwnProperty(kl)) keys[kl] = true;
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true; // Для стрелок

    if (e.key === 'Escape' && (gameState === 'playing' || gameState === 'paused')) {
        if (gameState === 'playing') pauseGame();
        else resumeGame();
    }
});
window.addEventListener('keyup', e => {
    let k = e.key;
    if (keyMap[k]) k = keyMap[k];
    let kl = k.toLowerCase();

    if (keys.hasOwnProperty(kl)) keys[kl] = false;
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

const bindTouch = (btn, keyName) => {
    document.getElementById(btn).addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
    document.getElementById(btn).addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
};
bindTouch('btnUp', 'ArrowUp'); bindTouch('btnDown', 'ArrowDown');
bindTouch('btnLeft', 'ArrowLeft'); bindTouch('btnRight', 'ArrowRight');

// Класс ячейки лабиринта
class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.walls = { top: true, right: true, bottom: true, left: true };
        this.visited = false;
    }
}

function generateMaze() {
    grid = [];
    for (let y = 0; y < rows; y++) {
        let row = [];
        for (let x = 0; x < cols; x++) { row.push(new Cell(x, y)); }
        grid.push(row);
    }

    let current = grid[0][0];
    current.visited = true;
    let stack = [current];

    while (stack.length > 0) {
        let neighbors = getUnvisitedNeighbors(current);
        if (neighbors.length > 0) {
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            removeWalls(current, next);
            next.visited = true;
            stack.push(next);
            current = next;
        } else {
            current = stack.pop();
        }
    }
}

function getUnvisitedNeighbors(cell) {
    let neighbors = [];
    let { x, y } = cell;
    if (y > 0 && !grid[y - 1][x].visited) neighbors.push(grid[y - 1][x]);
    if (x < cols - 1 && !grid[y][x + 1].visited) neighbors.push(grid[y][x + 1]);
    if (y < rows - 1 && !grid[y + 1][x].visited) neighbors.push(grid[y + 1][x]);
    if (x > 0 && !grid[y][x - 1].visited) neighbors.push(grid[y][x - 1]);
    return neighbors;
}

function removeWalls(a, b) {
    let x = a.x - b.x;
    if (x === 1) { a.walls.left = false; b.walls.right = false; }
    else if (x === -1) { a.walls.right = false; b.walls.left = false; }
    let y = a.y - b.y;
    if (y === 1) { a.walls.top = false; b.walls.bottom = false; }
    else if (y === -1) { a.walls.bottom = false; b.walls.top = false; }
}

// Построение 3D Лабиринта
function build3DMaze() {
    // Очищаем старый лабиринт
    while (mazeGroup.children.length > 0) {
        mazeGroup.remove(mazeGroup.children[0]);
    }

    const wallHeight = 10;
    const wallThickness = 2;
    const halfSize = cellSize3D / 2;

    // Создаем пол
    const floorGeo = new THREE.PlaneGeometry(cols * cellSize3D, rows * cellSize3D);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a }); // Темный пол
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((cols * cellSize3D) / 2 - halfSize, 0, (rows * cellSize3D) / 2 - halfSize);
    mazeGroup.add(floor);

    // Геометрия стен
    const horizWallGeo = new THREE.BoxGeometry(cellSize3D + wallThickness, wallHeight, wallThickness);
    const vertWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, cellSize3D + wallThickness);

    // Материалы стен (Только Фиолетовый и Зелёный)
    const matPurple = new THREE.MeshPhongMaterial({ color: 0x8A2BE2 });
    const matGreen = new THREE.MeshPhongMaterial({ color: 0x00FF00 });

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let cell = grid[y][x];
            let px = x * cellSize3D;
            let pz = y * cellSize3D;

            // Функция для выбора случайного цвета стены
            const getRandomMat = () => Math.random() > 0.5 ? matPurple : matGreen;

            // Рисуем верхние и левые стены для всех клеток (избегаем дублирования)
            if (cell.walls.top) {
                let wall = new THREE.Mesh(horizWallGeo, getRandomMat());
                wall.position.set(px, wallHeight / 2, pz - halfSize);
                mazeGroup.add(wall);
            }
            if (cell.walls.left) {
                let wall = new THREE.Mesh(vertWallGeo, getRandomMat());
                wall.position.set(px - halfSize, wallHeight / 2, pz);
                mazeGroup.add(wall);
            }
            // Для правого и нижнего края лабиринта дорисовываем границы
            if (x === cols - 1 && cell.walls.right) {
                let wall = new THREE.Mesh(vertWallGeo, getRandomMat());
                wall.position.set(px + halfSize, wallHeight / 2, pz);
                mazeGroup.add(wall);
            }
            if (y === rows - 1 && cell.walls.bottom) {
                let wall = new THREE.Mesh(horizWallGeo, getRandomMat());
                wall.position.set(px, wallHeight / 2, pz + halfSize);
                mazeGroup.add(wall);
            }
        }
    }
}

// Запуск игры
window.startGame = function (difficulty) {
    audioManager.stopMenuMusic();
    currentDifficulty = difficulty;

    // Скрываем все меню
    menuUI.classList.remove('active');
    gameOverUI.classList.remove('active');
    winUI.classList.remove('active');
    pauseUI.classList.remove('active');

    if (difficulty === 'extreme') {
        startExtremeCutscene();
        return;
    }

    if (difficulty !== 'easy') {
        audioManager.startBackgroundDrone();
    } else {
        audioManager.stopBackgroundDrone();
    }

    if (difficulty === 'easy') { cols = 10; rows = 10; player.speed = 0.15; scene.fog.far = 50; }
    else if (difficulty === 'medium') { cols = 20; rows = 20; player.speed = 0.15; scene.fog.far = 40; }
    else if (difficulty === 'hard') { cols = 35; rows = 25; player.speed = 0.15; scene.fog.far = 30; }

    generateMaze();
    build3DMaze();

    // Сброс визуальных эффектов Экстрима
    scene.background = new THREE.Color(0x000000);
    scene.fog.color.set(0x000000);
    playerLight.intensity = 1.5;
    playerLight.color.set(0xffffff);
    renderer.setClearColor(0x000000);

    // Сброс игрока
    player.x = 0; player.y = 0;
    player.targetX = 0; player.targetY = 0;
    player.moving = false;
    player.angle = Math.PI; player.targetAngle = Math.PI;
    player.isTurning = false;

    // Выход
    exitCell.x = cols - 1; exitCell.y = rows - 1;
    exitMesh.position.set(exitCell.x * cellSize3D, 0.5, exitCell.y * cellSize3D);

    // Настройка сущности
    if (difficulty === 'easy') {
        entity.active = false;
        entityMesh.visible = false;
    } else {
        entity.active = true;
        entityMesh.visible = true;
        entity.x = Math.floor(cols / 2);
        entity.y = Math.floor(rows / 2);
        entity.targetX = entity.x; entity.targetY = entity.y;
        entity.path = [];
        entity.moving = false;
        if (difficulty === 'medium') entity.speed = 0.05;
        if (difficulty === 'hard') entity.speed = 0.11;
    }

    // Очистка mazeGroup и т.д. выполняется в startGame или initExtremeMode

    if (difficulty !== 'easy') {
        startCutscene();
    } else {
        gameState = 'playing';
        requestAnimationFrame(gameLoop);
    }
}

async function typeWriter(text, element, delay = 100) {
    element.innerHTML = "";
    for (let i = 0; i < text.length; i++) {
        element.innerHTML += text.charAt(i);
        await new Promise(res => setTimeout(res, delay));
    }
}

window.startCutscene = async function () {
    audioManager.stopMenuMusic();
    audioManager.startEerieMusic();
    gameState = 'cutscene';
    cutsceneUI.classList.add('active');
    cutsceneText.className = "blood-text";
    cutsceneText.style.color = "white";

    // Сначала показываем текст
    await typeWriter("Он проснулся.", cutsceneText, 100);
    await new Promise(res => setTimeout(res, 1000));
    await typeWriter("Теперь он видит тебя.", cutsceneText, 100);
    await new Promise(res => setTimeout(res, 1000));

    // Начинаем показывать монстра
    cutsceneUI.style.background = "rgba(0,0,0,0.4)";

    // Анимация вставания
    entityMesh.scale.y = 0.1;
    entityMesh.position.y = 0;

    // Позиция камеры для кастсцены (вид со стороны)
    const entityX = entity.x * cellSize3D;
    const entityZ = entity.y * cellSize3D;
    camera.position.set(entityX + 20, 10, entityZ + 20);
    camera.lookAt(entityX, 5, entityZ);

    // Ожидание и анимация
    let startTime = Date.now();
    const animateRising = () => {
        if (gameState !== 'cutscene') return;
        let elapsed = Date.now() - startTime;
        let progress = Math.min(elapsed / 2000, 1);
        entityMesh.scale.y = 0.1 + progress * 0.9;
        entityMesh.position.y = 6 * progress;
        renderer.render(scene, camera);
        if (progress < 1) requestAnimationFrame(animateRising);
    };
    animateRising();

    // Финальное сообщение: красный цвет, тряска и медленное писание
    cutsceneText.style.color = "red";
    cutsceneText.classList.add("shake");
    await typeWriter("ОН ИДЁТ ЗА ТОБОЙ", cutsceneText, 250);
    await new Promise(res => setTimeout(res, 2000));

    // Возвращаемся в игру
    audioManager.stopEerieMusic();
    cutsceneUI.classList.remove('active');
    cutsceneText.classList.remove("shake");
    cutsceneUI.style.background = "rgba(0,0,0,1)";
    gameState = 'playing';
    requestAnimationFrame(gameLoop);
}

window.startExtremeCutscene = async function () {
    gameState = 'cutscene';
    audioManager.stopMenuMusic();
    audioManager.startExtremeMusic(false);

    // Убираем всё лишнее (включая старый пол и выход)
    mazeGroup.visible = false;
    exitMesh.visible = false;
    while (mazeGroup.children.length > 0) mazeGroup.remove(mazeGroup.children[0]);

    // Сброс и подготовка UI
    cutsceneUI.classList.add('active');
    cutsceneUI.style.background = "rgba(0,0,0,0)";
    cutsceneText.innerHTML = "";
    cutsceneText.className = "blood-text";
    cutsceneText.style.color = "white";

    // Сущность постепенно становится ОГРОМНОЙ
    entityMesh.scale.set(1, 1, 1);
    entityMesh.position.set(0, 5, -150);
    entityMesh.visible = true;
    camera.position.set(0, 20, 40);
    camera.lookAt(0, 10, -80);

    // Рёв и вспышки (Монстр должен быть виден!)
    audioManager.playRoar();
    let flashStart = Date.now();
    const flashEffect = () => {
        if (gameState !== 'cutscene') return;
        let elapsed = Date.now() - flashStart;

        // Анимация увеличения (длится дольше вспышек)
        let growProgress = Math.min(elapsed / 3000, 1);
        entityMesh.scale.set(1 + growProgress * 6, 1 + growProgress * 6, 1 + growProgress * 6);
        entityMesh.position.y = 5 + growProgress * 15;
        entityMesh.position.z = -150 + growProgress * 70;

        if (elapsed < 2500) {
            // Вспышки
            scene.background = new THREE.Color(Math.random() > 0.5 ? 0xcc0000 : 0x000000);
        } else {
            scene.background = new THREE.Color(0x000000);
        }

        renderer.render(scene, camera);
        if (growProgress < 1) requestAnimationFrame(flashEffect);
    };
    flashEffect();

    await new Promise(res => setTimeout(res, 3000));

    // Переход к черному фону для текста
    cutsceneUI.style.background = "black";
    entityMesh.visible = false; // Прячем 3D, оставляем только текст

    // Текст (Белый, на черном фоне)
    cutsceneText.classList.remove("shake");
    await typeWriter("Это лишь... Страшный сон.", cutsceneText, 150);
    await new Promise(res => setTimeout(res, 4000));

    // Резкое сообщение (Красное, тряска)
    cutsceneText.style.color = "red";
    cutsceneText.classList.add("shake");
    await typeWriter("В КОТОРОМ ТЕБЕ ПРИЙДЁТСЯ БЕЖАТЬ ЗА СВОЮ ЖИЗНЬ.", cutsceneText, 30);
    await new Promise(res => setTimeout(res, 1000));

    // Анимация БЕГА НА ИГРОКА
    cutsceneUI.style.background = "rgba(0,0,0,0)";
    mazeGroup.visible = false; // На всякий случай
    entityMesh.visible = true;
    let runStart = Date.now();
    const runDuration = 2000;

    const animateRunToPlayer = () => {
        if (gameState !== 'cutscene') return;
        let elapsed = Date.now() - runStart;
        let progress = Math.min(elapsed / runDuration, 1);

        // Бежит от -80 до 60 (прямо "сквозь" камеру)
        entityMesh.position.z = -80 + progress * 140;

        // Интенсивная анимация конечностей
        let runSpeed = 0.02;
        let runAngle = Math.sin(elapsed * runSpeed) * 1.2;
        eLLeg.rotation.x = runAngle;
        eRLeg.rotation.x = -runAngle;
        eLArm.rotation.x = -runAngle;
        eRArm.rotation.x = runAngle;

        renderer.render(scene, camera);
        if (progress < 1) {
            requestAnimationFrame(animateRunToPlayer);
        }
    };
    await new Promise(res => {
        animateRunToPlayer();
        setTimeout(res, runDuration);
    });

    initExtremeMode();
    mazeGroup.visible = true; // Возвращаем видимость в самом режиме
}

function initExtremeMode() {
    gameState = 'playing';
    currentDifficulty = 'extreme';
    cutsceneUI.classList.remove('active');
    audioManager.startExtremeMusic(true);
    scene.fog.far = 10000;

    extremeTimeLeft = 120;
    extremeTimerUI.style.display = 'block';
    extremeTimerUI.innerText = "ВЫЖИВАЙ: 120";
    lastTimerUpdate = Date.now();

    // Очистка и настройка трассы
    while (mazeGroup.children.length > 0) mazeGroup.remove(mazeGroup.children[0]);

    // Трапециевидный пол через BufferGeometry (максимально точно)
    const floorVertices = new Float32Array([
        -150, 0, 100,      // Ближний левый (теперь за игроком)
        150, 0, 100,       // Ближний правый
        1000, 0, -2000,    // Дальний правый

        -150, 0, 100,      // Ближний левый
        1000, 0, -2000,    // Дальний правый
        -1000, 0, -2000    // Дальний левый
    ]);

    const floorGeo = new THREE.BufferGeometry();
    floorGeo.setAttribute('position', new THREE.BufferAttribute(floorVertices, 3));
    floorGeo.computeVertexNormals();
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshPhongMaterial({ color: 0x111111, side: THREE.DoubleSide }));
    mazeGroup.add(floor);

    // Стены (расходятся под углом)
    const farX = 800;
    const nearX = 100;
    const wallAngle = Math.atan2(farX - nearX, 2000);
    const wallGeo = new THREE.BoxGeometry(2, 200, 2000);
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x220000 });

    const wallL = new THREE.Mesh(wallGeo, wallMat);
    wallL.position.set(-(farX + nearX) / 2, 100, -1000);
    wallL.rotation.y = wallAngle;
    mazeGroup.add(wallL);

    const wallR = new THREE.Mesh(wallGeo, wallMat);
    wallR.position.set((farX + nearX) / 2, 100, -1000);
    wallR.rotation.y = -wallAngle;
    mazeGroup.add(wallR);

    extremeLane = 0;
    player.x = 0;
    obstacles = [];

    requestAnimationFrame(gameLoop);
}

function spawnObstacle() {
    if (obstacles.length >= 7) return;
    let lane = Math.floor(Math.random() * 3) - 1;
    // Шипы (Конусы)
    const obsGeo = new THREE.ConeGeometry(8, 15, 4);
    const obsMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x330000 });
    const obs = new THREE.Mesh(obsGeo, obsMat);
    obs.position.set(lane * 25, 7.5, -450);
    obs.rotation.x = Math.PI / 10;

    // Свечение шипа
    const obsLight = new THREE.PointLight(0xff0000, 2, 40);
    obsLight.position.y = 5;
    obs.add(obsLight);

    mazeGroup.add(obs);
    obstacles.push(obs);
}

window.resumeGame = function () {
    gameState = 'playing';
    pauseUI.classList.remove('active');
    requestAnimationFrame(gameLoop);
}

window.pauseGame = function () {
    gameState = 'paused';
    pauseUI.classList.add('active');
}

window.showMenu = function () {
    audioManager.init();
    audioManager.resume();
    audioManager.stopBackgroundDrone();
    audioManager.stopExtremeMusic();
    audioManager.startMenuMusic();
    audioManager.playUISound();
    gameState = 'menu';

    extremeTimerUI.style.display = 'none';

    // Сброс визуальных настроек (после экстрима)
    scene.background = new THREE.Color(0x000000);
    scene.fog.color.set(0x000000);
    playerLight.intensity = 1.5;
    playerLight.color.set(0xffffff);

    // Сброс сущности
    entityMesh.scale.set(1, 1, 1);
    entityMesh.visible = false;
    entity.active = false;

    // Очистка препятствий
    obstacles = [];

    menuUI.classList.add('active');
    gameOverUI.classList.remove('active');
    winUI.classList.remove('active');
    pauseUI.classList.remove('active');
    settingsUI.classList.remove('active');
}

window.showSettings = function () {
    audioManager.playUISound();
    menuUI.classList.remove('active');
    settingsUI.classList.add('active');
}

window.updateSettings = function () {
    settings.sound = soundToggle.checked;
    settings.thirdPerson = thirdPersonToggle.checked;
    audioManager.setVolume(settings.sound);
}

// Алгоритм поиска пути (BFS) для сущности
function findPath(startX, startY, targetX, targetY) {
    let queue = [{ x: startX, y: startY, path: [] }];
    let visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    visited[startY][startX] = true;

    while (queue.length > 0) {
        let curr = queue.shift();
        if (curr.x === targetX && curr.y === targetY) return curr.path;

        let cell = grid[curr.y][curr.x];
        let neighbors = [
            { x: curr.x, y: curr.y - 1, dir: 'top' },
            { x: curr.x + 1, y: curr.y, dir: 'right' },
            { x: curr.x, y: curr.y + 1, dir: 'bottom' },
            { x: curr.x - 1, y: curr.y, dir: 'left' }
        ];

        for (let n of neighbors) {
            if (n.x >= 0 && n.x < cols && n.y >= 0 && n.y < rows) {
                if (!cell.walls[n.dir] && !visited[n.y][n.x]) {
                    visited[n.y][n.x] = true;
                    queue.push({ x: n.x, y: n.y, path: [...curr.path, { x: n.x, y: n.y }] });
                }
            }
        }
    }
    return [];
}

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}

let bobTimer = 0;
let eAnimTimer = 0;

function updateLogic() {
    // Логика поворота камеры (A и D) — теперь строгий поворот на 90 градусов
    if (!player.isTurning) {
        if (keys.a || keys.ArrowLeft) {
            player.targetAngle += Math.PI / 2; // Поворот на 90 градусов влево
            player.isTurning = true;
        } else if (keys.d || keys.ArrowRight) {
            player.targetAngle -= Math.PI / 2; // Поворот на 90 градусов вправо
            player.isTurning = true;
        }
    } else {
        // Сброс блокировки поворота: нужно отпустить клавишу для нового поворота
        if (!keys.a && !keys.ArrowLeft && !keys.d && !keys.ArrowRight) {
            player.isTurning = false;
        }
    }

    // Логика перемещения игрока (W и S)
    if (!player.moving) {
        let dx = 0, dy = 0;

        if (keys.w || keys.ArrowUp || keys.s || keys.ArrowDown) {
            // Вычисляем, какая клетка находится "спереди" исходя из угла обзора
            let a = Math.atan2(Math.sin(player.targetAngle), Math.cos(player.targetAngle));
            let fDx = 0, fDy = 0;

            // Определяем направление (вверх, вниз, влево, вправо по сетке)
            if (a > 3 * Math.PI / 4 || a < -3 * Math.PI / 4) { fDy = -1; }
            else if (a > -Math.PI / 4 && a < Math.PI / 4) { fDy = 1; }
            else if (a >= -3 * Math.PI / 4 && a <= -Math.PI / 4) { fDx = -1; }
            else if (a >= Math.PI / 4 && a <= 3 * Math.PI / 4) { fDx = 1; }

            // W - идем в сторону взгляда, S - пятимся назад
            if (keys.w || keys.ArrowUp) {
                dx = fDx;
                dy = fDy;
            } else if (keys.s || keys.ArrowDown) {
                dx = -fDx;
                dy = -fDy;
            }
        }

        if (dx !== 0 || dy !== 0) {
            let currentCell = grid[player.targetY][player.targetX];
            let canMove = false;

            if (dy === -1 && !currentCell.walls.top) canMove = true;
            if (dy === 1 && !currentCell.walls.bottom) canMove = true;
            if (dx === -1 && !currentCell.walls.left) canMove = true;
            if (dx === 1 && !currentCell.walls.right) canMove = true;

            if (canMove) {
                player.targetX += dx;
                player.targetY += dy;
                player.moving = true;
            }
        }
    } else {
        let dist = Math.hypot(player.targetX - player.x, player.targetY - player.y);
        if (dist < 0.05) {
            player.x = player.targetX;
            player.y = player.targetY;
            player.moving = false;
        } else {
            player.x = lerp(player.x, player.targetX, player.speed);
            player.y = lerp(player.y, player.targetY, player.speed);
            bobTimer += 0.2; // Эффект шагов
            if (Math.sin(bobTimer) > 0.9) audioManager.playFootstep();
        }
    }

    // Анимация игрока
    if (player.moving) {
        let angle = Math.sin(bobTimer) * 0.6;
        pLLeg.rotation.x = angle;
        pRLeg.rotation.x = -angle;
        pLArm.rotation.x = -angle;
        pRArm.rotation.x = angle;
    } else {
        pLLeg.rotation.x = lerp(pLLeg.rotation.x, 0, 0.1);
        pRLeg.rotation.x = lerp(pRLeg.rotation.x, 0, 0.1);
        pLArm.rotation.x = lerp(pLArm.rotation.x, 0, 0.1);
        pRArm.rotation.x = lerp(pRArm.rotation.x, 0, 0.1);
    }

    // Поворот камеры
    player.angle = lerpAngle(player.angle, player.targetAngle, 0.3);

    // Установка позиции камеры, света и модели игрока
    let pX = player.x * cellSize3D;
    let pZ = player.y * cellSize3D;
    let bobbing = player.moving ? Math.sin(bobTimer) * 0.3 : 0;

    playerMesh.position.set(pX, 3, pZ); // Ноги на 0 (3 - половина высоты по логике 6)
    playerMesh.rotation.y = player.angle;
    playerMesh.visible = settings.thirdPerson;

    playerLight.position.set(pX, 5, pZ);

    if (settings.thirdPerson) {
        // Вид от третьего лица (камера сзади и выше)
        let camDist = 6;
        let camHeight = 8;
        camera.position.set(
            pX - Math.sin(player.angle) * camDist,
            camHeight,
            pZ - Math.cos(player.angle) * camDist
        );
        camera.lookAt(pX, 3, pZ);
    } else {
        // Вид от первого лица
        camera.position.set(pX, 5 + bobbing, pZ);
        let lookX = pX + Math.sin(player.angle) * 10;
        let lookZ = pZ + Math.cos(player.angle) * 10;
        camera.lookAt(lookX, 5 + bobbing, lookZ);
    }

    // Проверка победы
    if (player.targetX === exitCell.x && player.targetY === exitCell.y) {
        gameState = 'win';
        winUI.classList.add('active');
        return;
    }

    // Логика Сущности
    if (entity.active) {
        if (!entity.moving) {
            entity.path = findPath(entity.targetX, entity.targetY, player.targetX, player.targetY);
            if (entity.path.length > 0) {
                let nextStep = entity.path[0];
                entity.targetX = nextStep.x;
                entity.targetY = nextStep.y;
                entity.moving = true;
            }
        } else {
            let dist = Math.hypot(entity.targetX - entity.x, entity.targetY - entity.y);
            if (dist < 0.05) {
                entity.x = entity.targetX;
                entity.y = entity.targetY;
                entity.moving = false;
            } else {
                entity.x = lerp(entity.x, entity.targetX, entity.speed);
                entity.y = lerp(entity.y, entity.targetY, entity.speed);
                eAnimTimer += 0.15;
            }
        }

        // Анимация сущности
        if (entity.moving) {
            let angle = Math.sin(eAnimTimer) * 0.5;
            eLLeg.rotation.x = angle;
            eRLeg.rotation.x = -angle;
            eLArm.rotation.x = -angle;
            eRArm.rotation.x = angle;
        } else {
            eLLeg.rotation.x = lerp(eLLeg.rotation.x, 0, 0.1);
            eRLeg.rotation.x = lerp(eRLeg.rotation.x, 0, 0.1);
            eLArm.rotation.x = lerp(eLArm.rotation.x, 0, 0.1);
            eRArm.rotation.x = lerp(eRArm.rotation.x, 0, 0.1);
        }

        // Обновление 3D модели сущности
        entityMesh.position.set(entity.x * cellSize3D, 6, entity.y * cellSize3D);

        // Пульсация красного света
        entityLight.intensity = 3 + Math.sin(Date.now() * 0.005) * 1.5;

        // Столкновение
        let collisionDist = Math.hypot(player.x - entity.x, player.y - entity.y);
        if (collisionDist < 0.7) {
            gameState = 'gameover';
            gameOverUI.classList.add('active');
        }
    }
}

function gameLoop() {
    if (gameState !== 'playing') return;
    if (currentDifficulty === 'extreme') {
        updateExtremeLogic();
    } else {
        updateLogic();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
}

function updateExtremeLogic() {
    // Управление полосами
    if (!player.isTurning) {
        if (keys.a || keys.ArrowLeft) {
            if (extremeLane > -1) extremeLane--;
            player.isTurning = true;
        } else if (keys.d || keys.ArrowRight) {
            if (extremeLane < 1) extremeLane++;
            player.isTurning = true;
        }
    } else {
        if (!keys.a && !keys.ArrowLeft && !keys.d && !keys.ArrowRight) player.isTurning = false;
    }

    player.x = lerp(player.x, extremeLane * 25, 0.1);
    playerMesh.position.set(player.x, 3, 23); // Игрок на Z=23
    playerMesh.visible = true;
    playerMesh.rotation.y = Math.PI;

    // ОБНОВЛЯЕМ СВЕТ У ИГРОКА (чтобы было видно персонажа)
    playerLight.position.set(player.x, 10, 23);

    // АНИМАЦИЯ БЕГА ИГРОКА (Экстрим)
    let pAnimTime = Date.now() * 0.01;
    let pAngle = Math.sin(pAnimTime) * 0.7;
    pLLeg.rotation.x = pAngle;
    pRLeg.rotation.x = -pAngle;
    pLArm.rotation.x = -pAngle;
    pRArm.rotation.x = pAngle;
    // Звук шагов
    if (Math.sin(pAnimTime) > 0.9) audioManager.playFootstep();

    // Мигание карты (теперь и свет мигает)
    if (Math.floor(Date.now() / 350) % 2 === 0) {
        scene.background = new THREE.Color(0x330000);
        playerLight.intensity = 4.0;
        playerLight.color.set(0xff0000);
    } else {
        scene.background = new THREE.Color(0x000000);
        playerLight.intensity = 0.8;
        playerLight.color.set(0xffffff);
    }

    // Препятствия
    if (Math.random() < 0.03) spawnObstacle();

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.position.z += 2.5;

        // БЫСТРОЕ МИГАНИЕ ШИПОВ (Экстрим)
        let isFastRed = Math.floor(Date.now() / 150) % 2 === 0;
        if (obs.children[0]) { // PointLight шипа
            obs.children[0].intensity = isFastRed ? 5 : 0.5;
        }
        obs.material.emissive.setHex(isFastRed ? 0xff0000 : 0x330000);

        if (obs.position.z > 45) { // Очистка после игрока
            mazeGroup.remove(obs);
            obstacles.splice(i, 1);
            continue;
        }
        // Столкновение на Z=23
        if (Math.abs(obs.position.z - 23) < 3 && Math.abs(obs.position.x - player.x) < 7) {
            gameState = 'gameover';
            gameOverUI.classList.add('active');
            extremeTimerUI.style.display = 'none';
            audioManager.stopExtremeMusic();
        }
    }

    // Сущность убрана во время побега (она бежит сзади)
    entityMesh.visible = false;

    camera.position.set(player.x * 0.5, 17, 60); // Камера чуть выше и сбалансированнее
    camera.lookAt(player.x, 5, -30);

    // Таймер
    let now = Date.now();
    if (now - lastTimerUpdate >= 1000) {
        extremeTimeLeft--;
        lastTimerUpdate = now;
        extremeTimerUI.innerText = "ВЫЖИВАЙ: " + extremeTimeLeft;

        if (extremeTimeLeft <= 0) {
            gameState = 'win';
            winUI.classList.add('active');
            extremeTimerUI.style.display = 'none';
            audioManager.stopExtremeMusic();
        }
    }
}

// Инициализация меню при загрузке
showMenu();

// Включение музыки после первого клика пользователя (требование браузеров)
document.addEventListener('mousedown', () => {
    audioManager.init();
    audioManager.resume();
    if (gameState === 'menu') {
        audioManager.startMenuMusic();
    }
}, { once: true });
