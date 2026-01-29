
const firebaseConfig = {
  apiKey: "AIzaSyDaNmDpDXgiuELEO65Wk0PazVT2yeQeags",
  authDomain: "hang-goon.kr",
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

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

provider.setCustomParameters({
  prompt: 'select_account'
});

function handleLogin() {
    auth.signInWithPopup(provider)
        .then((result) => {
            currentUser = result.user;
            // 직접 수정하지 말고, 이미 잘 만들어둔 updateUI를 호출하세요.
            updateUI(currentUser); 
            console.log("로그인 성공:", currentUser.displayName);
        })
        .catch((error) => {
            console.error("로그인 실패:", error.message);
            alert("로그인 도중 문제가 발생했습니다.");
        });
}

// script.js의 updateUI 함수를 이 내용으로 교체하세요.
async function updateUI(user) {
    console.log("1. updateUI 실행됨. 유저 UID:", user ? user.uid : "로그아웃 상태");
    
    if (user) {
        currentUser = user; // 전역 변수에 현재 유저 저장
        try {
            // 1. DB에서 사용자 정보를 가져옵니다.
            const userRef = db.ref('users/' + user.uid);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();
            console.log("2. DB 조회 성공:", userData);

            // 2. 실명 정보(realName)가 없다면 모달창을 보여줍니다.
            if (!userData || !userData.realName) {
                console.log("3. 추가 정보 없음 -> 모달 오픈");
                document.getElementById('profileModal').classList.remove('hidden');
                
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) {
                    loginBtn.innerText = "로그아웃";
                    loginBtn.onclick = handleLogout;
                }
                return; 
            }

            // 3. 정보가 있다면 채팅창을 활성화합니다.
            activateChatInterface(userData.realName);

        } catch (error) {
            // 권한 에러(Permission Denied)가 나더라도 신규 유저로 간주하고 모달을 띄웁니다.
            console.error("DB 조회 에러(정상적인 신규 유저 흐름):", error);
            document.getElementById('profileModal').classList.remove('hidden');
        }
    }
}

// 채팅창 활성화 로직 분리
function activateChatInterface(realName) {
    const overlay = document.getElementById('chatBlindOverlay');
    if (overlay) {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 500);
    }

    const chatArea = document.getElementById('chatContentArea');
    if (chatArea) {
        chatArea.classList.remove('opacity-20', 'pointer-events-none', 'select-none');
    }
    
    const input = document.getElementById('chatInput');
    const sendBtn = document.querySelector('#chatContentArea button');

    if (input) {
        input.disabled = false;
        input.placeholder = `${realName}님, 환영합니다!`;
    }

    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.classList.remove('opacity-50');
        sendBtn.classList.add('cursor-pointer', 'active:scale-95');
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerText = "로그아웃";
        loginBtn.onclick = handleLogout;
    }
}
let confirmationResult = null; // 인증 결과를 담을 변수

// 1. 페이지 로드 시 리캡차 초기화
window.onload = function() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible', // 사용자에게 보이지 않게 설정
            'callback': (response) => {
                console.log("리캡차 인증 완료");
            }
        });
    }
};

// 2. 인증문자 발송 함수
// script.js에 이 함수들이 있는지 꼭 확인하세요!
function sendVerificationCode() {
    const phone = document.getElementById('regPhone').value.trim();
    if (!/^010\d{8}$/.test(phone)) {
        alert("01012345678 형식으로 입력해주세요.");
        return;
    }
    
    const appVerifier = window.recaptchaVerifier;
    const formattedPhone = "+82" + phone.substring(1);

    auth.signInWithPhoneNumber(formattedPhone, appVerifier)
        .then((result) => {
            confirmationResult = result;
            alert("인증번호가 발송되었습니다.");
            document.getElementById('otpSection').classList.remove('hidden');
        }).catch((error) => {
            alert("인증 실패: " + error.message);
        });
}

