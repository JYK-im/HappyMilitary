// 페이지 로드 시 기존에 설정한 테마가 있는지 확인
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light');
        updateThemeIcon(true);
    }
});

function toggleTheme() {
    const html = document.documentElement;
    const isLight = html.classList.toggle('light');
    
    // 사용자의 선택을 저장 (새로고침 시 유지)
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeIcon(isLight);
}



function updateThemeIcon(isLight) {
    const icon = document.getElementById('themeIcon');
    if (isLight) {
        icon.classList.replace('fa-moon', 'fa-sun');
        icon.classList.replace('text-yellow-500', 'text-orange-500');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        icon.classList.replace('text-orange-500', 'text-yellow-500');
    }
}

    // 2. Firebase 설정 및 초기화 (한 번만 선언)
const firebaseConfig = {
  apiKey: "AIzaSyDaNmDpDXgiuELEO65Wk0PazVT2yeQeags",
  authDomain: "dividend-b090d.firebaseapp.com",
  databaseURL: "https://dividend-b090d-default-rtdb.firebaseio.com",
  projectId: "dividend-b090d",
  storageBucket: "dividend-b090d.firebasestorage.app",
  messagingSenderId: "543720180150",
  appId: "1:543720180150:web:15073a1e9706bb1f949917",
  measurementId: "G-W0JHGMMGHC"
};

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();
    let currentUser = null; 
    let allMarts = [];

// 1. Auth 인스턴스 초기화
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

provider.setCustomParameters({
  prompt: 'select_account'
});

// 2. 로그인 버튼 클릭 시 실행될 함수
function handleLogin() {
    auth.signInWithPopup(provider)
        .then((result) => {
            // 로그인 성공 시 사용자 정보를 가져옴
            currentUser = result.user;
            
            // UI 업데이트 (채팅창 활성화 등)
            const overlay = document.getElementById('chatBlindOverlay');
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 500);

            const chatArea = document.getElementById('chatContentArea');
            chatArea.classList.remove('opacity-20', 'pointer-events-none', 'select-none');
            
            document.getElementById('loginBtn').innerText = "로그아웃";
document.getElementById('loginBtn').onclick = handleLogout;
            console.log("로그인 성공:", currentUser.displayName);
        })
        .catch((error) => {
            console.error("로그인 실패:", error.message);
            alert("로그인 도중 문제가 발생했습니다.");
        });
}

// UI 업데이트 함수 분리
function updateUI(user) {
    if (user) {
        // 1. 오버레이 숨기기
        const overlay = document.getElementById('chatBlindOverlay');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 500);

        // 2. 채팅창 활성화
        const chatArea = document.getElementById('chatContentArea');
        chatArea.classList.remove('opacity-20', 'pointer-events-none', 'select-none');
        
        const input = document.getElementById('chatInput');
        input.disabled = false;
        input.placeholder = `${user.displayName}님, 대화에 참여하세요!`;

        // 3. 상단 버튼을 로그아웃으로 변경
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.innerText = "로그아웃";
        loginBtn.onclick = handleLogout; // 로그아웃 함수 연결
    }
}

// 로그아웃 함수
function handleLogout() {
    auth.signOut().then(() => {
        location.reload(); // 단순하게 페이지 새로고침으로 상태 초기화
    });
}

