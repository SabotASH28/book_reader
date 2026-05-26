// ==========================================================================
// 1. СТРУКТУРА КНИГ
// ==========================================================================
const BOOKS_DATA = {
    mayak: {
        title: "Под маяком",
        filePrefix: "mayak",
        chapterLabel: "Глава",  
        useRoman: true,         
        totalChapters: 13        
    },
    taiga: {
        title: "Тайга",
        filePrefix: "taiga",
        chapterLabel: "Часть",  
        useRoman: false,        
        totalChapters: 6        
    },
    duelyant: {
        title: "Дуэлянт",
        filePrefix: "duelyant",
        chapterLabel: "Глава",
        useRoman: true,
        totalChapters: 6
    }
};

function convertToRoman(num) {
    const roman = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let str = '';
    for (let i in roman) {
        while (num >= roman[i]) {
            str += i;
            num -= roman[i];
        }
    }
    return str;
}

let currentBookId = null;
let currentChapterIndex = 0;
let currentFontSize = 18;
let isRestoringScroll = false; 

// ==========================================================================
// 2. ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ТЕМЫ (ОБЕ КНОПКИ СИНХРОННО)
// ==========================================================================
const themeToggleMain = document.getElementById('theme-toggle');
const themeToggleReader = document.getElementById('reader-theme-toggle');
const body = document.body;

function applyTheme(theme) {
    if (theme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
    }
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    applyTheme('light');
}

function toggleTheme() {
    if (body.classList.contains('dark-theme')) {
        applyTheme('light');
        localStorage.setItem('theme', 'light');
    } else {
        applyTheme('dark');
        localStorage.setItem('theme', 'dark');
    }
}

if (themeToggleMain) themeToggleMain.addEventListener('click', toggleTheme);
if (themeToggleReader) themeToggleReader.addEventListener('click', toggleTheme);

// ==========================================================================
// 3. SPA СВЯЗКА: БИБЛИОТЕКА <-> ЧИТАЛКА + НАВИГАЦИЯ
// ==========================================================================
const mainScreen = document.getElementById('main-screen');
const readerScreen = document.getElementById('reader-screen');
const closeReaderBtn = document.getElementById('close-reader');

function openReader(bookId, chapterIndex = null, targetScroll = null) {
    if (!BOOKS_DATA[bookId]) return;
    
    currentBookId = bookId;
    
    if (chapterIndex === null) {
        const savedChapter = localStorage.getItem(`progress_chapter_${bookId}`);
        currentChapterIndex = savedChapter !== null ? parseInt(savedChapter, 10) : 0;
    } else {
        currentChapterIndex = chapterIndex;
    }

    if (targetScroll === null) {
        const savedScroll = localStorage.getItem(`progress_scroll_${bookId}`);
        targetScroll = savedScroll !== null ? parseInt(savedScroll, 10) : 0;
    }
    
    mainScreen.classList.add('hidden');
    readerScreen.classList.remove('hidden');
    
    if (targetScroll > 0) {
        isRestoringScroll = true;
    } else {
        window.scrollTo(0, 0);
    }
    
    renderSidebarChapters();
    loadChapterContent(targetScroll);

    localStorage.setItem('activeBookId', bookId);
}

closeReaderBtn.addEventListener('click', () => {
    localStorage.removeItem('activeBookId');
    readerScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    window.scrollTo(0, 0);
    updateCursorListeners();
});

document.querySelectorAll('.read-btn, .card-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const bookId = e.currentTarget.getAttribute('data-book');
        openReader(bookId, null, null);
    });
});

// ==========================================================================
// 4. АВТОНОМНАЯ ЗАГРУЗКА ТЕКСТА
// ==========================================================================
const chaptersMenu = document.getElementById('chapters-menu');
const bookTitleElement = document.getElementById('reader-book-title');
const chapterTitleElement = document.getElementById('reader-chapter-title');
const paragraphsContainer = document.getElementById('reader-paragraphs');
const prevBtn = document.getElementById('prev-chapter-btn');
const nextBtn = document.getElementById('next-chapter-btn');