function confirmCode() {
    const code = document.getElementById('verificationCode').value.trim();
    confirmationResult.confirm(code)
        .then(() => {
            alert("인증 성공!");
            saveUserProfile();
        }).catch(() => alert("인증번호가 틀립니다."));
}

// 4. 최종 데이터 저장 함수 (기존 saveUserProfile 수정)
function saveUserProfile() {
    const name = document.getElementById('regName').value.trim();
    const birth = document.getElementById('regBirth').value;
    const phone = document.getElementById('regPhone').value.trim();

    if (!name || !birth || !phone) {
        alert("모든 정보를 입력해 주세요!");
        return;
    }

    db.ref('users/' + currentUser.uid).set({
        realName: name,
        birthdate: birth,
        phoneNumber: phone,
        email: currentUser.email,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("회원 등록이 완료되었습니다!");
        document.getElementById('profileModal').classList.add('hidden');
        updateUI(currentUser); // 화면 갱신하여 채팅창 활성화
    }).catch((error) => {
        console.error("저장 실패:", error);
    });
}

// 로그아웃 함수
function handleLogout() {
    auth.signOut().then(() => {
        location.reload();
    });
}

// 페이지 로드 시 로그인 상태 유지 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        updateUI(user);
    }
});

    // 3. 마트 데이터 로드
   async function loadMartData() {
    const listContainer = document.getElementById('waList');

    try {
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

// 마트 리스트 업데이트 및 통계 계산 함수
function updateWAStatus(martData) {
    let openCount = 0;
    let closedCount = 0;
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // 예: 15:30 -> 1530

    const listHtml = martData.map(mart => {
        // 운영 시간 파싱 (데이터 형식에 따라 조정 필요)
        // 여기서는 예시로 '운영중' 상태를 판별한다고 가정합니다.
        const isOpen = checkMartOpen(mart.time); 
        
        if (isOpen) openCount++;
        else closedCount++;

        return `
            <div class="p-3 rounded-xl bg-black/20 border border-gray-800 hover:border-[#8a9a5b]/50 transition-all">
                <div class="flex justify-between items-start mb-1">
                    <h4 class="font-bold text-xs text-white">${mart.name}</h4>
                    <span class="${isOpen ? 'text-green-500' : 'text-red-500'} text-[9px] font-black">
                        ● ${isOpen ? '운영 중' : '운영 종료'}
                    </span>
                </div>
                <p class="text-[10px] text-gray-500 mb-1"><i class="fa-solid fa-location-dot mr-1"></i>${mart.address}</p>
                <p class="text-[9px] text-gray-600"><i class="fa-regular fa-clock mr-1"></i>${mart.time}</p>
            </div>
        `;
    }).join('');

    document.getElementById('waList').innerHTML = listHtml;
    
    // 🔢 숫자 업데이트
    document.getElementById('waOpenCount').innerText = `운영중 ${openCount}`;
    document.getElementById('waClosedCount').innerText = `운영종료 ${closedCount}`;
}

// 간단한 시간 체크 함수 (예시)
function checkMartOpen(timeStr) {
    if (!timeStr || timeStr.includes('휴점')) return false;
    // 실제 운영시간 파싱 로직이 이곳에 들어갑니다.
    return true; 
}
// [통합 수정] 마트 리스트 렌더링 및 실시간 통계 계산
function renderMarts(marts) {
    const listContainer = document.getElementById('waList');
    const openBadge = document.getElementById('waOpenCount');   // HTML의 숫자 표시 ID
    const closedBadge = document.getElementById('waClosedCount'); // HTML의 숫자 표시 ID
    if (!listContainer) return;

    const now = new Date();
    const curTime = now.getHours() * 100 + now.getMinutes();
    const day = now.getDay();

    let openCount = 0;
    let closedCount = 0;

    listContainer.innerHTML = marts.map(mart => {
        // 기본 상태: 운영 종료
        let status = { text: "운영 종료", color: "text-red-500", dot: "bg-red-500" };
        let isHoliday = (day === 0); // 일요일 휴무 가정
        let openTime = 900, closeTime = (day === 6) ? 1500 : 1800; // 토요일은 15시, 평일 18시

        let isOpen = false;
        // 운영 시간 체크 로직
        if (!isHoliday && curTime >= openTime && curTime < closeTime) {
            isOpen = true;
            if (curTime >= 1200 && curTime < 1300) {
                status = { text: "점심 시간", color: "text-yellow-500", dot: "bg-yellow-500" };
            } else {
                status = { text: "운영 중", color: "text-green-500", dot: "bg-green-500 animate-pulse" };
            }
        }

        // 통계 카운트 (점심시간도 운영 중으로 간주하거나 필요시 분리)
        if (isOpen) openCount++;
        else closedCount++;

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

    // ⭐ 상단 뱃지에 최종 숫자 주입 (이 부분이 핵심!)
    if (openBadge) openBadge.innerText = openCount;
    if (closedBadge) closedBadge.innerText = closedCount;
}

 
const MY_PROXY = "https://us-central1-dividend-b090d.cloudfunctions.net/getMilitaryData";
// 4. 특별공급 공고 로드 함수
async function loadAptNotices() {
    const listContainer = document.getElementById('aptNoticeList');
    const boardUrl = "https://www.welfare.mil.kr/board/board.do?m_code=1179&be_id=c_apt";
    const proxyUrl = `${MY_PROXY}?url=${encodeURIComponent(boardUrl)}`;
  
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy error');

        const htmlText = await response.text();
        const doc = new DOMParser().parseFromString(htmlText, "text/html");
        const rows = doc.querySelectorAll("table tbody tr");
        
        let noticeHtml = "";
        let foundCount = 0;

        rows.forEach((row) => {
            const linkElement = row.querySelector("a");
            if (linkElement && foundCount < 6) {
                const title = linkElement.innerText.trim();
                const onclickText = linkElement.getAttribute("onclick") || "";
                const postIdMatch = onclickText.match(/\d+/);
                const postId = postIdMatch ? postIdMatch[0] : "";
                const detailUrl = postId ? `https://www.welfare.mil.kr/board/board.do?m_code=1179&be_id=c_apt&gs_id=${postId}&method=view` : boardUrl;

                if (title.length > 5) {
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

        if (foundCount > 0) listContainer.innerHTML = noticeHtml;
    } catch (e) { 
        console.error("공고 로드 실패", e);
    }
}


// 6. 채팅 기능 (기존 유지)
function sendChat() {
    if (!currentUser) { alert("로그인이 필요합니다."); return; }
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if(!text) return;

    db.ref('chats').push({
        uid: currentUser.uid,
        userName: currentUser.displayName,
        message: text,
        timestamp: Date.now()
    }).then(() => {
        input.value = ""; 
        input.focus(); // 전송 후 바로 다시 입력할 수 있게 포커스 유지
    });
}

// 실시간 채팅 리스너 (한 번만 설정)
db.ref('chats').limitToLast(20).on('child_added', (snapshot) => {
    const msg = snapshot.val();
    const box = document.getElementById('msgBox');
    if (!box) return;

    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isMe = currentUser && (msg.uid === currentUser.uid);
    
    const msgHtml = `
        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in mb-4">
            <span class="text-[9px] text-gray-400 mb-1">${msg.userName}</span>
            <div class="${isMe ? 'bg-[#8a9a5b] text-black' : 'bg-gray-700 text-white'} p-2.5 rounded-2xl max-w-[90%] font-medium shadow-lg">
                ${msg.message}
            </div>
            <span class="text-[8px] text-gray-600 mt-1">${time}</span>
        </div>
    `;
    box.insertAdjacentHTML('beforeend', msgHtml);
    box.scrollTop = box.scrollHeight;
});

// [4] 테마 설정
function toggleTheme() {
    const html = document.documentElement;
    const isLight = html.classList.toggle('light');
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

// [5] 초기 실행 및 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light');
        updateThemeIcon(true);
    }

    // 2. 데이터 로드 호출
Promise.all([
        quickFetchMarts(),
        loadAptNotices(),
        loadBlogUpdates()
    ]).catch(err => console.error("일부 데이터 로드 실패:", err));
    
    // 3. 검색 이벤트 바인딩
document.getElementById('waSearch')?.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = allMarts.filter(m => m.MART.toLowerCase().includes(val) || m.LOC.toLowerCase().includes(val));
        renderMarts(filtered);
    });

    // 4. 채팅 엔터키 전송 이벤트
const chatInput = document.getElementById('chatInput');
    chatInput?.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            e.preventDefault(); 
            sendChat();
        }
    });
});