// 페이지 로드 시 로그인 상태 유지 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        updateUI(user);
    }
});

    // 3. 마트 데이터 로드 (캐시 우선 방식)
   async function loadMartData() {
    const listContainer = document.getElementById('waList');
    
    // [추가] 1. 브라우저 로컬 캐시 먼저 확인 (즉시 노출)
    const localCache = localStorage.getItem('marts_local_cache');
    if (localCache) {
        allMarts = JSON.parse(localCache);
        renderMarts(allMarts);
        console.log("로컬 캐시로 먼저 화면을 띄웠습니다.");
    }

    try {
        // [개선] 2. 타임아웃 설정 (5초)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const snapshot = await db.ref('marts_cache').once('value');
        clearTimeout(timeoutId);
        const cachedData = snapshot.val();

        if (cachedData && (Date.now() - cachedData.lastUpdated < 3600000)) {
            allMarts = cachedData.rows;
            localStorage.setItem('marts_local_cache', JSON.stringify(allMarts)); // 로컬 업데이트
            renderMarts(allMarts);
        } else {
            await fetchAndCacheMarts();
        }
    } catch (error) {
        console.warn("데이터 로드 지연/실패, 재시도 또는 API 호출 시도");
        await fetchAndCacheMarts();
    }
}

    // 4. 국방부 API 호출 및 캐싱 (CORS 에러 방지 프록시 사용)
   async function fetchAndCacheMarts() {
    const myKey = "3231313637393730303336333832313035";
    const apiUrl = `https://openapi.mnd.go.kr/${myKey}/xml/TB_MND_MART_CURRENT/1/999/`;
    
    // 1. 기존 프록시 대신 더 안정적인 allorigins 활용 (타임아웃 방지용)
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const xmlText = data.contents; // allorigins는 contents 안에 결과가 담깁니다.
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const rows = Array.from(xmlDoc.querySelectorAll('row'));

        if (rows.length > 0) {
            allMarts = rows.map(row => ({
                MART: row.querySelector('MART')?.textContent || "정보없음",
                LOC: row.querySelector('LOC')?.textContent || "주소없음",
                TEL: row.querySelector('TEL')?.textContent || ""
            }));

            // 로컬 캐시 즉시 업데이트
            localStorage.setItem('marts_local_cache', JSON.stringify(allMarts));
            
            // Firebase 저장 (선택 사항)
            db.ref('marts_cache').set({
                lastUpdated: Date.now(),
                rows: allMarts
            }).catch(e => console.warn("Firebase Write Skip"));

            renderMarts(allMarts);
        }
    } catch (e) {
        console.error("프록시 서버 응답 지연:", e);
        // [중요] 완전히 실패했을 때 로컬 캐시가 있다면 그거라도 한 번 더 띄움
        const fallback = localStorage.getItem('marts_local_cache');
        if (fallback) {
            renderMarts(JSON.parse(fallback));
        } else {
            document.getElementById('waList').innerHTML = 
                `<p class="text-center py-10 text-gray-600 text-[10px]">외부 서버 응답이 지연되고 있습니다.<br>잠시 후 새로고침(F5) 해주세요.</p>`;
        }
    }
}

    // 5. 통합 렌더링 함수
    function renderMarts(marts) {
        const listContainer = document.getElementById('waList');
        if (!listContainer) return;

        const now = new Date();
        const curTime = now.getHours() * 100 + now.getMinutes();
        const day = now.getDay();

        listContainer.innerHTML = marts.map(mart => {
            let status = { text: "운영 종료", color: "text-red-500", dot: "bg-red-500" };
            let isHoliday = (day === 0); // 일요일 휴무 가정
            let openTime = 900, closeTime = (day === 6) ? 1500 : 1800;

            if (!isHoliday && curTime >= openTime && curTime < closeTime) {
                status = (curTime >= 1200 && curTime < 1300) 
                    ? { text: "점심 시간", color: "text-yellow-500", dot: "bg-yellow-500" }
                    : { text: "운영 중", color: "text-green-500", dot: "bg-green-500 animate-pulse" };
            }

            return `
                <div class="flex flex-col p-3 bg-black/20 rounded-xl border border-gray-800 hover:border-[#8a9a5b]/50 transition-all">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="text-[12px] font-bold text-white">${mart.MART}</h4>
                        <span class="flex items-center gap-1 text-[9px] font-bold ${status.color}">
                            <span class="w-1.5 h-1.5 rounded-full ${status.dot}"></span>${status.text}
                        </span>
                    </div>
                    <p class="text-[9px] text-gray-500 truncate mb-2">${mart.LOC}</p>
                    <div class="flex justify-between items-center text-[9px]">
                         <span class="text-gray-600">Tel: ${mart.TEL || '정보없음'}</span>
                         ${mart.TEL ? `<a href="tel:${mart.TEL}" class="accent-khaki font-bold">전화하기</a>` : ''}
                    </div>
                </div>`;
        }).join('');
    }