function getChapterName(book, index) {
    const number = index + 1;
    const formattedNumber = book.useRoman ? convertToRoman(number) : number;
    return `${book.chapterLabel} ${formattedNumber}`;
}

function renderSidebarChapters() {
    chaptersMenu.innerHTML = '';
    const book = BOOKS_DATA[currentBookId];
    
    for (let index = 0; index < book.totalChapters; index++) {
        const btn = document.createElement('button');
        btn.textContent = getChapterName(book, index); 
        if (index === currentChapterIndex) btn.classList.add('active-chapter');
        
        btn.addEventListener('click', () => {
            currentChapterIndex = index;
            document.querySelectorAll('.chapters-menu button').forEach(b => b.classList.remove('active-chapter'));
            btn.classList.add('active-chapter');
            
            localStorage.setItem(`progress_chapter_${currentBookId}`, currentChapterIndex);
            localStorage.removeItem(`progress_scroll_${currentBookId}`); 
            
            loadChapterContent(0);
            window.scrollTo(0, 0);
        });
        
        chaptersMenu.appendChild(btn);
    }
}

function loadChapterContent(targetScroll = 0) {
    const book = BOOKS_DATA[currentBookId];
    
    bookTitleElement.textContent = book.title;
    chapterTitleElement.textContent = getChapterName(book, currentChapterIndex);
    
    paragraphsContainer.innerHTML = '<p style="text-align:center; opacity:0.5;">Загрузка текста...</p>';
    
    const fileSrc = `${book.filePrefix}_${currentChapterIndex + 1}.js`;
    
    const oldScript = document.getElementById('temporary-text-script');
    if (oldScript) oldScript.remove();
    
    const script = document.createElement('script');
    script.id = 'temporary-text-script';
    script.src = fileSrc;
    
    script.onload = () => {
        paragraphsContainer.innerHTML = '';
        const fullText = window.CURRENT_CHAPTER_TEXT || '';
        
        if (!fullText) {
            paragraphsContainer.innerHTML = `<p style="text-align:center; color:red;">Ошибка: Файл текста пустой или оформлен неверно.</p>`;
            return;
        }
        
        const blocks = fullText.split(/\n\s*\n/);
        blocks.forEach(block => {
            const trimmedBlock = block.trim();
            if (trimmedBlock.length > 0) {
                const p = document.createElement('p');
                if (trimmedBlock.includes('\n')) {
                    p.innerHTML = trimmedBlock.replace(/\n/g, '<br>');
                } else {
                    p.textContent = trimmedBlock;
                }
                paragraphsContainer.appendChild(p);
            }
        });

        if (isRestoringScroll && targetScroll > 0) {
            setTimeout(() => {
                window.scrollTo(0, targetScroll);
                isRestoringScroll = false;
                updateProgressBar();
            }, 100);
        } else {
            updateProgressBar();
        }

        updateCursorListeners();
    };
    
    script.onerror = () => {
        paragraphsContainer.innerHTML = `<p style="text-align:center; color:red;">Не удалось загрузить файл скрипта: ${fileSrc}</p>`;
    };
    
    document.body.appendChild(script);

    prevBtn.disabled = currentChapterIndex === 0;
    nextBtn.disabled = currentChapterIndex === book.totalChapters - 1;
}

prevBtn.addEventListener('click', () => {
    if (currentChapterIndex > 0) {
        currentChapterIndex--;
        localStorage.setItem(`progress_chapter_${currentBookId}`, currentChapterIndex);
        localStorage.removeItem(`progress_scroll_${currentBookId}`);
        renderSidebarChapters();
        loadChapterContent(0);
        window.scrollTo(0, 0);
    }
});