async function quickFetchMarts() {
    const listContainer = document.getElementById('waList');
    const myKey = "3231313637393730303336333832313035";
    const apiUrl = `https://openapi.mnd.go.kr/${myKey}/xml/TB_MND_MART_CURRENT/1/999/`;
    const proxyUrl = `${MY_PROXY}?url=${encodeURIComponent(apiUrl)}`;
  
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Network error');
        
        const xmlText = await response.text(); // 전용 프록시는 XML을 그대로 줍니다
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const rows = Array.from(xmlDoc.querySelectorAll('row'));

        if (rows.length > 0) {
            allMarts = rows.map(row => ({
                MART: row.querySelector('MART')?.textContent || "정보없음",
                LOC: row.querySelector('LOC')?.textContent || "주소없음",
                TEL: row.querySelector('TEL')?.textContent || ""
            }));
            renderMarts(allMarts);
        }
    } catch (e) {
        console.error("마트 로드 실패:", e);
        listContainer.innerHTML = `<p class="text-center py-10 text-xs">정보를 가져오지 못했습니다.</p>`;
    }
}

// 블로그 최신글 로드 함수
async function loadBlogUpdates() {
    const blogRssUrl = "https://rss.blog.naver.com/stream_deck";
    const proxyUrl = `${MY_PROXY}?url=${encodeURIComponent(blogRssUrl)}`;
    const container = document.getElementById('blogUpdateList');

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('네트워크 응답 에러');
        
        const xmlText = await response.text(); 
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 3);

        if (items.length > 0) {
            container.innerHTML = items.map(item => {
                const title = item.querySelector('title')?.textContent || "제목 없음";
                const link = item.querySelector('link')?.textContent || "#";
                const pubDateStr = item.querySelector('pubDate')?.textContent;
                const pubDate = pubDateStr ? new Date(pubDateStr) : new Date();
                
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
        }
    } catch (error) {
        console.error("블로그 로드 실패:", error);
    }
}

