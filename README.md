# 이음 | 업무도우미 — 무료로 내 사이트 만들기

개발: WEAVE 팀

이 폴더를 올리면 누구나 주소로 들어와서 쓰는 이음 사이트가 돼요.
Claude 계정이 없어도 쓸 수 있고, 돈은 들지 않아요. 결제 수단을 연결하지 않으니 요금이 청구될 일도 없어요.

| 하는 일 | 쓰는 무료 서비스 |
|---|---|
| 사이트 올리기 | GitHub Pages |
| 로그인 (Google 계정) | Firebase Authentication |
| 할 일·기록·회사 자료 저장 | Cloud Firestore |
| AI (물어보기, 지시 정리, 맞춤법, 단계 만들기) | Gemini (Firebase AI Logic, 무료 등급) |

## 폴더에 들어 있는 파일

| 파일 | 하는 일 | 고칠 일 |
|---|---|---|
| `index.html` | 이음 앱 화면 | 없음 |
| `weave-firebase.js` | 앱과 Firebase·Gemini를 이어 줘요 (파일 이름은 개발팀 이름이에요) | 없음 |
| `firebase-config.js` | 내 Firebase 프로젝트 설정값 | **3단계에서 값을 붙여 넣어요** |
| `firestore.rules` | 저장소 보안 규칙 | 4단계에서 Firebase에 붙여 넣어요 |
| `manual` 폴더 | 물어보기 › 사용 설명서에 나오는 화면 그림 | 없음 (폴더째 올려요) |

준비물: Google 계정, GitHub 계정(github.com에서 무료로 만들어요). 모든 단계는 웹 브라우저에서 해요. 30분쯤 걸려요.

---

## 1단계. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 에 Google 계정으로 들어가요.
2. **프로젝트 만들기**를 눌러요. 이름은 `weave` 처럼 적어요.
3. Google 애널리틱스는 꺼도 돼요.
4. 만든 뒤에 **요금제 업그레이드(Blaze)는 누르지 않아요.** 무료(Spark) 요금제 그대로 써요.

## 2단계. 로그인 켜기

1. 왼쪽 메뉴 **빌드 → Authentication → 시작하기**.
2. **로그인 방법** 탭에서 **Google**을 골라 **사용 설정**을 켜고, 지원 이메일을 고른 뒤 저장해요.

## 3단계. 웹 앱 등록하고 설정값 붙여 넣기

1. 프로젝트 첫 화면(또는 톱니바퀴 → 프로젝트 설정)에서 **웹 아이콘 `</>`** 을 눌러요.
2. 앱 이름에 `weave` 를 적고 **앱 등록**을 눌러요. (Firebase 호스팅 체크는 하지 않아요.)
3. `const firebaseConfig = { ... }` 로 시작하는 설정값이 나와요.
4. 이 폴더의 `firebase-config.js` 를 메모장으로 열고, `firebaseConfig` 안의 값 6줄을 내 값으로 바꿔요.
   ```js
   export const firebaseConfig = {
     apiKey: "AIza…",
     authDomain: "weave-xxxx.firebaseapp.com",
     projectId: "weave-xxxx",
     storageBucket: "weave-xxxx.firebasestorage.app",
     messagingSenderId: "1234…",
     appId: "1:1234…:web:abcd…"
   };
   ```
   이 값은 사이트에 공개돼도 괜찮아요. 저장된 자료는 4단계의 보안 규칙이 지켜요.

## 4단계. 저장소(Firestore) 만들고 보안 규칙 넣기

1. 왼쪽 메뉴 **빌드 → Firestore Database → 데이터베이스 만들기**.
2. 위치는 **asia-northeast3 (서울)** 을 골라요. (나중에 바꿀 수 없어요.)
3. **프로덕션 모드**로 시작해요.
4. 만들어지면 위쪽 **규칙** 탭을 눌러요. 안에 있는 글을 모두 지우고, 이 폴더의 `firestore.rules` 내용을 통째로 붙여 넣은 뒤 **게시**를 눌러요.

## 5단계. AI(Gemini) 켜기

1. 왼쪽 메뉴에서 **AI Logic** 을 찾아 **시작하기**를 눌러요. (안 보이면 **빌드** 또는 **AI** 묶음 안에 있어요.)
2. **Gemini Developer API** 를 골라요. 이것은 결제 없이 쓰는 무료 등급이에요. (Vertex AI 쪽은 결제가 필요하니 고르지 않아요.)
3. 화면 안내대로 끝까지 눌러요. Gemini API 키는 Firebase가 알아서 관리해요. 코드에 키를 넣을 필요가 없어요.

## 6단계. GitHub Pages로 사이트 올리기

1. github.com 에 들어가 오른쪽 위 **+ → New repository**.
2. 이름에 `weave` 를 적고 **Public** 으로 둔 채 **Create repository**.
3. 새 저장소 화면에서 **uploading an existing file** (또는 **Add file → Upload files**) 을 눌러요.
4. 이 폴더의 파일 5개(`index.html`, `weave-firebase.js`, `firebase-config.js`, `firestore.rules`, `README.md`)와 `manual` 폴더를 함께 끌어다 놓고 **Commit changes**. (`manual` 폴더가 빠지면 사용 설명서 그림이 안 보여요.)
5. 저장소의 **Settings → Pages** 에서 **Branch** 를 `main`, 폴더를 `/ (root)` 로 고르고 **Save**.
6. 1~2분 뒤 위쪽에 사이트 주소가 나와요. 예: `https://내아이디.github.io/weave/`