nextBtn.addEventListener('click', () => {
    const book = BOOKS_DATA[currentBookId];
    if (currentChapterIndex < book.totalChapters - 1) {
        currentChapterIndex++;
        localStorage.setItem(`progress_chapter_${currentBookId}`, currentChapterIndex);
        localStorage.removeItem(`progress_scroll_${currentBookId}`);
        renderSidebarChapters();
        loadChapterContent(0);
        window.scrollTo(0, 0);
    }
});

// ==========================================================================
// 5. УПРАВЛЕНИЕ НАСТРОЙКАМИ ТЕКСТА
// ==========================================================================
const readerWrapper = document.getElementById('reader-text-container');
const fontSerifBtn = document.getElementById('font-serif-btn');
const fontSansBtn = document.getElementById('font-sans-btn');
const sizeDecreaseBtn = document.getElementById('size-decrease');
const sizeIncreaseBtn = document.getElementById('size-increase');

fontSerifBtn.addEventListener('click', () => {
    readerWrapper.classList.remove('font-sans');
    readerWrapper.classList.add('font-serif');
    fontSansBtn.classList.remove('active-setting');
    fontSerifBtn.classList.add('active-setting');
    setTimeout(updateProgressBar, 50);
});

fontSansBtn.addEventListener('click', () => {
    readerWrapper.classList.remove('font-serif');
    readerWrapper.classList.add('font-sans');
    fontSerifBtn.classList.remove('active-setting');
    fontSansBtn.classList.add('active-setting');
    setTimeout(updateProgressBar, 50);
});

sizeIncreaseBtn.addEventListener('click', () => {
    if (currentFontSize < 32) {
        currentFontSize += 2;
        document.documentElement.style.setProperty('--reader-font-size', `${currentFontSize}px`);
        setTimeout(updateProgressBar, 50);
    }
});

sizeDecreaseBtn.addEventListener('click', () => {
    if (currentFontSize > 14) {
        currentFontSize -= 2;
        document.documentElement.style.setProperty('--reader-font-size', `${currentFontSize}px`);
        setTimeout(updateProgressBar, 50);
    }
});

// ==========================================================================
// 6. ИНДИКАТОР ПЛАВНОГО ПРОГРЕССА И СКРОЛЛ
// ==========================================================================
function updateProgressBar() {
    const progressBar = document.getElementById('reader-progress');
    if (!progressBar || !currentBookId || mainScreen.classList.contains('hidden') === false) return;

    const totalHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const scrolled = window.scrollY;
    const scrollableDistance = totalHeight - windowHeight;

    if (scrollableDistance > 0) {
        const progressPercent = (scrolled / scrollableDistance) * 100;
        progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
    } else {
        progressBar.style.width = '100%';
    }
}

window.addEventListener('scroll', () => {
    if (currentBookId && mainScreen.classList.contains('hidden') && !isRestoringScroll) {
        localStorage.setItem(`progress_scroll_${currentBookId}`, window.scrollY);
        updateProgressBar();
    }
});

window.addEventListener('resize', updateProgressBar);

// ==========================================================================
// 7. РАБОТА КАСТОМНОГО КУРСОРA (ЖЁСТКАЯ СТАБИЛИЗАЦИЯ)
// ==========================================================================
const cursor = document.querySelector('.custom-cursor');

if (cursor) {
    document.addEventListener('mousemove', (e) => {
        // Добавляем класс видимости при первом движении мыши без условий
        cursor.classList.add('visible');
        
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    document.addEventListener('mousedown', () => cursor.classList.add('active'));
    document.addEventListener('mouseup', () => cursor.classList.remove('active'));
}

function updateCursorListeners() {
    if (!cursor) return;
    const interactiveElements = document.querySelectorAll('a, button, .book-row, .theme-toggle');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
    });
}

// Запускаем слушатели событий сразу при старте страницы
window.addEventListener('DOMContentLoaded', () => {
    updateCursorListeners();
    const activeBookId = localStorage.getItem('activeBookId');
    if (activeBookId && BOOKS_DATA[activeBookId]) {
        openReader(activeBookId, null, null);
    }
});