// 시간 계산 보조 함수
function formatTimeAgo(date) {
    const diff = Math.floor((new Date() - date) / (1000 * 60));
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
}
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bannerContainer');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    if (nextBtn && prevBtn && container) {
        nextBtn.addEventListener('click', () => {
            container.scrollBy({ left: 300, behavior: 'smooth' });
        });
        prevBtn.addEventListener('click', () => {
            container.scrollBy({ left: -300, behavior: 'smooth' });
        });
    }
});

// 게시판 전환 함수
function switchBoard(boardName) {
    // 섹션 숨기기/보이기
    const homeSec = document.getElementById('homeSection');
    const freeSec = document.getElementById('freeBoardSection');
    
    // 메뉴 활성화 디자인 변경
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (boardName === 'free') {
        homeSec.style.display = 'none';
        freeSec.classList.remove('hidden');
        loadPosts(); // 게시글 불러오기
    } else if (boardName === 'home') {
        homeSec.style.display = 'block';
        freeSec.classList.add('hidden');
    }
}

// 모달 제어
function openWriteModal() {
    if (!currentUser) {
        alert("로그인이 필요합니다!");
        handleLogin();
        return;
    }
    document.getElementById('writeModal').classList.remove('hidden');
}

function closeWriteModal() {
    document.getElementById('writeModal').classList.add('hidden');
}