## 7단계. 사이트 주소를 Firebase에 알려 주기

이걸 안 하면 Google 로그인이 막혀요.

1. Firebase 콘솔 → **Authentication → 설정 → 승인된 도메인 → 도메인 추가**.
2. `내아이디.github.io` 를 넣어요. (`https://` 와 `/weave/` 는 빼요.)

## 8단계. 써 보기

1. **상사**: 사이트 주소로 들어가 **Google로 로그인 → 관리자(상사)로 시작하기** 에 회사 이름을 넣고 **회사 만들기**.
2. 화면에 나오는 **회사 코드 6자리**를 직원에게 사이트 주소와 함께 알려 줘요. (코드는 설정, 관리자 화면 → 직원 탭에서도 볼 수 있어요.)
3. **직원**: 같은 주소로 들어가 Google로 로그인하고 **회사 코드**를 넣어요.
4. 상사가 관리자 화면에서 할 일·절차·지침·회의를 넣으면, 직원 화면에 바로 들어가요. 직원이 어디까지 했는지는 관리자 화면에 보여요.

로그인하지 않고 **로그인 없이 써 보기** 로도 쓸 수 있어요. 이때는 기록이 그 기기에만 남고 회사 기능은 쓸 수 없어요.

---

## 무료로 쓸 수 있는 양

| 항목 | 무료 한도 (대략) | 넘으면 |
|---|---|---|
| Gemini AI | 모델마다 하루 약 1,000번, 1분에 약 10번 안팎 | 그날은 "요청이 많아요" 라고 나와요. 다음 날 다시 돼요. |
| Firestore | 하루 읽기 5만 번, 쓰기 2만 번, 저장 1GB | 그날은 저장이 멈춰요. 다음 날 다시 돼요. |
| 로그인 | 작은 회사·팀에는 충분해요 | — |

결제 수단을 연결하지 않았으니, 한도를 넘어도 돈이 나가지 않고 그냥 멈춰요. 정확한 한도는 Google AI Studio(aistudio.google.com)의 사용량 화면에서 볼 수 있어요.

## 꼭 알아 둘 점

- **개인정보:** Gemini 무료 등급에 보낸 글은 Google이 서비스 개선에 쓸 수 있어요. 앱 안에도 안내를 넣었어요. AI에게 이름, 연락처, 주민번호, 고객 정보 같은 것은 쓰지 않도록 알려 주세요. 실제 회사 자료를 많이 다루게 되면, 결제를 연결한 유료 등급(데이터를 학습에 쓰지 않음)으로 바꾸는 것을 생각해 봐요.
- **지침 파일:** 파일 원본을 저장하는 기능(Cloud Storage)은 유료 요금제가 필요해서 뺐어요. PDF·Word·사진에서 **글자만 뽑아서** 저장해요. 원본 파일은 회사 공유 폴더에 두세요.
- **관리자:** 회사를 만든 사람 한 명이 관리자예요.
- **AI 모델 이름:** `firebase-config.js` 아래쪽 `AI_MODELS` 에 2026년 10월 기준 무료로 쓸 수 있는 Gemini Flash 모델 이름이 들어 있어요. 앞의 모델이 없어지면 다음 모델로 알아서 바꿔 써요. 셋 다 안 되면 Firebase 콘솔 → AI Logic 에서 지금 쓸 수 있는 모델 이름을 보고 바꿔 넣어요.

## 잘 안 될 때

| 보이는 것 | 할 일 |
|---|---|
| "Firebase 설정이 아직 없어요" | 3단계: `firebase-config.js` 에 값을 넣고 GitHub에 다시 올려요. |
| "이 주소에서는 로그인할 수 없어요" | 7단계: 승인된 도메인에 사이트 주소를 넣어요. |
| 로그인 창이 안 떠요 | 브라우저의 팝업 차단을 풀어요. 휴대폰은 다른 화면으로 넘어갔다가 돌아와요. |
| "회사를 만들지 못했어요" | 4단계: 보안 규칙을 붙여 넣고 **게시**했는지 봐요. |
| AI가 "연결이 잠깐 끊겼어요" 라고 해요 | 5단계: AI Logic 에서 Gemini Developer API 를 켰는지 봐요. 브라우저 개발자 도구(F12) 콘솔에 `[WEAVE]` 로 시작하는 안내가 나와요. |
| AI가 "요청이 많아요" 라고 해요 | 무료 한도에 닿았어요. 1분 뒤나 다음 날 다시 해요. |
| 고친 파일이 사이트에 안 보여요 | GitHub Pages는 반영까지 1~2분 걸려요. 새로 고침을 눌러요. |

## (선택) 더 안전하게

다른 사람이 내 Firebase 설정값으로 AI를 몰래 쓰지 못하게 하려면, Firebase 콘솔의 **App Check** 를 켜요(reCAPTCHA, 무료). 처음에는 하지 않아도 사이트는 잘 돌아가요.