// 4. 특별공급 공고 로드 함수 (JSON 데이터 추출 방식 적용)
async function loadAptNotices() {
    const listContainer = document.getElementById('aptNoticeList');
    // 게시판 메인 URL
    const boardUrl = "https://www.welfare.mil.kr/board/board.do?m_code=1179&be_id=c_apt";
    
    // 로컬 캐시 확인 (즉시 노출)
    const cachedApt = localStorage.getItem('apt_local_cache');
    if (cachedApt) {
        listContainer.innerHTML = cachedApt;
    }

    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(boardUrl)}&_=${Date.now()}`, {
            signal: AbortSignal.timeout(6000)
        });
        
        const data = await response.json();
        const htmlText = data.contents;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const rows = doc.querySelectorAll("table tbody tr"); // tbody 명시하여 헤더 제외
        
        let noticeHtml = "";
        let foundCount = 0;

        rows.forEach((row) => {
            const linkElement = row.querySelector("a");
            if (linkElement && foundCount < 5) {
                const title = linkElement.innerText.trim();
                
                // [핵심] 상세 게시물 ID 추출 (onclick 이벤트나 href 속성에서 추출)
                // 보통 'viewBoard('12345')' 같은 형태이므로 숫자만 뽑아냅니다.
                const onclickText = linkElement.getAttribute("onclick") || "";
                const postIdMatch = onclickText.match(/\d+/);
                const postId = postIdMatch ? postIdMatch[0] : "";
                
                // 상세 페이지 링크 생성 (게시판 주소 + 게시물 번호 파라미터)
                const detailUrl = postId 
                    ? `https://www.welfare.mil.kr/board/board.do?m_code=1179&be_id=c_apt&gs_id=${postId}&method=view`
                    : boardUrl;

                if (title.length > 5 && !title.includes("자바스크립트")) {
                    const tds = row.querySelectorAll("td");
                    const date = tds.length > 2 ? tds[tds.length - 2].innerText.trim() : "";
                    
                    noticeHtml += `
                        <li class="group border-b border-gray-800/50 pb-2 last:border-0">
                            <a href="${detailUrl}" target="_blank" class="block group-hover:text-[#8a9a5b]">
                                <p class="truncate text-white/90">• ${title}</p>
                                <span class="text-[9px] text-gray-500">${date}</span>
                            </a>
                        </li>`;
                    foundCount++;
                }
            }
        });

        if (foundCount > 0) {
            listContainer.innerHTML = noticeHtml;
            localStorage.setItem('apt_local_cache', noticeHtml);
        }
    } catch (error) {
        console.error("공고 로드 실패:", error);
        if (!listContainer.innerHTML || listContainer.innerHTML.includes('로딩')) {
            listContainer.innerHTML = `
                <li class="py-4 text-center">
                    <p class="text-[10px] text-gray-500 mb-2">서버 응답이 늦어지고 있습니다.</p>
                    <a href="${boardUrl}" target="_blank" class="btn-khaki px-4 py-2 rounded-full text-[9px] inline-block">
                        공고 게시판 바로가기
                    </a>
                </li>`;
        }
    }
}// 5. 페이지 초기화 및 검색 이벤트 (함수 호출 보장)
document.addEventListener('DOMContentLoaded', () => {
    loadMartData();   // 영외마트 로드
    loadAptNotices(); // 특별공급 로드
    loadBlogUpdates(); // 블로그 로드
    listenForChats(); // 채팅 리스너 시작

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });
});
    
    // 검색 기능: renderMarts(allMarts) 호출
document.getElementById('waSearch')?.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = allMarts.filter(m => m.MART.toLowerCase().includes(val) || m.LOC.toLowerCase().includes(val));
        renderMarts(filtered);
    });
});

// 실시간 업데이트 (1분마다)
setInterval(() => { if(allMarts.length > 0) renderMarts(allMarts); }, 60000);

// [채팅 기능 고도화]

// 1. 실시간 메시지 수신 리스너 (페이지 로드 시 자동 실행)
function listenForChats() {
    const chatRef = db.ref('chats');
    // 최신 50개 메시지만 가져오기
    chatRef.limitToLast(50).on('child_added', (snapshot) => {
        const data = snapshot.val();
        renderMessage(data);
    });
}