// 게시글 저장 (Firebase)
function savePost() {
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;

    if (!title || !content) {
        alert("제목과 내용을 모두 입력해주세요.");
        return;
    }

    const newPostRef = db.ref('posts/free').push();
    newPostRef.set({
        title: title,
        content: content,
        uid: currentUser.uid,
        userName: currentUser.displayName,
        userPhoto: currentUser.photoURL,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("게시글이 등록되었습니다!");
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
        closeWriteModal();
    });
}

// 게시글 목록 불러오기
function loadPosts() {
    const postList = document.getElementById('postList');
    db.ref('posts/free').orderByChild('timestamp').on('value', (snapshot) => {
        let html = '';
        const data = snapshot.val();
        if (data) {
            // 최신순 정렬을 위해 배열로 변환
            const posts = Object.values(data).reverse();
            posts.forEach(post => {
                html += `
                    <div class="bg-card p-5 rounded-2xl shadow-md border border-transparent hover:border-gray-700 transition-all cursor-pointer">
                        <div class="flex items-center gap-2 mb-2">
                            <img src="${post.userPhoto}" class="w-5 h-5 rounded-full">
                            <span class="text-[11px] font-bold">${post.userName}</span>
                            <span class="text-[10px] text-gray-600">${formatTimeAgo(post.timestamp)}</span>
                        </div>
                        <h3 class="font-bold text-base mb-1">${post.title}</h3>
                        <p class="text-sm text-gray-400 line-clamp-2">${post.content}</p>
                    </div>
                `;
            });
            postList.innerHTML = html;
        } else {
            postList.innerHTML = '<p class="text-center py-10 text-gray-600">첫 번째 주인공이 되어보세요! 🪖</p>';
        }
    });
}
// 슬라이더용 이미지 데이터 (원하는 만큼 추가하세요)
const sliderData = [
    "https://images.unsplash.com/photo-1599508704512-2f19efd1e35f?q=80&w=1200",
    "https://images.unsplash.com/photo-1585123334904-845d60e97b29?q=80&w=1200",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1200",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200"
];

let sliderIdx = 0;
let sliderTimer = null;

function initImageSlider() {
    const track = document.getElementById('imageSliderTrack');
    const dotsContainer = document.getElementById('sliderDots');
    
    // 1. 접속 시 랜덤 시작 인덱스 설정
    sliderIdx = Math.floor(Math.random() * sliderData.length);

    // 2. 이미지 HTML 생성
    track.innerHTML = sliderData.map(imgSrc => `
        <div class="min-w-full h-full relative cursor-pointer overflow-hidden" onclick="window.open('${imgSrc}', '_blank')">
            <img src="${imgSrc}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" alt="Slide Image">
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        </div>
    `).join('');

    // 3. 인디케이터(점) 생성
    dotsContainer.innerHTML = sliderData.map((_, i) => `
        <div class="w-2 h-2 rounded-full bg-white/40 transition-all duration-300"></div>
    `).join('');

    // 4. 초기 위치 설정 및 시작
    updateSliderPosition();
    startAutoSlide();
}

function updateSliderPosition() {
    const track = document.getElementById('imageSliderTrack');
    const dots = document.querySelectorAll('#sliderDots div');
    
    track.style.transform = `translateX(-${sliderIdx * 100}%)`;
    
    // 점 활성화 상태 업데이트
    dots.forEach((dot, i) => {
        if(i === sliderIdx) {
            dot.classList.add('bg-[#8a9a5b]', 'w-5');
            dot.classList.remove('bg-white/40');
        } else {
            dot.classList.remove('bg-[#8a9a5b]', 'w-5');
            dot.classList.add('bg-white/40');
        }
    });
}

function startAutoSlide() {
    if(sliderTimer) clearInterval(sliderTimer);
    sliderTimer = setInterval(() => {
        sliderIdx = (sliderIdx + 1) % sliderData.length;
        updateSliderPosition();
    }, 5000); // 5초 간격
}

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', initImageSlider);