// 2. 메시지 화면 렌더링 함수
function renderMessage(data) {
    const box = document.getElementById('msgBox');
    if (!box) return;

    // 내가 보낸 메시지인지 확인
    const isMine = currentUser && data.uid === currentUser.uid;
    
    const msgHtml = `
        <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-fade-in mb-2">
            ${!isMine ? `<span class="text-[9px] text-gray-500 mb-1 ml-1">${data.userName}</span>` : ''}
            <div class="${isMine ? 'bg-[#8a9a5b] text-black rounded-tr-none' : 'bg-gray-800 text-white rounded-tl-none'} p-2.5 rounded-2xl max-w-[85%] font-medium shadow-md">
                <p class="text-[11px] leading-relaxed break-all">${data.message}</p>
            </div>
            <span class="text-[8px] text-gray-600 mt-1">${data.time}</span>
        </div>
    `;
    
    box.insertAdjacentHTML('beforeend', msgHtml);
    box.scrollTop = box.scrollHeight; // 새 메시지 오면 자동 스크롤
}

// 3. 메시지 전송 함수 (수정)
function sendChat() {
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    const chatRef = db.ref('chats');
    const newChatRef = chatRef.push(); // 고유 ID 생성

    const chatData = {
        uid: currentUser.uid,
        userName: currentUser.displayName || "익명",
        message: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    newChatRef.set(chatData)
        .then(() => {
            input.value = ""; // 입력창 비우기
        })
        .catch((error) => {
            console.error("전송 실패:", error);
            alert("메시지 전송에 실패했습니다.");
        });
}



// 블로그 최신글 로드 함수
async function loadBlogUpdates() {
    const blogRssUrl = "https://rss.blog.naver.com/stream_deck";
    // 'get' 대신 'raw'를 사용하여 더 직관적으로 데이터를 가져옵니다.
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(blogRssUrl)}`;
    const container = document.getElementById('blogUpdateList');

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('네트워크 응답에 문제가 있습니다.');
        
        const xmlText = await response.text(); // raw 데이터를 텍스트로 바로 받음
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // XML 파싱 에러 확인
        const parseError = xmlDoc.getElementsByTagName("parsererror");
        if (parseError.length > 0) throw new Error("XML 파싱 에러");

        const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 3);

        if (items.length > 0) {
            container.innerHTML = items.map(item => {
                const title = item.querySelector('title')?.textContent || "제목 없음";
                const link = item.querySelector('link')?.textContent || "#";
                const pubDate = new Date(item.querySelector('pubDate')?.textContent);
                
                const dateText = pubDate.toLocaleDateString('ko-KR', {
                    year: 'numeric', month: '2-digit', day: '2-digit'
                }).replace(/\. /g, '.').replace(/\.$/, '');

                const description = item.querySelector('description')?.textContent || "";
                const summary = description.replace(/<[^>]*>?/gm, '').substring(0, 80) + "...";

                return `
                    <div class="group cursor-pointer p-4 bg-black/20 rounded-xl border border-gray-800 hover:border-[#8a9a5b] transition-all" 
                         onclick="window.open('${link}', '_blank')">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-[9px] bg-[#8a9a5b] text-black px-2 py-0.5 rounded font-bold uppercase tracking-tighter">New Post</span>
                            <span class="text-[10px] text-gray-600 font-medium">${dateText}</span>
                        </div>
                        <h3 class="font-bold text-sm group-hover:text-[#8a9a5b] mb-1">${title}</h3>
                        <p class="text-[11px] text-gray-500 line-clamp-1 leading-relaxed">${summary}</p>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `<p class="text-center py-10 text-gray-600 text-xs">최신 게시글이 없습니다.</p>`;
        }
    } catch (error) {
        console.error("블로그 로드 실패 상세:", error);
        container.innerHTML = `
            <div class="text-center py-10">
                <p class="text-gray-600 text-xs mb-2">블로그 소식을 실시간으로 불러오지 못했습니다.</p>
                <button onclick="window.open('https://blog.naver.com/stream_deck', '_blank')" 
                        class="text-[10px] text-[#8a9a5b] underline">
                    블로그에서 직접 확인하기
                </button>
            </div>`;
    }
}

// 시간 계산 보조 함수
function formatTimeAgo(date) {
    const diff = Math.floor((new Date() - date) / (1000 * 60));
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
}
